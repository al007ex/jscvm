#!/usr/bin/env node
"use strict";

// ---------------------------------------------------------------------------
// Differential fuzzer for the jscvm bytecode VM.
//
// Generates random programs drawn ONLY from the language subset the VM supports
// (arithmetic, comparisons, logical/nullish, ternary, unary, member access —
// including computed member reads and computed method calls — object/array
// literals, function calls, optional chaining, logical assignment, spread,
// destructuring declarations/assignments, pattern/default/rest parameters, and
// for…in / for…of over arrays, strings, Sets and Maps), runs each one twice —
// once natively in a Node `vm` context, once through `obfuscate()` + the VM —
// and compares the outcomes.
//
// A case passes when both runs produce the same value (compared via a canonical
// `repr`) or both throw at runtime. It fails when the values differ, or when one
// side throws and the other does not (a VM compile error on supported syntax
// counts as a failure). Because everything is driven by a seeded PRNG, a failing
// run is reproducible: `node test/fuzz.js <iterations> <seed>`.
//
//   npm run fuzz                 # default iterations + random seed
//   node test/fuzz.js 5000 42    # 5000 cases, seed 42
//
// `npm test` also runs a small fixed-seed batch so regressions are caught in CI.
// ---------------------------------------------------------------------------

const path = require("path");
const vm = require("vm");

const distIndex = path.join(__dirname, "..", "dist", "index.js");
let obfuscate;
try {
    obfuscate = require(distIndex).obfuscate;
} catch (err) {
    console.error("Could not load " + distIndex + " — run `npm run build` first.");
    console.error(String(err && err.message ? err.message : err));
    process.exit(1);
}

// --- seeded PRNG (mulberry32) --------------------------------------------
function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- program generator ----------------------------------------------------
// A constant preamble shared by every generated program. Both runs see exactly
// this environment, so any output difference is the VM's doing.
const ENV = [
    "var n1=3,n2=7,n3=-2,f1=1.5;",
    "var s1=\"ab\",s2=\"xy\";",
    "var b1=true,b2=false;",
    "var nul=null,undef=void 0;",
    "var arr=[10,20,30];",
    "var obj={x:5,y:\"hi\",z:{w:2}};",
    "var maybe=null;",
    "var fn0=function(){return 1;};",
    "var fn1=function(a){return a+1;};",
    "var add=function(a,b){return a+b;};",
    "var box={val:4,get:function(){return this.val;},add:function(a,b){return a+b+this.val;}};",
    "var keys={k:\"val\"};var getKey=\"get\";",
    "var farr=[function(){return 100;},function(){return 200;}];var idx=1;",
    "var fwd=function(){return Math.max.apply(null,arguments);};", // arguments-forwarding idiom
    "var set1=new Set([1,2,3]);var map1=new Map([[\"a\",1],[\"b\",2]]);",
    "var m1=0,m2=1,m3=2;"
].join("");

const VARS = ["n1", "n2", "n3", "f1", "s1", "s2", "b1", "b2", "nul", "undef", "arr", "obj", "maybe", "box", "keys", "m1", "m2", "m3"];
const PROPS = ["x", "y", "z", "w", "val", "length", "k", "nope"];
const ARITH = ["+", "-", "*", "/", "%", "**"];
const BITWISE = ["&", "|", "^", "<<", ">>", ">>>"];
const COMPARE = ["<", "<=", ">", ">=", "==", "!=", "===", "!=="];
const LOGICAL = ["&&", "||", "??"];
const UNARY = ["!", "-", "+", "~", "typeof ", "void "];
const ASSIGN_OPS = ["=", "+=", "-=", "*=", "%=", "&&=", "||=", "??=", "&=", "|=", "^="];

// Iterable / object sources for destructuring (all present in ENV), covering
// arrays, strings (iterable), an array of functions, and nested objects.
const ARR_SRC = ["arr", "[1,2,3]", "[n1,n2,n3]", "\"xy\"", "farr", "[]"];
const OBJ_SRC = ["obj", "{x:1,y:2}", "keys", "box", "obj.z", "{}"];

