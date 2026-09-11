// @ts-nocheck
//import {Op, /*OpcodeString*/} from "./Op";

let globalScope = "object" == typeof globalThis ? globalThis : "object" == typeof window ? window : self;

// Normalise a few common global aliases so compiled programs don't crash when
// they expect browser globals in non-browser environments (or vice versa).
((scope: any) => {
    if (typeof scope.globalObject === "undefined") {
        scope.globalObject = scope;
    }
    if (typeof scope.window === "undefined") {
        scope.window = scope;
    }
    if (typeof scope.self === "undefined") {
        scope.self = scope;
    }
})(globalScope as any);

let construct = "object" == typeof Reflect && "function" == typeof Reflect.construct ? Reflect.construct : function(n, t) {
    var i = [null];
    Array.prototype.push.apply(i, t);
    return new(Function.prototype.bind.apply(n, i));
}

let decode = typeof(atob) === "function" ? function(base64) {
    var binary_string = atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
} : function(str){ return new Uint8Array(Buffer.from(str, "base64"))};

// ---------------------------------------------------------------------------
// Tier 1 hardening — runtime side.
//
// `__ks` / `__hash32` MUST match `ksByte` / `hash32` in src/Utils.ts exactly.
// `__ap` is a captured reference to the native Function.prototype.apply so that
// later monkeypatching of Function.prototype does not intercept VM calls.
// ---------------------------------------------------------------------------
var __ap = Function.prototype.apply;

