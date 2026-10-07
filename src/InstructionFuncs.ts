// @ts-nocheck
import { _Op } from "./Op";

const Op = _Op;

function describeNonCallable(value: any): string {
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
        const label = value.toString();
        if (typeof label === "string" && label !== "[object Object]") {
            return label;
        }
    } catch {
        // ignore to fall through to generic object tag
    }
    return "object";
}

function ensureCallable<T extends Function>(fn: T | any): T {
    if (typeof fn === "function") {
        return fn;
    }
    throw new TypeError(`${describeNonCallable(fn)} is not a function`);
}

export let a = [];
a[Op.CreateFunction] = function(block){
    let blockid = block.readI32();
    //block.log("Binding function to: " + blockid);
    block._stack.push(block.runChild(blockid).makeFn());
}

// Like CreateFunction, but marks the child as an arrow and captures the
// enclosing `this` and `arguments` at creation time. The arrow then ignores the
// call-time `this` (makeFn) and `arguments` (GetArgs), giving lexical semantics.
a[Op.CreateArrow] = function(block){
    let blockid = block.readI32();
    let child = block.runChild(blockid);
    child.isArrow = true;
    child.lexicalThis = block.scope;
    child.lexicalArgs = block.args;
    block._stack.push(child.makeFn());
}

a[Op.Call] = function(block){
    let totalArgs = block.readI8();
    let args = [];
    let fn = ensureCallable(block._stack.pop());
    for(let i = 0 ; i < totalArgs; i++) args[ totalArgs - i - 1] = block._stack.pop();
    
    let val = __ap.call(fn, globalThis, args); //becareful — __ap is the captured native Function.prototype.apply
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
a[Op.GlobalScope] = function(block){
    block._stack.push(globalScope);
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
    let fn = ensureCallable(obj[prop]);
    let val = __ap.call(fn, obj, args);
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

// Object-literal getter/setter. Stack: [obj, key, fn]; operand: 1 for get, 0 for
// set. Uses __defineGetter__/__defineSetter__ rather than Object.defineProperty
// with a descriptor literal: those are plain method calls (safe from the
// property-mangling obfuscator, unlike the descriptor keys configurable/
// enumerable/get/set), and they merge — defining a getter keeps an existing
// setter and vice versa.
a[Op.DefineAccessor] = function(block){
    let isGetter = block.readI8();
    let fn = block._stack.pop();
    let key = block._stack.pop();
    let obj = block._stack.pop();
    if(isGetter) obj.__defineGetter__(key, fn);
    else obj.__defineSetter__(key, fn);
    block._stack.push(obj);
}

a[Op.SetObjectProperty] = function(block){

    let property = block._stack.pop();
    let obj = block._stack.pop();
    let value = block._stack.pop();
    block._stack.push(obj[property] = value);
}

// Compound assignment to a member: obj[prop] = obj[prop] OP right, evaluating obj
// and prop once. Stack: [obj, prop, right]; operand: an op id (see compoundOpId
// in ASTCodegen.ts). Leaves the assigned value on the stack.
a[Op.CompoundAssignProperty] = function(block){
    let op = block.readI8();
    let right = block._stack.pop();
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    let cur = obj[prop];
    let result;
    if(op === 0) result = cur + right;
    else if(op === 1) result = cur - right;
    else if(op === 2) result = cur * right;
    else if(op === 3) result = cur / right;
    else if(op === 4) result = cur % right;
    else if(op === 5) result = cur ** right;
    else if(op === 6) result = cur << right;
    else if(op === 7) result = cur >> right;
    else if(op === 8) result = cur >>> right;
    else if(op === 9) result = cur & right;
    else if(op === 10) result = cur | right;
    else result = cur ^ right; // 11
    block._stack.push(obj[prop] = result);
}
a[Op.AssignValue] = function(block){
    let index = block.readI32();
    let value = block._stack.pop();
    block._stack.push(block.definitions[index].value = value);
    //block.log(`ASSIGN ${typeof(value) === "string" || typeof(value) === "number" ? value : typeof(value)} -> $${index}`);
    
}

// Short-circuit && / || are driven by the surrounding jump structure in
// codegen: this op is only reached on the "evaluate the right operand" path,
// where the stack holds [leftDuplicate, right]. The result must be the right
// operand's value, so we discard the leftover left duplicate and keep the top.
a[Op.Or] = function(block){
    let r = block._stack.pop();
    block._stack.pop();
    block._stack.push(r);
    //block.log("||")
}

a[Op.And] = function(block){
    let r = block._stack.pop();
    block._stack.pop();
    block._stack.push(r);
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

a[Op.TypeOfGlobal] = function(block){
    let name = block._stack.pop();
    if(name in globalScope){
        block._stack.push(typeof globalScope[name]);
    }else{
        block._stack.push("undefined");
    }
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

a[Op.MinusMinus] = function(block){
    let varid = block.readI32();
    block._stack.push(block.definitions[varid].value--);
}

a[Op.PrePlusPlus] = function(block){
    let varid = block.readI32();
    block._stack.push(++block.definitions[varid].value);
}

a[Op.PreMinusMinus] = function(block){
    let varid = block.readI32();
    block._stack.push(--block.definitions[varid].value);
}

// Read-modify-write on obj[prop] (stack: [obj, prop]). Used for both member
// updates (obj.x++) and global updates (globalScope[name]++). `+` forces the
// numeric coercion that ++/-- perform. Postfix pushes the old value, prefix the
// new one.
a[Op.PropertyPlusPlus] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    let old = +obj[prop];
    obj[prop] = old + 1;
    block._stack.push(old);
}

a[Op.PropertyMinusMinus] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    let old = +obj[prop];
    obj[prop] = old - 1;
    block._stack.push(old);
}

a[Op.PrePropertyPlusPlus] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    let val = (+obj[prop]) + 1;
    obj[prop] = val;
    block._stack.push(val);
}

a[Op.PrePropertyMinusMinus] = function(block){
    let prop = block._stack.pop();
    let obj = block._stack.pop();
    let val = (+obj[prop]) - 1;
    obj[prop] = val;
    block._stack.push(val);
}

// Exception handling: PushHandler records a catch target (absolute ip) plus the
// stack depth to unwind to; PopHandler removes it when the try body completes
// normally. The run loop (Emulator.ts) consumes these on throw.
a[Op.PushHandler] = function(block){
    let addr = block.readI32();
    block.k.push([addr, block._stack.length, 0]);
}

a[Op.PopHandler] = function(block){
    block.k.pop();
}

// try/finally. A finally handler on `k` is tagged with 1 so the run loop knows
// to route an in-flight exception through the finalizer (see Emulator.run).
// Completion records on `block.pending` are [type, value]: 0 normal, 1 throw,
// 2 return.
a[Op.PushFinally] = function(block){
    let addr = block.readI32();
    block.k.push([addr, block._stack.length, 1]);
}

// Reached only on normal completion of the try body: drop the handler and mark
// a normal completion before falling into the finalizer.
a[Op.PopFinally] = function(block){
    block.k.pop();
    block.pending.push([0, undefined]);
}

// A return inside a try body routes here first: capture the return value as a
// pending completion and drop handlers up to and including the innermost finally
// (so its own finalizer's exceptions don't loop back into it), then jump to the
// finalizer.
a[Op.ReturnFinally] = function(block){
    let value = block._stack.pop();
    while(block.k.length){
        let h = block.k.pop();
        if(h[2] === 1) break;   // removed the innermost finally handler
    }
    block.pending.push([2, value]);
}

// End of a finalizer: act on the pending completion recorded for it.
a[Op.EndFinally] = function(block){
    let record = block.pending.pop();
    if(record[0] === 1){
        throw record[1];                       // re-raise; run loop finds the next handler
    }
    if(record[0] === 2){
        // Deferred return: run any enclosing finalizer before actually returning.
        while(block.k.length){
            let h = block.k.pop();
            if(h[2] === 1){
                block.pending.push(record);    // carry the return through it
                block.ip = h[0];
                return;
            }
        }
        block.returnRegister = record[1];      // no more finalizers: perform the return
        block.U++;
    }
    // record[0] === 0 (normal): fall through past the finalizer
}

a[Op.RaiseExponent] = function(block){
    let right = block._stack.pop();
    let left = block._stack.pop();
    block._stack.push(left ** right);
}

a[Op.GetArgs] = function(block){
    // In an arrow, `arguments` refers to the enclosing function's arguments.
    block._stack.push(block.isArrow ? block.lexicalArgs : block.args);
}

a[Op.JumpToStart] = function(block){
    block.ip = 0;
}

// Discard the top of the stack. Used by codegen to drop an intermediate value
// (e.g. the short-circuited operand of `??` / logical assignment).
a[Op.Pop] = function(block){
    block._stack.pop();
}

// Collect the keys a `for…in` would enumerate for the object on the stack, as an
// array. The emulator is itself JavaScript, so a native for-in gives the exact
// enumeration (own + inherited enumerable string keys, host order). null and
// undefined enumerate nothing. Codegen then iterates this array (see
// GenerateForInStatement).
a[Op.ForInKeys] = function(block){
    let obj = block._stack.pop();
    let keys = [];
    if(obj !== null && obj !== undefined){
        for(let k in obj) keys.push(k);
    }
    block._stack.push(keys);
}

// Spread support. The emulator is itself JS, so spreading uses host iteration
// (any iterable: arrays, strings, Set/Map, generators, ...).
a[Op.NewArray] = function(block){
    block._stack.push([]);
}

// [arr, value] -> arr with value appended.
a[Op.ArrayAppend] = function(block){
    let v = block._stack.pop();
    let arr = block._stack.pop();
    arr.push(v);
    block._stack.push(arr);
}

// [arr, iterable] -> arr with every element of the iterable appended.
// Array.from (a runtime call) handles any iterable — arrays, strings, Set/Map,
// generators. We avoid a literal `for…of` here because this handler's source is
// emitted at es5, where tsc would downlevel `for…of` to array-index iteration
// (broken for non-array iterables like Set/Map).
a[Op.ArrayAppendSpread] = function(block){
    let it = block._stack.pop();
    let arr = block._stack.pop();
    let items = Array.from(it);
    for(let i = 0; i < items.length; i++) arr.push(items[i]);
    block._stack.push(arr);
}

// [fn, thisArg, argsArray] -> fn.apply(thisArg, argsArray). Uses the captured
// native apply so a monkeypatched Function.prototype.apply can't intercept it.
a[Op.ApplyCall] = function(block){
    let args = block._stack.pop();
    let thisArg = block._stack.pop();
    let fn = ensureCallable(block._stack.pop());
    block._stack.push(__ap.call(fn, thisArg, args));
}

// [fn, argsArray] -> new fn(...argsArray).
a[Op.ConstructSpread] = function(block){
    let args = block._stack.pop();
    let fn = block._stack.pop();
    block._stack.push(construct(fn, args));
}