function makeGen(rng) {
    const pick = arr => arr[(rng() * arr.length) | 0];
    const chance = p => rng() < p;
    const intLit = () => String(((rng() * 11) | 0) - 5);
    const strLit = () => JSON.stringify(pick(["", "a", "ab", "hi", "xy", "z", "val"]));

    // Unique fresh binding names so multiple destructuring statements in one
    // program never collide (a redeclaration would just throw on both sides).
    let declId = 0;
    const freshVars = n => { const o = []; for (let i = 0; i < n; i++) o.push("_d" + (declId++)); return o; };

    function leaf() {
        const r = rng();
        if (r < 0.45) return pick(VARS);
        if (r < 0.65) return intLit();
        if (r < 0.75) return pick(["1.5", "2.25", "0", "-0"]);
        if (r < 0.85) return strLit();
        if (r < 0.95) return pick(["true", "false"]);
        return "null";
    }

    // A base that is usually object-ish, so member access is meaningful — but
    // occasionally arbitrary, to test null/undefined access parity.
    function base(d) {
        if (d <= 0 || chance(0.5)) return pick(["obj", "box", "arr", "keys", "obj.z", "maybe"]);
        return "(" + expr(d - 1) + ")";
    }

    function call(d) {
        switch ((rng() * 13) | 0) {
            case 0: return "fn0()";
            case 1: return "(fn1(" + expr(d - 1) + "))";
            case 2: return "(add(" + expr(d - 1) + "," + expr(d - 1) + "))";
            case 3: return "(box.get())";
            case 4: return "(box.add(" + expr(d - 1) + "," + expr(d - 1) + "))";
            case 5: return "(box[\"get\"]())";              // computed method call
            case 6: return "(box[getKey]())";               // computed method call via var
            case 7: return "(farr[" + pick(["0", "1", "idx"]) + "]())"; // arr[i]()
            case 8: return "(box.get?.())";                 // optional call
            case 9: return "(add(..." + "[" + expr(d - 1) + "," + expr(d - 1) + "]))"; // spread call
            case 10: return "(add.apply(null,[" + expr(d - 1) + "," + expr(d - 1) + "]))"; // apply
            case 11: return "(fwd(" + expr(d - 1) + "," + expr(d - 1) + "))"; // arguments forwarding
            default: return "((" + expr(d - 1) + ")())";    // usually throws (parity check)
        }
    }

    function expr(d) {
        if (d <= 0) return leaf();
        switch ((rng() * 13) | 0) {
            case 0: return "(" + expr(d - 1) + pick(ARITH) + expr(d - 1) + ")";
            case 1: return "(" + expr(d - 1) + pick(BITWISE) + expr(d - 1) + ")";
            case 2: return "(" + expr(d - 1) + pick(COMPARE) + expr(d - 1) + ")";
            case 3: return "(" + expr(d - 1) + pick(LOGICAL) + expr(d - 1) + ")";
            case 4: return "(" + expr(d - 1) + "?" + expr(d - 1) + ":" + expr(d - 1) + ")";
            case 5: return "(" + pick(UNARY) + expr(d - 1) + ")";
            case 6: return "(" + base(d) + "." + pick(PROPS) + ")";
            case 7: return "(" + base(d) + "[" + expr(d - 1) + "])";
            case 8: return "(" + base(d) + "?." + pick(PROPS) + ")";
            case 9: return "(" + base(d) + "?.[" + expr(d - 1) + "])";
            case 10: return call(d);
            case 11: return "([" + expr(d - 1) + ", ...arr])"; // array spread literal
            default: return leaf();
        }
    }

    function stmt() {
        const lhs = chance(0.25) ? pick(["box.val", "obj.x", "arr[0]"]) : pick(["m1", "m2", "m3"]);
        return lhs + pick(ASSIGN_OPS) + "(" + expr(2) + ");";
    }

    // for…in / for…of loops over fixed structures (bounded — no infinite loops).
    function loopStmt() {
        switch ((rng() * 8) | 0) {
            case 0: return "for(var _fk in obj){m1+=(\"\"+_fk);}";
            case 1: return "for(var _fx of arr){m2+=_fx;}";
            case 2: return "for(var _fc of \"ab\"){m3+=_fc;}";
            case 3: return "for(var _fs of set1){m1+=_fs;}";                        // Set iteration
            case 4: return "for(var [_mk,_mv] of map1){m2+=_mk+_mv;}";              // Map entries + destructuring
            case 5: return "for(var _fb of arr){if(_fb>15)break;m3+=_fb;}";        // for…of + break
            case 6: return "for(var _fo of arr){if(_fo===20)continue;m1+=_fo;}";   // for…of + continue
            // for…of with a destructuring binding (array / object pattern).
            default: return "for(const [_lk,_lv] of [[1,2],[3,4]]){m1+=_lk*_lv;}";
        }
    }

    // Destructuring declarations and assignments over the fixed sources, folding
    // numeric results into the accumulators (`|0` / length keep values numeric so
    // native and VM outcomes stay comparable). Covers holes, defaults, rename,
    // computed keys, array/object rest, nesting, and assignment targets.
    function destructureStmt() {
        switch ((rng() * 5) | 0) {
            case 0: { const [a, b, c] = freshVars(3);
                return "{let [" + a + ",," + b + "=" + intLit() + ",..." + c + "]=" + pick(ARR_SRC) +
                    ";m1+=((" + a + "|0)+(" + b + "|0)+" + c + ".length);}"; }
            case 1: { const [a, b] = freshVars(2);
                return "{let {x:" + a + "=" + intLit() + ",y:" + b + "}=" + pick(OBJ_SRC) +
                    ";m2+=((" + a + "|0)+(\"\"+" + b + ").length);}"; }
            case 2: { const [a] = freshVars(1); const key = pick(["\"x\"", "\"val\"", "\"k\""]);
                return "{let {[" + key + "]:" + a + "=7}=" + pick(OBJ_SRC) + ";m3+=(\"\"+" + a + ").length;}"; }
            case 3: { const [a, b] = freshVars(2);
                return "{let {z:{w:" + a + "=0}={}}=" + pick(["obj", "{z:{w:3}}", "{}"]) +
                    ";let [" + b + "=1]=arr;m1+=((" + a + "|0)+(" + b + "|0));}"; }
            default:
                return "[m2,m3]=[m3,m2];"; // assignment destructuring (swap)
        }
    }

    // Functions whose parameters use patterns / defaults / rest, invoked inline.
    function funcStmt() {
        switch ((rng() * 4) | 0) {
            case 0: { const [p, q] = freshVars(2);
                return "m1+=(function([" + p + "," + q + "=5]){return (" + p + "|0)+(" + q + "|0);})(" + pick(ARR_SRC) + ");"; }
            case 1: { const [p, q] = freshVars(2);
                return "m2+=(function({x:" + p + "=1,y:" + q + "=2}){return (" + p + "|0)+(" + q + "|0);})(" + pick(OBJ_SRC) + ");"; }
            case 2: { const [p, q] = freshVars(2);
                return "m3+=(function(" + p + ",..." + q + "){return (" + p + "|0)+" + q + ".length;})(" + pick(["1,2,3", "n1,n2", "9", ""]) + ");"; }
            default: { const [p, q] = freshVars(2);
                return "m1+=((({" + p + "=1}={}," + q + "=2)=>(" + p + "|0)+(" + q + "|0)))(" + pick(["{x:1}", "undef", "{}"]) + ");"; }
        }
    }

    function program() {
        const k = (rng() * 4) | 0;
        let body = "";
        for (let i = 0; i < k; i++) body += stmt();
        if (chance(0.3)) body += loopStmt();
        if (chance(0.5)) body += destructureStmt();
        if (chance(0.4)) body += funcStmt();
        const depth = 2 + ((rng() * 3) | 0);
        return { body: body, tail: "globalThis.r=(" + expr(depth) + ");" };
    }

    return program;
}

