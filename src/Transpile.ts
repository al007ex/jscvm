// @ts-nocheck
// ---------------------------------------------------------------------------
// Source lowering pass.
//
// The bytecode VM models a function-scoped ES5 subset. This module lowers a few
// modern constructs into that subset *before* bytecode compilation, so the VM
// never has to implement them directly:
//
//   - let / const        -> function-scoped var with correct per-iteration
//                           bindings and TDZ (@babel/plugin-transform-block-scoping)
//   - async / await      -> Promise chains (babel-plugin-transform-async-to-promises)
//   - { ...a } / { a, ...r } -> Object helpers
//                           (@babel/plugin-transform-object-rest-spread)
//   - for…of              -> iterator-protocol / indexed loop
//                           (@babel/plugin-transform-for-of)
//
// Destructuring and default/rest parameters are now compiled natively (see
// ASTCodegen); the object-rest-spread pass above still strips object rest out of
// patterns before that native codegen runs.
//
// It is intentionally structured so more lowering steps can be added later: add
// a step to `transpileForVm` and, if it introduces runtime helpers, follow the
// same "inline only the helpers the program needs" pattern used for async below.
//
// The async plugin references its runtime helpers (_await, _for, _Pact, ...) via
// ES-module imports (externalHelpers mode, which is consistent regardless of how
// many async functions the file has). Since the VM has no module system, we
// resolve those imports ourselves: inline the exact helper definitions the
// program needs (transitive closure), strip the import statements, then lower the
// whole thing — helpers included — to ES5.
// ---------------------------------------------------------------------------

let _deps: {
    babel: any;
    asyncPlugin: any;
    blockScopingPlugin: any;
    objectRestSpreadPlugin: any;
    forOfPlugin: any;
    helpersSource: string;
} | null = null;

// Lazily load the Babel toolchain so importing this module never fails when the
// dev dependencies are absent; only calling transpileForVm() needs them.
function deps() {
    if (!_deps) {
        _deps = {
            babel: require("@babel/core"),
            asyncPlugin: require("babel-plugin-transform-async-to-promises"),
            blockScopingPlugin: require("@babel/plugin-transform-block-scoping"),
            objectRestSpreadPlugin: require("@babel/plugin-transform-object-rest-spread"),
            forOfPlugin: require("@babel/plugin-transform-for-of"),
            helpersSource: require("babel-plugin-transform-async-to-promises/helpers-string").code
        };
    }
    return _deps;
}

const BABEL_BASE = { babelrc: false, configFile: false, compact: false, comments: false };

