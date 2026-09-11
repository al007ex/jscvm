#!/usr/bin/env node
"use strict";

// ---------------------------------------------------------------------------
// jscvm regression suite. Zero dependencies: compiles each snippet with the
// public `obfuscate()` API, runs the resulting bundle in a fresh `vm` context,
// and asserts on the value the snippet exposes via `globalThis.r`.
//
// Run with `npm test` (the `pretest` script builds `dist/` first). Exits non-
// zero if any case fails.
//
// Coverage: the supported-language matrix, the two bugs fixed alongside this
// suite (UTF-8 string literals + sparse array literals), a smoke pass over the
// default minify+obfuscate pipeline, and the documented "unsupported syntax
// fails at compile time" contract.
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

let passed = 0;
let failed = 0;

function makeContext() {
    const ctx = {
        Object, Function, Array, String, Number, Boolean, Math, RegExp, Reflect,
        JSON, Symbol, Date, Error, TypeError, Uint8Array, Float64Array, Buffer,
        Promise, console, setTimeout, clearTimeout,
        module: { exports: {} }
    };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    return ctx;
}

function fmt(v) {
    if (typeof v === "string") return JSON.stringify(v);
    try { return String(v); } catch (_) { return Object.prototype.toString.call(v); }
}

function equal(a, b) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") return a !== a && b !== b; // NaN
    return false;
}

function record(name, cond, detail) {
    if (cond) {
        passed++;
    } else {
        failed++;
        console.log("FAIL  " + name + (detail ? "  — " + detail : ""));
    }
}

// Compile + run `src`, then assert `globalThis.r` equals `expected`.
// opts: { minify?: boolean, waitMs?: number } — waitMs lets async snippets settle.
async function expect(name, src, expected, opts) {
    opts = opts || {};
    try {
        const code = await obfuscate(src, { minify: opts.minify === true });
        const ctx = makeContext();
        vm.runInContext(code, ctx);
        if (opts.waitMs) await new Promise(function (r) { setTimeout(r, opts.waitMs); });
        record(name, equal(ctx.r, expected), equal(ctx.r, expected) ? "" : ("expected " + fmt(expected) + " got " + fmt(ctx.r)));
    } catch (e) {
        record(name, false, "threw: " + (e && e.message ? e.message : e));
    }
}

// Assert that compilation rejects (documented behaviour for unsupported syntax).
// `needle`, if given, must appear in the error message.
async function expectCompileError(name, src, needle) {
    try {
        await obfuscate(src, { minify: false });
        record(name, false, "expected a compile error, but it compiled");
    } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        record(name, !needle || msg.indexOf(needle) !== -1, needle ? ("message was: " + msg) : "");
    }
}