// --- canonical representation (runs in the harness realm for both sides) ---
function repr(v, depth) {
    depth = depth || 0;
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    const t = typeof v;
    if (t === "number") {
        if (v !== v) return "NaN";
        if (v === 0 && 1 / v === -Infinity) return "-0";
        return String(v);
    }
    if (t === "string") return JSON.stringify(v);
    if (t === "boolean") return v ? "true" : "false";
    if (t === "function") return "fn";
    if (t === "symbol") return "sym";
    if (depth > 6) return "…";
    if (Array.isArray(v)) {
        const out = [];
        for (let i = 0; i < v.length; i++) out.push(i in v ? repr(v[i], depth + 1) : "hole");
        return "[" + out.join(",") + "]";
    }
    if (t === "object") {
        const ks = Object.keys(v).sort();
        const parts = [];
        for (let i = 0; i < ks.length; i++) {
            let val;
            try { val = v[ks[i]]; } catch (e) { val = "<throw>"; }
            parts.push(JSON.stringify(ks[i]) + ":" + repr(val, depth + 1));
        }
        return "{" + parts.join(",") + "}";
    }
    return t;
}
function safeRepr(v) { try { return repr(v, 0); } catch (e) { return "<repr-error:" + (e && e.message) + ">"; } }

function makeContext() {
    const ctx = {
        Object, Function, Array, String, Number, Boolean, Math, RegExp, Reflect,
        JSON, Symbol, Date, Error, TypeError, Uint8Array, Float64Array, Buffer,
        Promise, Set, Map, module: { exports: {} }
    };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    return ctx;
}