// Matches: import { _a, _b as _c } from ".../transform-async-to-promises/helpers";
const HELPER_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*transform-async-to-promises\/helpers['"]\s*;?/g;

type HelperEntry = { code: string; refs: string[] };
let _helperMap: Record<string, HelperEntry> | null = null;

// Parse the plugin's helper module once into { name -> { source, helpers it uses } }.
function helperMap(): Record<string, HelperEntry> {
    if (_helperMap) return _helperMap;
    const { babel, helpersSource } = deps();
    const map: Record<string, HelperEntry> = {};
    const ast = babel.parse(helpersSource, { sourceType: "module" });
    for (const node of ast.program.body) {
        if (node.type !== "ExportNamedDeclaration" || !node.declaration) continue;
        const decl = node.declaration;
        let name: string | null = null;
        if (decl.type === "FunctionDeclaration" && decl.id) name = decl.id.name;
        else if (decl.type === "VariableDeclaration") name = decl.declarations[0].id.name;
        if (!name) continue;
        const code = helpersSource.slice(decl.start, decl.end);
        const refs = Array.from(
            new Set((code.match(/\b_[A-Za-z0-9]+\b/g) || []).filter((r: string) => r !== name))
        );
        map[name] = { code, refs };
    }
    _helperMap = map;
    return map;
}

// Source for `names` plus every helper they transitively reference, emitted in
// the helper module's original declaration order (so definitions precede use).
function collectHelpers(names: Iterable<string>): string {
    const map = helperMap();
    const needed = new Set<string>();
    // Array.from (a runtime call) rather than [...names]: this file is emitted as
    // ES5, where spreading a non-array iterable like a Set needs downlevelIteration
    // and otherwise silently yields nothing.
    const queue = Array.from(names);
    while (queue.length) {
        const name = queue.pop() as string;
        if (needed.has(name) || !map[name]) continue;
        needed.add(name);
        for (const ref of map[name].refs) if (map[ref]) queue.push(ref);
    }
    return Object.keys(map)
        .filter(name => needed.has(name))
        .map(name => map[name].code)
        .join("\n");
}

function tryTransform(code: string, plugins: any[]): string | null {
    try {
        const result = deps().babel.transformSync(code, { ...BABEL_BASE, plugins });
        return result && typeof result.code === "string" ? result.code : null;
    } catch {
        return null;
    }
}

// Babel plugin: give every catch parameter a unique name. The VM models one
// flat function scope, so a catch parameter that shares a name with an outer
// variable would alias it — writing the caught value into the outer binding
// instead of shadowing it (`var t=5; try{...}catch(t){}; t` must stay 5). Babel's
// scope-aware rename rewrites the binding and only its in-handler references.
// This also fixes helper code injected by other transforms (e.g. the spread
// plugin's `_construct`, which uses `var t` alongside `catch(t)`).
function catchParamHygienePlugin(): any {
    return {
        visitor: {
            CatchClause(path: any) {
                const param = path.node.param;
                if (param && param.type === "Identifier") {
                    path.scope.rename(param.name);
                }
            }
        }
    };
}

// Resolve the helper imports emitted by the async plugin: inline the needed
// helper definitions and drop the import statements.
function resolveAsyncHelpers(code: string): string {
    const needed = new Set<string>();
    let match: RegExpExecArray | null;
    HELPER_IMPORT_RE.lastIndex = 0;
    while ((match = HELPER_IMPORT_RE.exec(code))) {
        for (const part of match[1].split(",")) {
            const name = part.trim().split(/\s+as\s+/)[0].trim();
            if (name) needed.add(name);
        }
    }
    if (!needed.size) return code;
    return collectHelpers(needed) + "\n" + code.replace(HELPER_IMPORT_RE, "");
}

export function transpileForVm(code: string): string {
    let out = code;

    // 1. Lower the modern syntax the VM doesn't yet compile natively, before the
    //    larger async / block-scoping transforms run over the result. Each step
    //    degrades gracefully: on failure the source is left untouched and the VM
    //    reports a clear compile error on the construct it can't handle.
    //
    //    (Nullish `??`, logical assignment `&&=`/`||=`/`??=`, optional chaining
    //    `?.`, `for…in`, array/call/new spread, destructuring, and default/rest
    //    parameters are now compiled natively — see ASTCodegen.)
    //
    //    Object rest/spread (`{...a}`, `{a, ...r}`) and for…of remain lowered
    //    here. Object rest/spread runs first so it strips object rest out of every
    //    destructuring pattern (declarations, assignment targets and params alike),
    //    leaving only non-rest patterns for the native destructuring codegen. Any
    //    object/iterator helpers it emits are plain functions the VM runs;
    //    introduced temp vars are lowered by the block-scoping pass below.
    const objectAndForOfLowered = tryTransform(out, [
        deps().objectRestSpreadPlugin,
        deps().forOfPlugin
    ]);
    if (objectAndForOfLowered !== null) out = objectAndForOfLowered;

    // 2. Lower async/await to Promise chains. On failure, leave async untouched
    //    (the VM will then report a clear error on the remaining `await`), and
    //    still run block scoping below so let/const keeps working.
    const asyncLowered = tryTransform(out, [[deps().asyncPlugin, { externalHelpers: true }]]);
    if (asyncLowered !== null) {
        out = resolveAsyncHelpers(asyncLowered);
    }

    // 2b. Give catch parameters unique names so they shadow (not overwrite) any
    //     same-named outer variable in the VM's single flat scope. Runs after the
    //     helper-injecting transforms above so their catch clauses are covered too.
    const catchHygiene = tryTransform(out, [catchParamHygienePlugin()]);
    if (catchHygiene !== null) out = catchHygiene;

    // 3. Lower let/const across everything, including any const/let introduced by
    //    the transforms above (temp vars) or in the inlined async helpers.
    const blockLowered = tryTransform(out, [deps().blockScopingPlugin]);
    if (blockLowered !== null) out = blockLowered;

    return out;
}