async function main() {
    // ---- arithmetic / operators / evaluation order ----
    await expect("arithmetic", "globalThis.r = 41 + 1;", 42);
    await expect("operator precedence", "globalThis.r = 2 + 3 * 4;", 14);
    await expect("left-to-right eval order",
        "var log=[];function s(n){log.push(n);return n;}s(1)+s(2)*s(3);globalThis.r=log.join(',');", "1,2,3");
    await expect("unary minus/negate", "globalThis.r = -5 * -3;", 15);
    await expect("float precision", "globalThis.r = 0.1 + 0.2;", 0.30000000000000004);
    await expect("i32 boundary", "globalThis.r = 2147483647 + 1;", 2147483648);
    await expect("bitwise", "globalThis.r = (5 & 3) | (8 ^ 1) | (1 << 4);", 25);
    await expect("exponent", "globalThis.r = 2 ** 10;", 1024);
    await expect("compound assign (var)", "var x=10;x+=5;x*=2;x-=1;globalThis.r=x;", 29);
    await expect("compound assign (member)", "var o={n:3};o.n*=4;o.n+=1;globalThis.r=o.n;", 13);
    await expect("prefix/postfix update", "var i=5;var a=i++;var b=++i;globalThis.r=a+'/'+b+'/'+i;", "5/7/7");

    // ---- functions / closures / recursion ----
    await expect("function + closure", "function mk(a){return function(b){return a+b;};}globalThis.r=mk(10)(5);", 15);
    await expect("recursion (fib)", "function fib(n){return n<2?n:fib(n-1)+fib(n-2);}globalThis.r=fib(10);", 55);
    await expect("hoisted function decls", "globalThis.r=f();function f(){return g();}function g(){return 3;}", 3);
    await expect("nested closure counter",
        "function mk(){var c=0;return{inc:function(){return ++c;},get:function(){return c;}};}var m=mk();m.inc();m.inc();globalThis.r=m.get();", 2);
    await expect("param/var shadow", "function f(x){var x=x+1;return x;}globalThis.r=f(5);", 6);
    await expect("arguments object", "function f(){return arguments.length;}globalThis.r=f(1,2,3);", 3);
    await expect("string concat return", "function f(){return 'hello'+' '+'world';}globalThis.r=f();", "hello world");

    // ---- control flow ----
    await expect("for loop sum", "var s=0;for(var i=0;i<=100;i++)s+=i;globalThis.r=s;", 5050);
    await expect("while + break + continue",
        "var s=0,i=0;while(true){i++;if(i>10)break;if(i%2===0)continue;s+=i;}globalThis.r=s;", 25);
    await expect("do-while", "var i=0,s=0;do{s+=i;i++;}while(i<5);globalThis.r=s;", 10);
    await expect("ternary chain", "var n=5;globalThis.r=n<0?'neg':n===0?'zero':'pos';", "pos");
    await expect("logical short-circuit",
        "var log=[];function t(v){return function(){log.push(v);return v;};}var a=t(0)()&&t(1)();var b=t(2)()||t(3)();globalThis.r=log.join(',');", "0,2");
    await expect("switch match+default", "function d(n){switch(n){case 1:return 'a';case 2:return 'b';default:return 'z';}}globalThis.r=d(2)+d(9);", "bz");
    await expect("switch fall-through", "var o='';switch(1){case 1:o+='a';case 2:o+='b';break;case 3:o+='c';}globalThis.r=o;", "ab");

    // ---- exceptions / finally ----
    await expect("try/catch", "try{throw new Error('x');}catch(e){globalThis.r=e.message;}", "x");
    await expect("try/finally + return", "function f(){try{return 1;}finally{globalThis.fin=true;}}var v=f();globalThis.r=v+'/'+globalThis.fin;", "1/true");
    await expect("throw routed through finally",
        "var log=[];function f(){try{try{throw 'e';}finally{log.push('inner');}}catch(x){log.push('caught:'+x);}}f();globalThis.r=log.join(',');", "inner,caught:e");

    // ---- objects / arrays / members ----
    await expect("object literal + method (this)", "var o={x:1,getX:function(){return this.x;}};globalThis.r=o.getX();", 1);
    await expect("object shorthand", "var x=1,y=2;var o={x,y};globalThis.r=o.x+o.y;", 3);
    await expect("getter/setter", "var o={_v:0,get v(){return this._v;},set v(x){this._v=x*2;}};o.v=5;globalThis.r=o.v;", 10);
    await expect("computed member get/set", "var o={};var k='key';o[k]=42;globalThis.r=o.key;", 42);
    await expect("array map/reduce", "globalThis.r=[1,2,3].map(function(x){return x*2;}).reduce(function(a,b){return a+b;},0);", 12);
    await expect("delete operator", "var o={a:1};delete o.a;globalThis.r='a' in o;", false);
    await expect("in operator", "globalThis.r='b' in {b:1};", true);
    await expect("new + prototype", "function P(x){this.x=x;}P.prototype.get=function(){return this.x;};globalThis.r=new P(5).get();", 5);
    await expect("instanceof", "globalThis.r=[] instanceof Array;", true);
    await expect("regex replace", "globalThis.r='a1b2'.replace(/[0-9]/g,'#');", "a#b#");

    // REGRESSION: computed method calls must evaluate the key, not bake in the
    // identifier as a literal property name (obj[k]() / arr[i]()).
    await expect("computed method call obj[k]()", "var o={hi:function(){return 42;}};var k='hi';globalThis.r=o[k]();", 42);
    await expect("computed method call arr[i]()", "var a=[function(){return 9;}];globalThis.r=a[0]();", 9);
    await expect("computed method call with args", "var o={add:function(a,b){return a+b;}};var m='add';globalThis.r=o[m](2,3);", 5);

    // ---- let / const lowering ----
    await expect("let/const block scope", "let a=1;{let a=2;globalThis.inner=a;}globalThis.r=globalThis.inner+'/'+a;", "2/1");
    await expect("let per-iteration binding",
        "var fns=[];for(let i=0;i<3;i++){fns.push(function(){return i;});}globalThis.r=fns.map(function(f){return f();}).join(',');", "0,1,2");
    await expect("var hoisting", "globalThis.r=(function(){var x=typeof y;var y=1;return x;})();", "undefined");

    // ---- arrows / template literals / typeof ----
    await expect("arrow lexical this", "var o={x:9,f:function(){var g=()=>this.x;return g();}};globalThis.r=o.f();", 9);
    await expect("arrow concise body", "var sq=x=>x*x;globalThis.r=sq(6);", 36);
    await expect("template literal", "var n='world';globalThis.r=`hi ${n} ${1+2}`;", "hi world 3");
    await expect("typeof undefined global", "globalThis.r=typeof somethingUndefined;", "undefined");
    await expect("typeof local", "var n=1;globalThis.r=typeof n;", "number");

    // ---- async / await (settles on a later tick) ----
    await expect("async/await", "async function f(){return await Promise.resolve(7);}f().then(function(v){globalThis.r=v;});", 7, { waitMs: 50 });

    // ---- optional chaining / nullish / logical assignment (lowered in Transpile) ----
    await expect("optional chaining: null base", "var o=null;globalThis.r=o?.x;", undefined);
    await expect("optional chaining: deep present", "var o={a:{b:5}};globalThis.r=o?.a?.b;", 5);
    await expect("optional chaining: short-circuit mid-chain", "var o={a:null};globalThis.r=o?.a?.b?.c;", undefined);
    await expect("optional chaining: call present", "var o={f:function(){return 7;}};globalThis.r=o.f?.();", 7);
    await expect("optional chaining: call missing", "var o={};globalThis.r=o.f?.();", undefined);
    await expect("optional chaining: preserves this", "var o={n:11,get:function(){return this.n;}};globalThis.r=o?.get();", 11);
    await expect("optional chaining: computed member", "var o={x:{y:3}};var k='x';globalThis.r=o?.[k]?.y;", 3);
    await expect("optional chaining: short-circuits side effects",
        "var hits=0;function boom(){hits++;return 0;}var o=null;o?.a[boom()];globalThis.r=hits;", 0);

    await expect("nullish: null falls through", "globalThis.r=null??'d';", "d");
    await expect("nullish: undefined falls through", "var u;globalThis.r=u??'d';", "d");
    await expect("nullish: keeps 0", "globalThis.r=0??'d';", 0);
    await expect("nullish: keeps empty string", "globalThis.r=''??'d';", "");
    await expect("nullish: with optional chaining", "var o={x:null};globalThis.r=o?.x??'fallback';", "fallback");

    await expect("logical assign: ||= replaces falsy", "var a=0;a||=5;globalThis.r=a;", 5);
    await expect("logical assign: ||= keeps truthy", "var a=3;a||=5;globalThis.r=a;", 3);
    await expect("logical assign: &&= replaces truthy", "var a=3;a&&=5;globalThis.r=a;", 5);
    await expect("logical assign: &&= keeps falsy", "var a=0;a&&=5;globalThis.r=a;", 0);
    await expect("logical assign: ??= replaces nullish", "var a=null;a??=5;globalThis.r=a;", 5);
    await expect("logical assign: ??= keeps 0", "var a=0;a??=5;globalThis.r=a;", 0);
    await expect("logical assign: ??= on member (eval once)", "var o={n:null};o.n??=8;globalThis.r=o.n;", 8);
    // native codegen specifics: short-circuit, single-eval of target, member/global/computed
    await expect("nullish: ?? short-circuits rhs", "var n=0;function s(){n++;return 1;}var x=7??s();globalThis.r=n+'/'+x;", "0/7");
    await expect("nullish: ?? keeps false", "globalThis.r=false??'d';", false);
    await expect("logical assign: ||= on member", "var o={n:0};o.n||=8;globalThis.r=o.n;", 8);
    await expect("logical assign: &&= on member", "var o={n:2};o.n&&=8;globalThis.r=o.n;", 8);
    await expect("logical assign: computed member ??=", "var o={x:null};var k='x';o[k]??=9;globalThis.r=o.x;", 9);
    await expect("logical assign: evaluates target once", "var n=0;function o(){n++;return {v:null};}o().v??=1;globalThis.r=n;", 1);
    await expect("logical assign: ??= short-circuits rhs", "var n=0;function s(){n++;return 1;}var o={v:5};o.v??=s();globalThis.r=n+'/'+o.v;", "0/5");
    await expect("logical assign: global ||=", "glob=0;glob||=7;globalThis.r=glob;", 7);

    // ---- REGRESSION: UTF-8 string literals (bug #1) ----
    await expect("unicode: latin-1 (é)", "globalThis.r='café';", "café");
    await expect("unicode: CJK", "globalThis.r='你好';", "你好");
    await expect("unicode: emoji (astral/surrogate pair)", "globalThis.r='hi 😀';", "hi 😀");
    await expect("unicode: mixed", "globalThis.r='aé你😀z';", "aé你😀z");
    await expect("unicode: string .length preserved", "globalThis.r='你好😀'.length;", 4);
    await expect("unicode: as object key (computed)", "var o={};o['你']=1;globalThis.r=Object.keys(o)[0];", "你");
    await expect("unicode: as identifier key", "var o={你:1};globalThis.r=o.你;", 1);
    await expect("unicode: in template literal", "var n='世界';globalThis.r=`你好 ${n}`;", "你好 世界");
    await expect("unicode: long multibyte (5-byte length path)",
        "var s=new Array(201).join('你');globalThis.r=s.length+'/'+ (s.charAt(100)==='你'?'ok':'bad');", "200/ok");
    await expect("ascii still round-trips", "globalThis.r='the quick brown fox';", "the quick brown fox");

    // ---- REGRESSION: sparse array literals (bug #2) ----
    await expect("sparse array: length + hole reads undefined", "var a=[1,,3];globalThis.r=a.length+'|'+String(a[1]);", "3|undefined");
    await expect("sparse array: leading hole", "var a=[,,5];globalThis.r=a.length+'|'+a[2];", "3|5");
    await expect("sparse array: trailing hole preserved", "var a=[1,2,,];globalThis.r=a.length;", 3);
    await expect("sparse array: values around holes intact", "var a=[10,,20,,30];globalThis.r=a[0]+a[2]+a[4];", 60);

    // ---- default minify + obfuscate pipeline smoke (guards the shipping path) ----
    await expect("minify: arithmetic", "globalThis.r=41+1;", 42, { minify: true });
    await expect("minify: closure", "function mk(a){return function(b){return a+b;};}globalThis.r=mk(10)(5);", 15, { minify: true });
    await expect("minify: array.map", "globalThis.r=[1,2,3].map(function(x){return x*2;}).join(',');", "2,4,6", { minify: true });
    await expect("minify: object method", "var o={x:7,f:function(){return this.x;}};globalThis.r=o.f();", 7, { minify: true });
    await expect("minify: try/catch", "try{throw new Error('boom');}catch(e){globalThis.r=e.message;}", "boom", { minify: true });
    await expect("minify: getter", "var o={_v:3,get v(){return this._v*2;}};globalThis.r=o.v;", 6, { minify: true });
    await expect("minify: unicode round-trip", "globalThis.r='你好 😀';", "你好 😀", { minify: true });

    // ---- default & rest params / destructuring / spread (lowered in Transpile) ----
    await expect("default param", "function f(a,b=5){return a+b;}globalThis.r=f(1);", 6);
    await expect("default param provided", "function f(a,b=5){return a+b;}globalThis.r=f(1,2);", 3);
    await expect("rest param", "function g(a,...rest){return a+rest.reduce(function(x,y){return x+y;},0);}globalThis.r=g(1,2,3,4);", 10);
    await expect("default + rest", "function f(a=1,...r){return a+r.length;}globalThis.r=f(undefined,9,9);", 3);
    await expect("array destructuring", "var [a,b,c]=[1,2,3];globalThis.r=a+b+c;", 6);
    await expect("array destructuring skip", "var [,b,,d]=[1,2,3,4];globalThis.r=b+d;", 6);
    await expect("array destructuring swap", "var a=1,b=2;[a,b]=[b,a];globalThis.r=a+'-'+b;", "2-1");
    await expect("object destructuring", "var {x,y}={x:2,y:3};globalThis.r=x*y;", 6);
    await expect("object destructuring rename", "var {x:p,y:q}={x:5,y:2};globalThis.r=p-q;", 3);
    await expect("nested destructuring", "var {a:{b}}={a:{b:7}};globalThis.r=b;", 7);
    await expect("destructuring default", "var {p=9}={};globalThis.r=p;", 9);
    await expect("param destructuring", "function f({x,y}){return x+y;}globalThis.r=f({x:4,y:5});", 9);
    await expect("param destructuring default", "function f({x=2}={}){return x;}globalThis.r=f();", 2);
    await expect("array spread literal", "globalThis.r=[0,...[1,2],3].join(',');", "0,1,2,3");
    await expect("spread in call", "function s(a,b,c){return a+b+c;}globalThis.r=s(...[1,2,3]);", 6);
    await expect("spread mixed with args", "function s(a,b,c,d){return a+b+c+d;}globalThis.r=s(1,...[2,3],4);", 10);
    await expect("new with spread", "function P(a,b){this.s=a+b;}globalThis.r=new P(...[4,5]).s;", 9);
    await expect("object spread", "var a={x:1};globalThis.r=({...a,y:2}).x+({...a,y:2}).y;", 3);
    await expect("object spread override", "var a={x:1,y:1};globalThis.r=({...a,y:9}).y;", 9);
    await expect("spread from string", "globalThis.r=[...'abc'].join('-');", "a-b-c");

    // ---- for…of / for…in / object rest ----
    await expect("for-of array", "var s=0;for(var x of [1,2,3])s+=x;globalThis.r=s;", 6);
    await expect("for-of string", "var s='';for(var ch of 'abc')s+=ch;globalThis.r=s;", "abc");
    await expect("for-of break/continue", "var s=0;for(var x of [1,2,3,4,5]){if(x===2)continue;if(x===5)break;s+=x;}globalThis.r=s;", 8);
    await expect("for-of Set", "var s=0;for(var x of new Set([1,2,2,3]))s+=x;globalThis.r=s;", 6);
    await expect("for-of Map entries", "var s='';for(var e of new Map([['a',1],['b',2]]))s+=e[0]+e[1];globalThis.r=s;", "a1b2");
    await expect("for-of destructuring", "var s=0;for(var [a,b] of [[1,2],[3,4]])s+=a*b;globalThis.r=s;", 14);
    await expect("for-of let per-iteration", "var f=[];for(let x of [1,2,3])f.push(function(){return x;});globalThis.r=f.map(function(g){return g();}).join(',');", "1,2,3");
    await expect("for-in object keys", "var o={a:1,b:2,c:3};var s='';for(var k in o)s+=k;globalThis.r=s;", "abc");
    await expect("for-in object values", "var o={a:1,b:2};var s=0;for(var k in o)s+=o[k];globalThis.r=s;", 3);
    await expect("for-in array indices", "var a=[10,20,30];var s='';for(var i in a)s+=i;globalThis.r=s;", "012");
    await expect("for-in inherited enumerable", "function A(){}A.prototype.inh=1;var o=new A();o.own=2;var ks=[];for(var k in o)ks.push(k);globalThis.r=ks.sort().join(',');", "inh,own");
    await expect("for-in break/continue", "var o={a:1,b:2,c:3,d:4};var s='';for(var k in o){if(k==='b')continue;if(k==='d')break;s+=k;}globalThis.r=s;", "ac");
    await expect("for-in null safe", "var s=0;for(var k in null)s++;globalThis.r=s;", 0);
    await expect("object rest basic", "var {a,...rest}={a:1,b:2,c:3};globalThis.r=a+'/'+JSON.stringify(rest);", "1/{\"b\":2,\"c\":3}");
    await expect("object rest empty", "var {a,...rest}={a:1};globalThis.r=JSON.stringify(rest);", "{}");
    await expect("object rest with rename", "var {a:x,...y}={a:1,b:2};globalThis.r=x+'/'+JSON.stringify(y);", "1/{\"b\":2}");
    await expect("param object rest", "function f({a,...rest}){return a+'/'+JSON.stringify(rest);}globalThis.r=f({a:1,b:2,c:3});", "1/{\"b\":2,\"c\":3}");

    // ---- REGRESSION: catch-parameter scoping (must shadow, not overwrite) ----
    await expect("catch param shadows outer", "var t=5;try{throw 1;}catch(t){}globalThis.r=t;", 5);
    await expect("catch param value visible", "var e=9;try{throw 42;}catch(e){globalThis.r=e;}", 42);
    await expect("nested catch shadowing", "var e=1;try{try{throw 2;}catch(e){globalThis.inner=e;}}catch(e){}globalThis.r=globalThis.inner+'/'+e;", "2/1");

    // ---- REGRESSION: bare `arguments` as a value (forwarding idioms) ----
    await expect("arguments forwarded via apply", "function add(a,b,c){return a+b+c;}function f(){return add.apply(null,arguments);}globalThis.r=f(1,2,3);", 6);
    await expect("Math.max.apply(null,arguments)", "function c(){return Math.max.apply(null,arguments);}globalThis.r=c(3,1,2);", 3);
    await expect("push.apply(o,arguments)", "function c(){var o=[];o.push.apply(o,arguments);return o.length;}globalThis.r=c(1,2,3,4);", 4);
    await expect("return arguments then index", "function c(){return arguments;}globalThis.r=c(7,8)[1];", 8);

    // ---- documented contract: still-unsupported syntax fails at compile time ----
    await expectCompileError("unsupported: labeled statement", "outer:for(var i=0;i<1;i++){break outer;}", "LabeledStatement");
    await expectCompileError("unsupported: class declaration", "class C{}", "ClassDeclaration");
    await expectCompileError("unsupported: generator", "function* g(){yield 1;}", "");

    // ---- differential fuzzing (fixed seed => deterministic here / in CI) ----
    // Generates random programs over the supported grammar and checks the VM's
    // result against native Node. `npm run fuzz` runs larger, seedable batches.
    const { runFuzz } = require("./fuzz");
    const fz = await runFuzz({ iterations: 500, seed: 0xC0FFEE, quiet: true });
    record("differential fuzz (500 cases, seed 0xC0FFEE)", fz.failed === 0,
        fz.failed === 0 ? "" : (fz.failed + " mismatch(es); first: " + fz.failures[0]));

    // ---- summary ----
    const total = passed + failed;
    console.log("\n" + passed + "/" + total + " passed" + (failed ? ("  (" + failed + " failed)") : ""));
    if (failed) process.exit(1);
}

main().catch(function (err) {
    console.error("Test runner crashed:", err && err.stack ? err.stack : err);
    process.exit(1);
});