function runNative(snippet) {
    try {
        const ctx = makeContext();
        vm.runInContext(snippet, ctx);
        return { ok: true, r: safeRepr(ctx.r) };
    } catch (e) {
        return { ok: false, err: e && e.message ? e.message : String(e) };
    }
}

async function runVm(snippet, minify) {
    let code;
    try {
        code = await obfuscate(snippet, { minify: !!minify });
    } catch (e) {
        return { ok: false, compile: true, err: e && e.message ? e.message : String(e) };
    }
    try {
        const ctx = makeContext();
        vm.runInContext(code, ctx);
        return { ok: true, r: safeRepr(ctx.r) };
    } catch (e) {
        return { ok: false, err: e && e.message ? e.message : String(e) };
    }
}

async function runFuzz(options) {
    options = options || {};
    const iterations = options.iterations || 200;
    const seed = (options.seed === undefined ? (Math.random() * 0x7fffffff) | 0 : options.seed) >>> 0;
    const quiet = !!options.quiet;
    const minify = !!options.minify;

    const rng = makeRng(seed);
    const gen = makeGen(rng);
    let passed = 0, failed = 0;
    const failures = [];

    for (let i = 0; i < iterations; i++) {
        const p = gen();
        const snippet = ENV + p.body + p.tail;
        const native = runNative(snippet);
        const viaVm = await runVm(snippet, minify);

        let mismatch = null;
        if (native.ok !== viaVm.ok) {
            mismatch = native.ok
                ? "native=" + native.r + " but VM " + (viaVm.compile ? "failed to compile" : "threw") + ": " + viaVm.err
                : "VM=" + viaVm.r + " but native threw: " + native.err;
        } else if (native.ok && native.r !== viaVm.r) {
            mismatch = "native=" + native.r + "  VM=" + viaVm.r;
        }

        if (mismatch) {
            failed++;
            const detail = "[seed " + seed + " #" + i + "] " + (p.body + p.tail) + "  =>  " + mismatch;
            failures.push(detail);
            if (!quiet) console.log("FAIL " + detail);
        } else {
            passed++;
        }
    }

    if (!quiet) {
        console.log("\nfuzz: " + passed + "/" + iterations + " passed (seed " + seed + ")" + (failed ? ("  " + failed + " FAILED") : ""));
    }
    return { passed, failed, failures, seed };
}

module.exports = { runFuzz };

if (require.main === module) {
    const iterations = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;
    const seedArg = process.argv[3] !== undefined ? (parseInt(process.argv[3], 10) >>> 0) : undefined;
    runFuzz({ iterations, seed: seedArg, quiet: false })
        .then(res => process.exit(res.failed ? 1 : 0))
        .catch(err => { console.error("fuzz crashed:", err && err.stack ? err.stack : err); process.exit(1); });
}