function __ks(i, seed){
    var x = (seed ^ (i + 0x9E3779B9)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = (x ^ (x >>> 16)) | 0;
    return x & 0xff;
}

function __hash32(str){
    var h = 0x811c9dc5 | 0;
    for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
    return h | 0;
}

function describeNonCallable(value: unknown): string {
    if (value === null) {
        return "null";
    }
    if (value === undefined) {
        return "undefined";
    }
    const type = typeof value;
    if (type === "string") {
        return `"${value}"`;
    }
    if (type === "number" || type === "bigint" || type === "boolean") {
        return String(value);
    }
    if (type === "symbol") {
        return value.toString();
    }
    try {
        const label = (value as { toString(): string }).toString();
        if (typeof label === "string" && label !== "[object Object]") {
            return label;
        }
    } catch {
        // fall through
    }
    return "object";
}

function ensureCallable<T extends Function>(fn: T | unknown): T {
    if (typeof fn === "function") {
        return fn;
    }
    throw new TypeError(`${describeNonCallable(fn)} is not a function`);
}

// Expose helpers so Rollup keeps them and the generated instruction handlers can access them.
(globalScope as any).__bytecodeEnsureCallable = ensureCallable;
(globalScope as any).__bytecodeDescribeNonCallable = describeNonCallable;

function testIsGlobalPropOrFunction(n) {
    n in globalScope || function(n) {
        throw new ReferenceError(n + " is not defined")
    }(n)
}

testIsGlobalPropOrFunction.toString();
construct.toString();
// Keep-alive: __ap is only referenced by handlers injected after bundling, so
// without this Rollup would tree-shake the capture away (same idiom as above).
__ap.toString();

let __scopes = null;
let __program = null;
let __seedBase = null;

let __funcs = null;

/*let a = [];
a[Op.CreateFunction] = function(block){
    let blockid = block.readI32();
    //block.log("Binding function to: " + blockid);
    block._stack.push(block.runChild(blockid).makeFn());
}

a[Op.Call] = function(block){
    let totalArgs = block.readI8();
    let args = [];
    let fn = block._stack.pop();
    for(let i = 0 ; i < totalArgs; i++) args[ totalArgs - i - 1] = block._stack.pop();
    
    let val = fn.apply(globalThis, args); //becareful
    //block.log("Function returned: " + (typeof(val) === "function" ? "function" : val));
    block._stack.push(val);
}

a[Op.ReturnValue] = function(block){
    let value = block._stack.pop();
    //block.log("Returning: " + (typeof(value) === "function" ? "function" : value));
    block.returnRegister = value;
    block.U++;
    
};

a[Op.RegisterString] = function(block){
    block._loadString();
    
}

a[Op.AssignValueToGlobal] = function(block){
    let prop = block._stack.pop();
    let val = block._stack.pop();
    block._stack.push(block.scope[prop] = val);
    //block.log(`MOV ${typeof(val) === "string" || typeof(val) === "number" ? val : typeof(val)} -> global.${prop}`);
    
}
a[Op.GetGlobalVariableValue] = function(block){
    let prop = block._stack.pop();
    //block.log("property", prop);
    testIsGlobalPropOrFunction(prop);
    block._stack.push(globalScope[prop])
    
}
a[Op.GetArguments] = function(block){
    let index = block.readI8();
    //block.log("Loading value into arguments", block.args[index]);
    block._stack.push(block.args[index]);
    
}
a[Op.ObjectPropertyCall] = function(block){
    let totalArgs = block.readI8();
    let args = [];
    let obj = block._stack.pop();
    let prop = block._stack.pop()
    for(let i = 0; i < totalArgs; i++) args[ totalArgs - i - 1 ] = block._stack.pop();
    let fn = obj[prop];
    let val = fn.apply(obj, args);
    block._stack.push(val);
    
}
a[Op.String] = function(block){
    let str = block.readString();
    block._stack.push(str);
    
}

a[Op.Regex] = function(block){
    let str = block.readString();
    let flags = block.readString();
    block._stack.push(new RegExp(str, flags));
    
}
a[Op.GetObjectProperty] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    //block.log("#", prop, obj);
    block._stack.push(obj[prop]);
    
}
a[Op.MakeArray] = function(block){
    let elements = block.readI32();
    let arr = new Array(elements);
    for(let i = 0 ; i < elements; i++) arr[elements - i - 1 ] = block._stack.pop();
    block._stack.push(arr);
    //block.log("Create Array");
    
}
a[Op.Debugger] = function(block){
    debugger;
    
}

a[Op.Duplicate] = function(block){
    let v = block._stack.pop();
    block._stack.push(v);
    block._stack.push(v);
}

a[Op.MakeObject] = function(block){
    let props = block.readI32();
    let obj = {};
    let values = new Array(props * 2);
    for(let i = 0 ; i < props; i++){
        values[(props - i) * 2 - 1] = block._stack.pop();
        values[(props - i) * 2 - 1 - 1] = block._stack.pop();
    }
    for(let i = 0; i < props * 2; i +=2){
        obj[values[i]] = values[i + 1];
    }
    block._stack.push(obj);
    
}
a[Op.This] = function(block){
    block._stack.push(block.scope);
}

a[Op.SetObjectProperty] = function(block){
    
    let property = block._stack.pop();
    let obj = block._stack.pop();
    let value = block._stack.pop();
    block._stack.push(obj[property] = value);
}
a[Op.AssignValue] = function(block){
    let index = block.readI32();
    let value = block._stack.pop();
    block._stack.push(block.definitions[index].value = value);
    //block.log(`ASSIGN ${typeof(value) === "string" || typeof(value) === "number" ? value : typeof(value)} -> $${index}`);
    
}

a[Op.Or] = function(block){
    let r = block._stack.pop();
    let l = block._stack.pop();
    block._stack.push(r || l);
    //block.log("||")
}

a[Op.And] = function(block){
    let r = block._stack.pop();
    let l = block._stack.pop();
    block._stack.push(r && l);
    //block.log("&&")
}

a[Op.NotSymbol] = function(block){
    let val = block._stack.pop();
    block._stack.push(!val);
    //block.log("!")
}

a[Op.NegateSymbol] = function(block){
    let val = block._stack.pop();
    block._stack.push(~val);
    //block.log("~")
}

a[Op.TypeOf] = function(block){
    let val = block._stack.pop();
    block._stack.push(typeof(val));
    //block.log("typeof")
}

a[Op.GetVariableValue] = function(block){
    let index = block.readI32();
    let value = block.definitions[index].value;
    block._stack.push(value);
    //block.log(`MOV ${block.blockId}-$${index} ${typeof(value) === "string" || typeof(value) === "number" ? value : typeof(value)} -> _stack`);
    
}
a[Op.I8] = function(block){
    let num = block.readI8();
    block._stack.push(num);
    //block.log(`MOV ${num} -> _stack`);
    
}
a[Op.I32] = function(block){
    let num = block.readI32();
    block._stack.push(num);
    //block.log(`MOV ${num} -> _stack`);
}

a[Op.F64] = function(block){
    let num = block.readF64();
    block._stack.push(num);
    //block.log(`MOV ${num} -> _stack`);
}

a[Op.BOOL] = function(block){
    let bool = !!block.readI8();
    //block.log(`MOV ${bool.toString()} -> _stack`);
    block._stack.push(bool);
    
}
a[Op.Jump] = function(block){
    let dst = block.readI32();
    block.ip = dst;
    //block.log(`JMP @${dst}`);
    
}
a[Op.JumpToBlock] = function(block){
    let blockid = block.readI32();
    //block.log(`JMP to Block ->${blockid}`);
    block.runChild(blockid).makeFn().apply(block.scope);
}
a[Op.JumpIfFalse] = function(block){
    let dst = block.readI32();
    let val = block._stack.pop();
    //block.log(`[JMP] From: ${block.ip} to @${dst}`);
    if(!val) block.ip = dst;
}

a[Op.New] = function(block){
    let totalArgs = block.readI32();
    let args = new Array(totalArgs);
    for(let i = 0 ; i < totalArgs; i++) args[totalArgs - i - 1] = block._stack.pop();
    let obj = block._stack.pop();
    let instace = construct(obj, args)
    block._stack.push(instace);
    
}
a[Op.END] = function(block){
    block.returnRegister = undefined;
    block.U++;
    block.ip = -1;
    block.S = [];
    
}
a[Op.LessThan] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left < right);
    
}
a[Op.LessThanOrEqual] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left <= right);
    
}
a[Op.GreaterThan] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left > right);
    
}
a[Op.GreaterThanOrEqual] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left >= right);
    
}
a[Op.EqualTo] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left == right);
    
}
a[Op.EqualToStrict] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left === right);
    
}
a[Op.NotEqualTo] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    //block.log(`Comparing ${right} ${left}`);
    block._stack.push(left != right);
}
a[Op.NotEqualToStrict] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left !== right);
}
a[Op.Add] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left + right);
    
}
a[Op.Sub] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left - right);
    
}
a[Op.Multiply] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left * right);
}

a[Op.Divide] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left / right);
    
}
a[Op.Remainder] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left % right);
    
}
a[Op.InstanceOf] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left instanceof right);
    
}
a[Op.MinusOutFront] = function(block){
    let val = block._stack.pop();
    block._stack.push(-val);
    
}
a[Op.PlusOutFront] = function(block){
    let val = block._stack.pop();
    block._stack.push(+val);
    
}
a[Op.Void] = function(block){
    let val = block._stack.pop();
    block._stack.push(void val);
}
a[Op.Delete] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    block._stack.push(delete obj[prop]);
}
a[Op.In] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left in right);
    
}
a[Op.Throw] = function(block){
    let arg = block._stack.pop();
    throw(arg);
}
a[Op.Null] = function(block){
    block._stack.push(null);
}
a[Op.BitAnd] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left & right);
}
a[Op.BitOr] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left | right);
    
}
a[Op.BitXOR] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left ^ right);
    
}
a[Op.BitLeftShift] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left << right);
    
}

a[Op.BitRightShift] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left >> right);
    
}

a[Op.BitZeroFillRightShift] = function(block) {
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left >>> right);   
}

a[Op.PlusPlus] = function(block){
    let varid = block.readI32();
    block._stack.push(block.definitions[varid].value++);
}

a[Op.RaiseExponent] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left ** right);
}

a[Op.GetArgs] = function(block: Block){
    block._stack.push(block.args);
}

a[Op.JumpToStart] = function(block){
    block.ip = 0;
}*/

let strings = [];
// `enc` is the encrypted bytecode; individual bytes are decrypted on read via
// Block._b(). The cipher seed is never stored directly: we rebuild it from the
// integrity of the shipped payload (hash of the program blob + the shape of the
// handler table). Patch either and decryption yields noise — no check to strip.
var enc = decode(__program);
var __SEED = (__seedBase ^ (__hash32(__program) ^ Math.imul(__funcs.length, 0x01000193))) | 0;
// Memoise decrypted bytes. `enc[i] ^ __ks(i, __SEED)` is a pure function of `i`,
// so each position is decrypted at most once even when re-read (hot loops and
// repeated calls re-read the same bytecode constantly). This preserves the
// security model — the payload ships encrypted, only bytes that actually execute
// are ever decrypted, and the seed still derives from the payload so tampering
// still decrypts to garbage — while removing the per-read keystream recompute.
var __dec = new Uint8Array(enc.length);
var __seen = new Uint8Array(enc.length);
if (typeof Object !== "undefined" && typeof Object.freeze === "function") {
    Object.freeze(__funcs);
}
let __F64__ = new Float64Array(1);
let __U8__ = new Uint8Array(__F64__.buffer);

interface Bind {
    value: any,
}

class Block{
    public blockId: number;
    public definitions: Array<Bind> = [];
    public ip: number = 0;
    public startOffset: number;
    public running = false;
    public parent: Block;
    public fn;
    public args: IArguments;
    public _stack: Array<any> = [];
    public scope: any;

    public S: Array<any> = [];
    public inheretedDefinitions: Array<any> = [];
    public M: Array<any> = [];
    public returnRegister: undefined = undefined;
    public k: Array<any> = [];
    public pending: Array<any> = [];
    public U: number = 1;
    public I: Array<any> = [];

    // Arrow functions capture `this` and `arguments` lexically at creation time
    // (see the CreateArrow handler). When set, makeFn ignores the call-time
    // `this`, and GetArgs uses lexicalArgs instead of the call arguments.
    public isArrow = false;
    public lexicalThis: any = undefined;
    public lexicalArgs: any = undefined;

    constructor(blockId: number, parent: (Block | null) = null){
        
        this.blockId = blockId;
        let block = __scopes[blockId];
        let _blockId = block[0];
        let _parentBlockId = block[1];
        let _totalDefinitions = block[2];
        let varsDefinedAboveScope = block[3]; //[where the local var id will set, where the value sits in the parent]
        let _startOffset = block[4];

        this.startOffset = _startOffset;

        this.running = true;
        if(blockId !== _blockId) throw("The block does not match up");
        this.ip = _startOffset;

        for(let i = 0 ; i < _totalDefinitions; i++){
            this.definitions[i] = {value: undefined};
        }

        this.parent = parent;
        if(this.parent){
            for (let i = 0; i < varsDefinedAboveScope.length; i++) {
                let _localID = varsDefinedAboveScope[i][0]; //this is like some sort of index
                let _foreignId = varsDefinedAboveScope[i][1]; //i assume this is the index of the {vale: undefined} of each on the parent
                this.inheretedDefinitions.push([_localID, parent.definitions[_foreignId]]);
                this.definitions[_localID] = parent.definitions[_foreignId];
            }
        }
        //change this
        this.scope = globalScope;
    }

    // Decrypt a single byte at position `i` (position-keyed stream cipher),
    // memoised so each position's keystream is computed at most once.
    _b(i){
        if (__seen[i]) return __dec[i];
        var v = (enc[i] ^ __ks(i, __SEED)) & 0xff;
        __dec[i] = v;
        __seen[i] = 1;
        return v;
    }

    readF64(){
        __U8__[0] = this._b(this.ip++);
        __U8__[1] = this._b(this.ip++);
        __U8__[2] = this._b(this.ip++);
        __U8__[3] = this._b(this.ip++);
        __U8__[4] = this._b(this.ip++);
        __U8__[5] = this._b(this.ip++);
        __U8__[6] = this._b(this.ip++);
        __U8__[7] = this._b(this.ip++);
        return __F64__[0];
    }

    readString(): string{
        let idx = this.readI32();
        return strings[idx];
    }

    readI32() {
        let a = this._b(this.ip++);
        let b = this._b(this.ip++);
        let c = this._b(this.ip++);
        let d = this._b(this.ip++);
        return (a | (b << 8) | (c << 16) | (d << 24));
    }

    readI8(){
        return this._b(this.ip++);
    }

    _loadString(): void{
        let length = this.readI8();
       
        if(length === 0xff){
            length = this.readI32()
        }
        
        let end = this.ip + length;
        let str = "";
        // `length` is a UTF-8 byte count. Decode the bytes back into a string,
        // rebuilding multi-byte sequences (and surrogate pairs for astral code
        // points). Must mirror the UTF-8 encoding in Strings.getData().
        while(this.ip < end){
            let b0 = this._b(this.ip++);
            if(b0 < 0x80){
                str += String.fromCharCode(b0);
            }else if(b0 < 0xE0){
                let b1 = this._b(this.ip++) & 0x3F;
                str += String.fromCharCode(((b0 & 0x1F) << 6) | b1);
            }else if(b0 < 0xF0){
                let b1 = this._b(this.ip++) & 0x3F;
                let b2 = this._b(this.ip++) & 0x3F;
                str += String.fromCharCode(((b0 & 0x0F) << 12) | (b1 << 6) | b2);
            }else{
                let b1 = this._b(this.ip++) & 0x3F;
                let b2 = this._b(this.ip++) & 0x3F;
                let b3 = this._b(this.ip++) & 0x3F;
                let cp = (((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3) - 0x10000;
                str += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
            }
        }
        strings.push(str);
    }

    runChild(blockId){
        if(__scopes[blockId][1] !== this.blockId) throw(`${blockId} is not a child scope of ${this.blockId}`);
        return new Block(blockId, this);
    }

    log(...args){
        let space = new Array(this.blockId * 4).join(" ");
        console.log(space, ...args);
    }

    makeFn(){
        var that = this;
        return that.fn || (that.fn = function() {
            //if its the first scope that is running...
            if (that.U > 0) {

                that.U = 0;
                that.returnRegister = undefined;

                for (let i = 0; i < that.definitions.length; i++) that.definitions[i] = {
                    value: undefined
                };

                
                for (let i = 0; i < that.inheretedDefinitions.length; i++) that.definitions[that.inheretedDefinitions[i][0]] = that.inheretedDefinitions[i][1];

                //copy arguments onto the _stack first on, last off style
                that.args = arguments;
                that._stack = [];
                that.k = [];
                that.pending = [];

                for (let i = 0; i < that.args.length; i++) that._stack[that.args.length - i - 1] = that.args[i];

                that.scope = that.isArrow ? that.lexicalThis : this;
                that.ip = that.startOffset;

                return that.run();
            }

            let savedK = that.k;
            let savedPending = that.pending;
            let i = [that.definitions, that._stack, that.startOffset, that.S, that.ip, that.U, that.scope, that.args, that.returnRegister, that.I, that.M];
            
            that.definitions = [];
            that._stack = [];
            that.M = [];
            that.k = [];
            that.pending = [];
            that.S = [];
            that.U = 0;
            that.returnRegister = undefined;
            let scope = __scopes[that.blockId];

            //reset the definitions
            for (let i = 0; i < scope[2]; i++) that.definitions[i] = {
                value: undefined
            };

            for (let i = 0; i < that.inheretedDefinitions.length; i++) that.definitions[that.inheretedDefinitions[i][0]] = that.inheretedDefinitions[i][1];

            that.args = arguments;
            that._stack = []; //this seems to be a problem statement
            for (let i = 0; i < that.args.length; i++) that._stack[that.args.length - i - 1] = that.args[i];

            that.scope = that.isArrow ? that.lexicalThis : this;
            that.ip = scope[4];

            var f;
            try {
                f = that.run();
            } finally {
                // Restore the caller's frame even if run() threw, so an exception
                // propagating out through a recursive call still finds the caller's
                // handler stack (k) and other state intact.
                that.definitions = i[0];
                that._stack = i[1];
                that.k = savedK;
                that.pending = savedPending;
                that.S = i[3];
                that.ip = i[4];
                that.U = i[5];
                that.scope = i[6];
                that.args = i[7];
                that.returnRegister = i[8];
                that.I = i[9];
                that.M = i[10];
            }

            return f;
        });
      }

    run(){
        for (; this.U < 1;) {
            try{
                for (; this.U < 1;) {
                 //   this.log("[" + this.ip + "] " + OpcodeString[bytes[this.ip]], bytes[this.ip]);
                    __funcs[this._b(this.ip++)](this);
                }
            }catch(err){
                if(this.k.length){
                    // Nearest active handler: [handlerIp, stackDepthAtTry, isFinally].
                    let handler = this.k.pop();
                    this._stack.length = handler[1];       // unwind partial expression state
                    if(handler[2]){
                        // finally: run the finalizer, then EndFinally re-raises err.
                        this.pending.push([1, err]);
                    }else{
                        // catch: expose the thrown value to the catch body.
                        this._stack.push(err);
                    }
                    this.ip = handler[0];                  // resume at the handler
                }else{
                    throw err;                             // no handler here; propagate to caller
                }
            }
        }
        return this.returnRegister;
    }
}

// Freeze the interpreter surface so an attacker cannot swap out read/dispatch
// methods in place to instrument execution.
if (typeof Object !== "undefined" && typeof Object.freeze === "function") {
    Object.freeze(Block.prototype);
}

function bootstrapVm(scope = globalScope) {
    const root = new Block(0);
    return root.makeFn().apply(scope);
}

const vmResult = bootstrapVm();
const vm = typeof vmResult === "function" ? vmResult : function passthrough() { return vmResult; };

// Expose the executable result so callers can grab it (e.g., `let mathFunction = vm`).
(globalScope as any).vm = vm;
if (typeof module !== "undefined" && typeof (module as any).exports !== "undefined") {
    (module as any).exports = vm;
}

vm;

export default vm;
