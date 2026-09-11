# jscvm

takes your javascript, compiles it down to bytecode, and ships it inside a tiny VM that runs it. so your actual logic never shows up as readable JS in the output, it's just encrypted bytecode that only the bundled interpreter knows how to run.

heads up before anything else: this is obfuscation, not encryption. someone patient with devtools can still pull it apart at runtime. the whole point is just to make that really annoying.

## how it works

```
source -> lower (babel) -> parse (acorn) -> scope analysis -> bytecode
       -> encrypt + base64 -> embed in the emulator -> terser + javascript-obfuscator
```

a few things happen on every build:

- your code gets compiled to bytecode for a custom stack machine
- the whole bytecode blob (strings included) gets encrypted, and the key isn't stored anywhere. the VM rebuilds it at runtime from a hash of the payload, so if someone patches the bytecode or the handler table it just decrypts to garbage. there's no `if (tampered)` check to find and delete
- opcodes get shuffled every build, then the emulator itself gets minified and run through javascript-obfuscator on top

## install / build

```bash
npm install
npm run build
```

## cli

```bash
npm run compile -- --input path/to/source.js --out ./out
```

flags are `-i/--input`, `-o/--out`, `--no-minify` (skips the slow obfuscator pass) and `-h/--help`. you get back `<name>.bytecode.js`, plus `<name>.bytecode.min.js` unless you passed `--no-minify`.

## node api

```js
const { obfuscate } = require("@al007ex/jscvm");

const code = await obfuscate(source, { minify: true });
```

gives you back a self-contained bundle. it exposes the program's return value on `globalThis.vm` and `module.exports`.

if you want it fast, pass `minify: false`. that skips the heavy obfuscator pass but the bytecode is still encrypted.

## webpack

```js
const { JSCVMWebpackPlugin } = require("@al007ex/jscvm/webpack");

module.exports = {
  plugins: [
    new JSCVMWebpackPlugin({
      test: /\.js$/,       // which assets to hit
      minify: true,
      maxBytes: 512 * 1024,// skip anything bigger than this
      cache: true          // don't recompile stuff that didn't change
    })
  ]
};
```

it runs on the final built assets, does them in parallel, and caches by content hash so watch rebuilds aren't painful. if it hits something the VM can't compile, it leaves that asset alone and drops a build warning instead of blowing up your build.

using rollup / esbuild / vite instead? there's nothing special in the plugin, just call `require("@al007ex/jscvm").obfuscate(code)` inside whatever transform hook they give you.

## what actually works

`var` / `let` / `const`, functions, arrow functions (with proper lexical `this`/`arguments`), closures, recursion, `if` / ternary, `for` / `while` / `do…while` / `switch`, `break` / `continue`, `try`/`catch`/`finally` (including `return`/`break` through a finally), `throw`, all the operators plus `++`/`--` and every compound assignment (`+=` through `**=`, `<<=`, etc), object/array literals with computed/string/number keys, shorthand, methods, getters/setters, member access, calls, `new`, `async`/`await`, regex, template literals, `typeof`/`delete`/`void`/`in`/`instanceof`, and `arguments`.

anything it doesn't support yet just errors at compile time instead of silently doing the wrong thing. check the roadmap for what's still missing.

## when to use it, and when not

use it for hiding small bits of client-side logic you'd rather people didn't read. protocol or codec internals, license checks, anti-cheat helpers, that kind of thing.

don't use it for:

- anything that actually needs to be secure. this is obfuscation, not crypto
- storing secrets or api keys, they're always recoverable at runtime
- hot paths or tight loops, everything runs through an interpreter so it's slower than plain JS. wrap the boundaries, not your render loop
- code that uses stuff it doesn't support yet, it'll just fail to compile

## performance

most of the build time is the obfuscator pass, so `minify: false` is a lot faster when you don't need it. the webpack plugin caches, skips big files, and runs assets in parallel. runtime is slower than native since everything's interpreted, that's the tradeoff you're making.

## roadmap

**language, soon-ish**
- [x] template literals
- [x] optional chaining `?.`, nullish `??`, logical assignment `??=` / `&&=` / `||=`
- [x] spread (calls, arrays, objects); object rest (`{a, ...r}`)
- [x] rest & default params
- [x] `for…of` / `for…in`

**language, later**
- [x] destructuring (declarations, params, assignment)
- [ ] labeled statements + labeled `break`/`continue`
- [ ] tagged templates, BigInt literals
- [ ] classes / `extends` / `super`
- [ ] generators (`yield`), async generators, `for await`
- [ ] ES modules (`import`/`export`)

**obfuscation hardening**
- [x] per-build opcode shuffling
- [x] position-keyed bytecode + string encryption
- [x] checksum-as-key (tamper it and it decrypts to garbage, no branch to strip)
- [x] native ref capture + frozen dispatch table
- [ ] superinstructions / handler polymorphism
- [ ] junk/dead bytecode + opaque predicates
- [ ] branchless VM-level anti-debug
- [ ] encoded value domain (transform values on the stack)

**tooling**
- [x] cli, node api, webpack 5 plugin
- [ ] rollup / esbuild / vite adapters
- [ ] worker threads for big builds

## about the security

saying it one more time since it matters: obfuscation, not cryptography. anyone with the runtime can trace or step through the emulator if they really want to. all the per-build stuff raises the effort, it doesn't make extraction impossible. don't put long-lived secrets in here.

## layout

`src/` has the parser, scope analysis, codegen, emulator, transpile pass, cli and webpack plugin. `dist/` is the build output. `scripts/` has the cli runner and a little dev server.
