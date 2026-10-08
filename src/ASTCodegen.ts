import { BlockStatement, ThrowStatement, SequenceExpression, ConditionalExpression, TryStatement, BreakStatement, ContinueStatement, SwitchStatement, LogicalExpression, NewExpression, DebuggerStatement, ArrayExpression, ThisExpression, FunctionExpression, Property, MemberExpression, ForStatement, ObjectExpression, UnaryExpression, UpdateExpression, ReturnStatement, CallExpression, FunctionDeclaration, Identifier, AssignmentExpression, VariableDeclaration, WhileStatement, BinaryExpression, Literal, Node, VariableDeclarator, IfStatement, Program, ExpressionStatement } from "estree";
import { Op } from "./Op";
import { Scope } from "./Parserv2";
import { f64Bytes, i32Bytes, i8Bytes, isValidI32, isValidI8 } from "./Utils";

export function __writeI8(scope: Scope, n: number){
    let i8 = i8Bytes(n);
    scope.data[scope.offset++] = i8;
}

export function __writeI32(scope: Scope, n: number){
    let i32 = i32Bytes(n);
    scope.data[scope.offset++] = i32[0];
    scope.data[scope.offset++] = i32[1];
    scope.data[scope.offset++] = i32[2];
    scope.data[scope.offset++] = i32[3];
}

export function __writeF64(scope: Scope, n: number){
    let f64 = f64Bytes(n);
    scope.data[scope.offset++] = f64[0];
    scope.data[scope.offset++] = f64[1];
    scope.data[scope.offset++] = f64[2];
    scope.data[scope.offset++] = f64[3];
    scope.data[scope.offset++] = f64[4];
    scope.data[scope.offset++] = f64[5];
    scope.data[scope.offset++] = f64[6];
    scope.data[scope.offset++] = f64[7];
}

export function emitMakeArray(scope: Scope, nodes: number){
    __writeI8(scope, Op.MakeArray);
    __writeI32(scope, nodes);
}

export function emitThis(scope: Scope){
    __writeI8(scope, Op.This);
}

export function emitRegex(scope: Scope, stringId : number, flagsId : number){
    __writeI8(scope, Op.Regex);
    __writeI32(scope, stringId);
    __writeI32(scope, flagsId);
}

export function emitDuplicate(scope: Scope){
    __writeI8(scope, Op.Duplicate);
}

export function emitPop(scope: Scope){
    __writeI8(scope, Op.Pop);
}

export function emitForInKeys(scope: Scope){
    __writeI8(scope, Op.ForInKeys);
}

export function emitNewArray(scope: Scope){
    __writeI8(scope, Op.NewArray);
}
export function emitArrayAppend(scope: Scope){
    __writeI8(scope, Op.ArrayAppend);
}
export function emitArrayAppendSpread(scope: Scope){
    __writeI8(scope, Op.ArrayAppendSpread);
}
export function emitApplyCall(scope: Scope){
    __writeI8(scope, Op.ApplyCall);
}
export function emitConstructSpread(scope: Scope){
    __writeI8(scope, Op.ConstructSpread);
}
export function emitGetIterator(scope: Scope){
    __writeI8(scope, Op.GetIterator);
}

// Does this element/argument list contain a spread (`...x`)?
function hasSpread(list: any[]): boolean {
    for(let i = 0; i < list.length; i++){
        if(list[i] && list[i].type === "SpreadElement") return true;
    }
    return false;
}

// Build an array on the stack from `elements`, flattening any SpreadElement by
// iterating it (host iteration = full iterator protocol). Array holes become
// `undefined` (consistent with GenerateArrayExpression's dense handling).
function emitSpreadArray(elements: any[], scope: Scope){
    emitNewArray(scope);                       // [arr]
    elements.forEach(el => {
        if(el === null){
            emitI8(scope, 0); emitVoid(scope);
            emitArrayAppend(scope);
        }else if(el.type === "SpreadElement"){
            scope.generate(el.argument);
            emitArrayAppendSpread(scope);
        }else{
            scope.generate(el);
            emitArrayAppend(scope);
        }
    });
}

export function emitInstanceOf(scope: Scope){
    __writeI8(scope, Op.InstanceOf);
}

export function emitMinusOutFront(scope: Scope){
    __writeI8(scope, Op.MinusOutFront);
}

export function emitPlusOutFront(scope: Scope){
    __writeI8(scope, Op.PlusOutFront);
}

export function emitVoid(scope: Scope){
    __writeI8(scope, Op.Void);
}

export function emitIn(scope: Scope){
    __writeI8(scope, Op.In);
}

export function emitThrow(scope: Scope){
    __writeI8(scope, Op.Throw);
}

export function emitArguments(scope: Scope){
    __writeI8(scope, Op.GetArgs);
}

export function emitDebugger(scope: Scope){
    __writeI8(scope, Op.Debugger);
}

export function emitdelete(scope: Scope){
    __writeI8(scope, Op.Delete);
}

export function emitSetObjectProperty(scope: Scope){
    __writeI8(scope, Op.SetObjectProperty);
}

export function emitGetObjectProperty(scope: Scope){
    __writeI8(scope, Op.GetObjectProperty);
}

export function emitGetGlobalVariableValue(scope: Scope){
    __writeI8(scope, Op.GetGlobalVariableValue);
}

export function emitAssignValueToGlobal(scope: Scope){
    __writeI8(scope, Op.AssignValueToGlobal);
}

export function emitGetVariableValue(scope: Scope, varid: number){
    __writeI8(scope, Op.GetVariableValue);
    __writeI32(scope, varid);
}

export function emitString(scope: Scope, stringid){
    __writeI8(scope, Op.String);
    __writeI32(scope, stringid);
}

export function emitEND(scope: Scope){
    __writeI8(scope, Op.END);
}

export function emitReturn(scope: Scope){
    __writeI8(scope, Op.ReturnValue);
}

export function emitJMP(scope: Scope){
    __writeI8(scope, Op.Jump);
}

export function emitJumpIfFalse(scope: Scope) {
    __writeI8(scope, Op.JumpIfFalse);
}

export function emitLessThan(scope: Scope){
    __writeI8(scope, Op.LessThan);
}

export function emitLessThanOrEqual(scope: Scope){
    __writeI8(scope, Op.LessThanOrEqual);
}

export function emitEqualTo(scope: Scope){
    __writeI8(scope, Op.EqualTo);
}

export function emitEqualToStrict(scope: Scope){
    __writeI8(scope, Op.EqualToStrict);
}

export function emitNotEqualTo(scope: Scope){
    __writeI8(scope, Op.NotEqualTo);
}

export function emitNotEqualToStrict(scope: Scope){
    __writeI8(scope, Op.NotEqualToStrict);
}

export function emitGreaterThan(scope: Scope){
    __writeI8(scope, Op.GreaterThan);
}

export function emitGreaterThanOrEqual(scope: Scope){
    __writeI8(scope, Op.GreaterThanOrEqual);
}

export function emitAdd(scope: Scope){
    __writeI8(scope, Op.Add);
}

export function emitSub(scope: Scope){
    __writeI8(scope, Op.Sub);
}

export function emitDivide(scope: Scope){
    __writeI8(scope, Op.Divide);
}

export function emitNotSymbol(scope: Scope){
    __writeI8(scope, Op.NotSymbol);
}

export function emitTypeOf(scope: Scope){
    __writeI8(scope, Op.TypeOf);
}

export function emitTypeOfGlobal(scope: Scope, name: string){
    const stringId = scope.getStringId(name);
    emitString(scope, stringId);
    __writeI8(scope, Op.TypeOfGlobal);
}

export function emitNegateSymbol(scope: Scope){
    __writeI8(scope, Op.NegateSymbol);
}

export function emitOr(scope: Scope){
    __writeI8(scope, Op.Or);
}

export function emitAnd(scope: Scope){
    __writeI8(scope, Op.And);
}

export function emitPlusPlus(scope: Scope, varid){
    __writeI8(scope, Op.PlusPlus);
    __writeI32(scope, varid);
}

export function emitGlobal(scope: Scope){
    __writeI8(scope, Op.GlobalScope);
}

export function emitMinusMinus(scope: Scope, varid){
    __writeI8(scope, Op.MinusMinus);
    __writeI32(scope, varid);
}

export function emitPrePlusPlus(scope: Scope, varid){
    __writeI8(scope, Op.PrePlusPlus);
    __writeI32(scope, varid);
}

export function emitPreMinusMinus(scope: Scope, varid){
    __writeI8(scope, Op.PreMinusMinus);
    __writeI32(scope, varid);
}

export function emitPushHandler(scope: Scope){
    __writeI8(scope, Op.PushHandler);
}

export function emitPopHandler(scope: Scope){
    __writeI8(scope, Op.PopHandler);
}

export function emitPushFinally(scope: Scope){
    __writeI8(scope, Op.PushFinally);
}

export function emitPopFinally(scope: Scope){
    __writeI8(scope, Op.PopFinally);
}

export function emitEndFinally(scope: Scope){
    __writeI8(scope, Op.EndFinally);
}

export function emitReturnFinally(scope: Scope){
    __writeI8(scope, Op.ReturnFinally);
}

// obj[prop] read-modify-write; used for member and global updates.
export function emitPropertyUpdate(scope: Scope, isPlus: boolean, prefix: boolean){
    if(isPlus) __writeI8(scope, prefix ? Op.PrePropertyPlusPlus : Op.PropertyPlusPlus);
    else __writeI8(scope, prefix ? Op.PrePropertyMinusMinus : Op.PropertyMinusMinus);
}

export function emitMultiply(scope: Scope){
    __writeI8(scope, Op.Multiply);
}

export function emitRemainder(scope: Scope){
    __writeI8(scope, Op.Remainder);
}

export function emitBitAnd(scope: Scope){
    __writeI8(scope, Op.BitAnd);
}

export function emitBitOr(scope: Scope){
    __writeI8(scope, Op.BitOr);
}

export function emitBitXOR(scope: Scope){
    __writeI8(scope, Op.BitXOR);
}

export function emitBitLeftShift(scope: Scope){
    __writeI8(scope, Op.BitLeftShift);
}

export function emitBitRightShift(scope: Scope){
    __writeI8(scope, Op.BitRightShift);
}

export function emitBitZeroFillRightShift(scope: Scope){
    __writeI8(scope, Op.BitZeroFillRightShift);
}

export function emitRaiseExponent(scope: Scope){
    __writeI8(scope, Op.RaiseExponent);
}

export function emitI8(scope: Scope, n: number){
    __writeI8(scope, Op.I8);
    __writeI8(scope, n);
}

export function emitNewExpression(scope: Scope, totalArgs: number){
    __writeI8(scope, Op.New);
    __writeI32(scope, totalArgs);
}

export function emitJumpToBlock(scope: Scope, n: number){
    __writeI8(scope, Op.JumpToBlock);
    __writeI32(scope, n);
}

export function emitI32(scope: Scope, n: number){
    __writeI8(scope, Op.I32);
    __writeI32(scope, n);
}

export function emitF64(scope: Scope, n: number){
    __writeI8(scope, Op.F64);
    __writeF64(scope, n);
}

export function emitAssignValue(scope: Scope, varid: number){
    __writeI8(scope, Op.AssignValue);
    __writeI32(scope, varid);
}

export function emitCreateFunction(scope: Scope, blockid: number){
    __writeI8(scope, Op.CreateFunction);
    __writeI32(scope, blockid);
}

export function emitCreateArrow(scope: Scope, blockid: number){
    __writeI8(scope, Op.CreateArrow);
    __writeI32(scope, blockid);
}

export function emitGetArguments(scope: Scope, index: number){
    __writeI8(scope, Op.GetArguments);
    __writeI8(scope, index);
}

export function emitBOOL(scope: Scope, bool: boolean){
    __writeI8(scope, Op.BOOL);
    __writeI8(scope, +bool);
}

export function emitNull(scope: Scope){
    __writeI8(scope, Op.Null);
}

export function emitMakeObject(scope: Scope, props: number){
    __writeI8(scope, Op.MakeObject);
    __writeI32(scope, props);
}

export function emitDefineAccessor(scope: Scope, isGetter: boolean){
    __writeI8(scope, Op.DefineAccessor);
    __writeI8(scope, isGetter ? 1 : 0);
}

export function emitCompoundAssignProperty(scope: Scope, opId: number){
    __writeI8(scope, Op.CompoundAssignProperty);
    __writeI8(scope, opId);
}

// Arithmetic/bitwise compound assignment operators (excludes logical &&=/||=/??=,
// which short-circuit and are not handled here). The op ids must stay in sync
// with the CompoundAssignProperty handler in InstructionFuncs.ts.
const COMPOUND_OPS: { [op: string]: number } = {
    "+=": 0, "-=": 1, "*=": 2, "/=": 3, "%=": 4, "**=": 5,
    "<<=": 6, ">>=": 7, ">>>=": 8, "&=": 9, "|=": 10, "^=": 11
};

function isCompoundAssign(operator: string): boolean {
    return Object.prototype.hasOwnProperty.call(COMPOUND_OPS, operator);
}

function compoundOpId(operator: string): number {
    if(!isCompoundAssign(operator)) throw("Unsupported compound assignment operator: " + operator);
    return COMPOUND_OPS[operator];
}

// Emit the binary op corresponding to a compound assignment (assumes the two
// operands are already on the stack, left below right).
function emitCompoundBinaryOp(scope: Scope, operator: string){
    switch(operator){
        case "+=": emitAdd(scope); break;
        case "-=": emitSub(scope); break;
        case "*=": emitMultiply(scope); break;
        case "/=": emitDivide(scope); break;
        case "%=": emitRemainder(scope); break;
        case "**=": emitRaiseExponent(scope); break;
        case "<<=": emitBitLeftShift(scope); break;
        case ">>=": emitBitRightShift(scope); break;
        case ">>>=": emitBitZeroFillRightShift(scope); break;
        case "&=": emitBitAnd(scope); break;
        case "|=": emitBitOr(scope); break;
        case "^=": emitBitXOR(scope); break;
        default: throw("Unsupported compound assignment operator: " + operator);
    }
}

export function emitObjectPropertyCall(scope: Scope, totalArgs: number){
    __writeI8(scope, Op.ObjectPropertyCall);
    __writeI8(scope, totalArgs);
}

export function emitCall(scope: Scope, totalArgs: number){
    __writeI8(scope, Op.Call);
    __writeI8(scope, totalArgs);
}

export function loadNumber(scope: Scope, num: number){
    if(isValidI8(num)) emitI8(scope, num);
    else if(isValidI32(num)) emitI32(scope, num);
    else emitF64(scope, num);
}


export function GenerateLiteral(node: Literal, scope: Scope){
    if(typeof(node.value) === "string"){
        let id = scope.getStringId(node.value);
        emitString(scope, id);
    }
    else if(typeof(node.value) === "number") loadNumber(scope, node.value);
    else if(typeof(node.value) === "boolean") emitBOOL(scope, node.value);
    else if(node.value === null) emitNull(scope);
    else if(node.value.constructor === RegExp){
        let regex = (<any>node).regex;
        let pattern = regex.pattern;
        let stringId = scope.getStringId(pattern);
        let flags = regex.flags;
        let flagsId = scope.getStringId(flags);

        emitRegex(scope, stringId, flagsId);
    }
    else throw("Unsupported literal type" + node.value);
}

// `a${x}b${y}c` compiles to cooked0 + x + cooked1 + y + cooked2, left to right,
// which matches the spec's evaluation order and (via string `+`) coerces each
// interpolated value to a string. quasis always has exactly one more element
// than expressions. No new opcodes needed.
export function GenerateTemplateLiteral(node: any, scope: Scope){
    const quasis = node.quasis;
    const expressions = node.expressions;

    emitString(scope, scope.getStringId(quasis[0].value.cooked));
    for(let i = 0; i < expressions.length; i++){
        scope.generate(expressions[i]);
        emitAdd(scope);
        emitString(scope, scope.getStringId(quasis[i + 1].value.cooked));
        emitAdd(scope);
    }
}

export function GenerateWhileStatement(node: WhileStatement, scope: Scope){

    // continue re-evaluates the test, which sits at the top of the loop.
    let continueOffset = scope.offset;
    const test_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);

    test_label.setTarget();

    scope.generate(node.test);

    emitJumpIfFalse(scope);

    let body_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    body_label.setOrigin();

    let ctx: LoopContext = { breaks: [], continues: [], continueOffset, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    scope.generate(node.body);
    loopStack.pop();

    emitJMP(scope);
    test_label.setOrigin();

    body_label.setTarget();

    // break -> after the loop; continue -> the test at the top.
    ctx.breaks.forEach(label => label.setTarget());
    ctx.continues!.forEach(label => { label.destination = continueOffset; });
}

export function GenerateDoWhileStatement(node: any, scope: Scope){
    // do { body } while(test): run the body, then test; loop back while truthy.
    let back_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    back_label.setTarget();   // body start = back-jump destination

    let ctx: LoopContext = { breaks: [], continues: [], continueOffset: 0, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    scope.generate(node.body);
    loopStack.pop();

    // continue jumps to the test (evaluated after the body each iteration).
    let continueOffset = scope.offset;
    ctx.continues!.forEach(label => { label.destination = continueOffset; });

    scope.generate(node.test);
    emitJumpIfFalse(scope);
    let exit_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    exit_label.setOrigin();   // test falsy -> fall out of the loop

    emitJMP(scope);
    back_label.setOrigin();   // test truthy -> jump back to the body

    exit_label.setTarget();
    ctx.breaks.forEach(label => label.setTarget());
}

export function GenerateThisExpression(node: ThisExpression, scope: Scope){
    emitThis(scope);
}

export function GenerateReturnStatement(node: ReturnStatement, scope: Scope){
    if(finallyStack.length > 0){
        // Inside a try/finally: capture the return value, then jump to the
        // innermost finalizer. EndFinally performs the actual return (running any
        // further enclosing finalizers on the way out).
        if(node.argument) scope.generate(node.argument);
        else { emitI8(scope, 0); emitVoid(scope); }   // push undefined
        emitReturnFinally(scope);
        emitJMP(scope);
        let return_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        return_label.setOrigin();
        finallyStack[finallyStack.length - 1].returns.push(return_label);
    }else{
        if(node.argument) scope.generate(node.argument);
        emitReturn(scope);
    }
}

export function GenerateSequenceExpression(node: SequenceExpression, scope: Scope){
    node.expressions.forEach(child => scope.generate(child));
}

// f(...args) / o.m(...args): build the argument array (flattening spreads) and
// invoke via apply, preserving `this` (the receiver for a method call, else the
// global object).
function generateSpreadCall(node: CallExpression, scope: Scope){
    let callee = node.callee as any;
    if(callee.type === "MemberExpression"){
        let tObj = scope.allocTemp();
        scope.generate(callee.object);
        emitAssignValue(scope, tObj);
        emitPop(scope);                                   // tObj = receiver

        emitGetVariableValue(scope, tObj);                // [obj]
        if(callee.property.type === "Identifier" && !callee.computed){
            emitString(scope, scope.getStringId(callee.property.name));
        }else{
            scope.generate(callee.property);
        }
        emitGetObjectProperty(scope);                     // [fn]
        emitGetVariableValue(scope, tObj);                // [fn, this]
        emitSpreadArray(node.arguments as any[], scope);  // [fn, this, argsArray]
        emitApplyCall(scope);
        scope.freeTemp(1);
    }else{
        scope.generate(callee);                           // [fn]
        emitGlobal(scope);                                // [fn, global]
        emitSpreadArray(node.arguments as any[], scope);  // [fn, global, argsArray]
        emitApplyCall(scope);
    }
}

export function GenerateCallExpression(node: CallExpression, scope: Scope){
    let callee = node.callee;
    if(hasSpread(node.arguments as any[])){
        generateSpreadCall(node, scope);
        return;
    }
    node.arguments.forEach(child => scope.generate(child));
    switch(callee.type){
        case "Identifier": {
            let id = scope.getVarId(callee.name);
            if(id === -1){
                let id = scope.getStringId(callee.name);
                emitString(scope, id);
                emitGetGlobalVariableValue(scope);
            }else{
                emitGetVariableValue(scope, id);
            }
            emitCall(scope, node.arguments.length);
            break;
        }
        case "MemberExpression": {
            if(callee.property.type === "Identifier" && !callee.computed){
                //load its property as a string
                let id = scope.getStringId(callee.property.name);
                emitString(scope, id);
            }else{
                // Computed call, e.g. obj[key]() / arr[i]() — evaluate the
                // property expression instead of treating the name as a literal.
                scope.generate(callee.property);
            }
            scope.generate(callee.object);
            emitObjectPropertyCall(scope, node.arguments.length);
            break;
        }
        default: {
            // Any other callee expression (function/arrow expression, the result
            // of another call like mk()(), a conditional, etc.): evaluate it to a
            // function value and call it with `this` = global.
            scope.generate(callee);
            emitCall(scope, node.arguments.length);
            break;
        }
    }
}

export function GenerateConditionalExpression(node: ConditionalExpression, scope: Scope){
    scope.generate(node.test);

    emitJumpIfFalse(scope);
    const test_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    test_label.setOrigin();
    
    scope.generate(node.consequent);

    emitJMP(scope);
    let consequent_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    consequent_label.setOrigin();
    
    test_label.setTarget();
    scope.generate(node.alternate);
    consequent_label.setTarget();
}

export function GenerateFunctionExpression(node: FunctionExpression, scope: Scope){
    
    if(scope.node === node){
        emitParams(node.params as any[], scope);
        scope.generate(node.body);
    }else{
        let child = scope.makeChild(node);
        GenerateByteCode(child.node, child);
        //child.generate(child.node);
        emitEND(child);
        emitCreateFunction(scope, child.id);
    }
}

export function GenerateArrowFunctionExpression(node: any, scope: Scope){
    if(scope.node === node){
        // Generating the arrow's own body. Params bind from the call arguments,
        // exactly like a regular function. `this` and `arguments` are lexical and
        // resolved by the VM (CreateArrow captures them, GetArgs/This read them),
        // so there is nothing to emit for them here.
        emitParams(node.params as any[], scope);

        if(node.body.type === "BlockStatement"){
            scope.generate(node.body);
        }else{
            // Concise body: `x => expr` means `x => { return expr; }`.
            scope.generate(node.body);
            emitReturn(scope);
        }
    }else{
        let child = scope.makeChild(node);
        GenerateByteCode(child.node, child);
        emitEND(child);
        emitCreateArrow(scope, child.id);
    }
}

export function GenerateFunctionDeclaration(node: FunctionDeclaration, scope: Scope){
    
    console.log("In theory this should never run...");
    return;

    if(scope.node === node){
        let argumentId = 0;
        node.params.forEach(child => {
            if(child.type === "Identifier"){
                //redeclare the variable under the new scope
                let varid = scope.getVarId(child.name);
                emitGetArguments(scope, argumentId);
                emitAssignValue(scope, varid);
                argumentId++;

            }else{
                throw("Unknown paramater type");
                scope.generate(child)
            }
        });

        scope.generate(node.body);
    }else{
        let id = scope.getVarId(node.id.name);

        let child = scope.makeChild(node);
        GenerateByteCode(child.node, child);
        emitEND(child);
    
        emitCreateFunction(scope, child.id);
        emitAssignValue(scope, id);
    }
}

export function GenerateDebuggerStatement(node: DebuggerStatement, scope: Scope){
    emitDebugger(scope);
}

export function GenerateNewExpression(node: NewExpression, scope: Scope){
    if(hasSpread(node.arguments as any[])){
        // new F(...args): build the argument array and construct with it.
        scope.generate(node.callee);                      // [fn]
        emitSpreadArray(node.arguments as any[], scope);  // [fn, argsArray]
        emitConstructSpread(scope);
        return;
    }
    scope.generate(node.callee);
    node.arguments.forEach(child => scope.generate(child));
    emitNewExpression(scope, node.arguments.length);
}

export function GenerateIdentifier(node: Identifier, scope: Scope){

    if(node.name === "arguments"){
        // A bare `arguments` reference (not a member access) must still yield the
        // arguments object — e.g. `fn.apply(this, arguments)`, `return arguments`.
        // GetArgs handles regular vs arrow (lexical) functions, matching how
        // member access on `arguments` is emitted elsewhere.
        emitArguments(scope);
        return;
    }

    let id = scope.getVarId(node.name);

    if(id === -1){ //its a global property...
        let id = scope.getStringId(node.name);
        emitString(scope, id);
        emitGetGlobalVariableValue(scope);
    }else{
        emitGetVariableValue(scope, id);
    }
}

export function GenerateLogicalExpression(node: LogicalExpression, scope: Scope){
    switch(node.operator){
        case "||": {
            scope.generate(node.left);
            emitDuplicate(scope);
            emitJumpIfFalse(scope);
            let falseLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            falseLbl.setOrigin();

            emitJMP(scope);
            let skipLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            skipLbl.setOrigin();

            falseLbl.setTarget();
            scope.generate(node.right);
            emitOr(scope);
            skipLbl.setTarget();
            break;
        }
        case "&&": {
            scope.generate(node.left);
            emitDuplicate(scope);
            emitJumpIfFalse(scope);
            let falseLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            falseLbl.setOrigin();

            scope.generate(node.right);
            emitAnd(scope);

            falseLbl.setTarget();
            break;
        }
        case "??": {
            // a ?? b : keep a unless it is null/undefined, then evaluate b.
            // `a == null` is true for exactly null and undefined (loose equality).
            scope.generate(node.left);
            emitDuplicate(scope);
            emitNull(scope);
            emitEqualTo(scope);                 // [a, (a == null)]
            emitJumpIfFalse(scope);             // not nullish -> jump to keep, leaving [a]
            let keepLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            keepLbl.setOrigin();
            emitPop(scope);                     // nullish: drop a and use b
            scope.generate(node.right);
            keepLbl.setTarget();
            break;
        }
        default:
            throw("Unknown logical expression");
    }
}

// Stack of enclosing loops/switches, innermost last. `breaks` collects jumps
// that should land after the construct; `continues` collects jumps to the loop's
// continue point (null for switch, which is breakable but not continuable).
// `finallyDepth` records finallyStack.length at entry so break/continue know
// which finalizers they jump out through.
type LoopContext = { breaks: any[]; continues: any[] | null; continueOffset: number; finallyDepth: number };
const loopStack: LoopContext[] = [];

// Active try/finally blocks, innermost last. A `return`/`break`/`continue` that
// leaves one must run its finalizer first. `returns` collects the jumps a routed
// return makes to the finalizer entry so they can be back-patched.
type FinallyContext = { returns: any[]; finalizer: any };
const finallyStack: FinallyContext[] = [];

// Clear leftover control-flow context so the module can be reused across
// multiple compilations in one process.
export function resetCodegenState(){
    loopStack.length = 0;
    finallyStack.length = 0;
}

// break/continue/return cannot cross a function boundary, so isolate the stacks
// when generating a nested function body and restore them afterwards.
function saveControlFlowStacks(){
    let saved = { loops: loopStack.slice(), finallys: finallyStack.slice() };
    loopStack.length = 0;
    finallyStack.length = 0;
    return saved;
}
function restoreControlFlowStacks(saved: { loops: any[]; finallys: any[] }){
    loopStack.length = 0;
    finallyStack.length = 0;
    for(const c of saved.loops) loopStack.push(c);
    for(const c of saved.finallys) finallyStack.push(c);
}

// Run and remove every finally handler from the innermost down to `targetDepth`,
// emitting each finalizer inline before the enclosing jump (break/continue).
function unwindFinalliesTo(scope: Scope, targetDepth: number){
    let removed: FinallyContext[] = [];
    while(finallyStack.length > targetDepth) removed.push(finallyStack.pop()!);
    for(const fin of removed){          // innermost first
        emitPopHandler(scope);          // drop this finally's handler from k
        scope.generate(fin.finalizer);  // run the finalizer inline
    }
    // Restore for code that follows the break/continue in source order.
    for(let i = removed.length - 1; i >= 0; i--) finallyStack.push(removed[i]);
}

export function GenerateBreakStatement(node: BreakStatement, scope: Scope){
    if(loopStack.length === 0) throw("break statement outside of a loop or switch");
    let ctx = loopStack[loopStack.length - 1];
    unwindFinalliesTo(scope, ctx.finallyDepth);
    emitJMP(scope);
    let break_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    break_label.setOrigin();
    ctx.breaks.push(break_label);
}

export function GenerateContinueStatement(node: ContinueStatement, scope: Scope){
    // continue targets the nearest enclosing loop, skipping any switch in between.
    let ctx: LoopContext | null = null;
    for(let i = loopStack.length - 1; i >= 0; i--){
        if(loopStack[i].continues){ ctx = loopStack[i]; break; }
    }
    if(!ctx) throw("continue statement outside of a loop");
    unwindFinalliesTo(scope, ctx.finallyDepth);
    emitJMP(scope);
    let continue_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    continue_label.setOrigin();
    ctx.continues.push(continue_label);
}

function generateTryCatch(node: TryStatement, scope: Scope){
    let handler = node.handler;
    if(handler){
        // Register a catch handler for the duration of the try block. On a throw
        // the VM unwinds to it and pushes the thrown value onto the stack.
        emitPushHandler(scope);
        let catch_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        catch_label.setOrigin();

        scope.generate(node.block);
        emitPopHandler(scope);

        emitJMP(scope);
        let after_catch = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        after_catch.setOrigin();

        catch_label.setTarget();
        // The thrown value is on top of the stack; bind it to the catch param.
        if(handler.param && handler.param.type === "Identifier"){
            let varid = scope.getVarId(handler.param.name);
            emitAssignValue(scope, varid);
        }
        scope.generate(handler.body);

        after_catch.setTarget();
    }else{
        scope.generate(node.block);
    }
}

export function GenerateTryStatement(node: TryStatement, scope: Scope){
    if(node.finalizer){
        // A finally handler covers the whole try/catch region. The finalizer runs
        // on: normal completion (PopFinally), a thrown exception (the VM routes
        // through the handler on k), and a return (routed via ReturnFinally).
        emitPushFinally(scope);
        let finally_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        finally_label.setOrigin();

        let ctx: FinallyContext = { returns: [], finalizer: node.finalizer };
        finallyStack.push(ctx);
        generateTryCatch(node, scope);
        finallyStack.pop();

        // Normal completion: drop the handler + mark a normal completion, then
        // fall through into the finalizer.
        emitPopFinally(scope);

        finally_label.setTarget();
        ctx.returns.forEach(l => { l.destination = finally_label.destination; });

        scope.generate(node.finalizer);
        emitEndFinally(scope);
    }else{
        generateTryCatch(node, scope);
    }
}

export function GenerateSwitchStatement(node: SwitchStatement, scope: Scope){
    //return
    
    let labels = [];
    let cases = node.cases;
    for(let i = 0; i < cases.length; i++){
        var _case = cases[i];
        if(_case.test){
            scope.generate(node.discriminant);
            scope.generate(_case.test)
            emitNotEqualToStrict(scope);
            emitJumpIfFalse(scope);
            let label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            label.setOrigin();
            labels.push(label);
        }else{
            emitJMP(scope);
            let defaultCaseJump = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            defaultCaseJump.setOrigin();
            labels.push(defaultCaseJump);
        }
    }

    let jump_missed_cases = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    emitJMP(scope);
    jump_missed_cases.setOrigin();

    // A switch is breakable but not continuable (continues: null), so a continue
    // inside a switch resolves to the enclosing loop.
    let ctx: LoopContext = { breaks: [], continues: null, continueOffset: 0, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    for(let i = 0; i < cases.length; i++){
        labels[i].setTarget();
        var _case = cases[i];
        _case.consequent.forEach(child => scope.generate(child));
    }
    loopStack.pop();

    jump_missed_cases.setTarget();
    ctx.breaks.forEach(label => label.setTarget());
}

export function GenerateAssignmentExpression(node: AssignmentExpression, scope: Scope){
    let left = node.left;
    if(node.operator === "="){
        if(left.type === "ArrayPattern" || left.type === "ObjectPattern"){
            // Destructuring assignment. The expression's value is the right-hand
            // side, so duplicate it: one copy is consumed by the binding, the
            // other is left on the stack as the result.
            scope.generate(node.right);         // [rhs]
            emitDuplicate(scope);               // [rhs, rhs]
            emitDestructure(left, scope, false); // consumes one copy, leaves [rhs]
            return;
        }
        scope.generate(node.right);
        switch(left.type){
            case "Identifier":
                let id = scope.getVarId(left.name);
                if(id === -1){
                    let stringid = scope.getStringId(left.name);
                    emitString(scope, stringid);
                    emitAssignValueToGlobal(scope);
                }else{
                    emitAssignValue(scope, id);
                }
                break;
            case "MemberExpression": {

                
                scope.generate(left.object);
                let property = left.property;
                //if its computed, dont run that shit
                if(property.type === "Identifier" && !left.computed){
                    let stringid = scope.getStringId(property.name);
                    emitString(scope, stringid);
                }else{
                    scope.generate(left.property);
                }
                emitSetObjectProperty(scope);
                break;
            }
            default:
                throw("Invalid assignment expression type");
        }
    }else if(isCompoundAssign(node.operator)){
        // x OP= right  ==>  x = x OP right, reading x once.
        switch(left.type){
            case "Identifier": {
                let id = scope.getVarId(left.name);
                if(id === -1){
                    let stringid = scope.getStringId(left.name);
                    emitString(scope, stringid);
                    emitGetGlobalVariableValue(scope);   // push old value
                    scope.generate(node.right);          // push right
                    emitCompoundBinaryOp(scope, node.operator);
                    emitString(scope, stringid);
                    emitAssignValueToGlobal(scope);
                }else{
                    emitGetVariableValue(scope, id);     // push old value
                    scope.generate(node.right);          // push right
                    emitCompoundBinaryOp(scope, node.operator);
                    emitAssignValue(scope, id);
                }
                break;
            }
            case "MemberExpression": {
                // Evaluate obj and prop once, then read-modify-write in the VM.
                scope.generate(left.object);
                let property = left.property;
                if(property.type === "Identifier" && !left.computed){
                    emitString(scope, scope.getStringId(property.name));
                }else{
                    scope.generate(left.property);
                }
                scope.generate(node.right);
                emitCompoundAssignProperty(scope, compoundOpId(node.operator));
                break;
            }
            default:
                throw("Invalid assignment expression type");
        }
    }else if((node.operator as string) === "&&=" || (node.operator as string) === "||=" || (node.operator as string) === "??="){
        generateLogicalAssign(node, scope);
    }else{
        throw("Unsupported assignment operator: " + node.operator);
    }
}

// Logical assignment (`&&=`, `||=`, `??=`). Short-circuits: the right-hand side
// is evaluated (and the store performed) only when the operator says so, and the
// target reference (object / computed key for a member target) is evaluated
// exactly once. The result is the target's final value.
//
// Shape, for a duplicated current value `cur`:
//   <load cur>; Duplicate; <skip-test>; JumpIfFalse end;
//   Pop; <right>; <store>; end:
// where <skip-test> leaves a boolean whose FALSE means "keep cur, skip assign".
function generateLogicalAssign(node: AssignmentExpression, scope: Scope){
    const op = node.operator as string;
    const left = node.left;

    function emitSkipTest(){
        if(op === "||="){
            emitNotSymbol(scope);       // keep when cur is truthy  (!cur === false)
        }else if(op === "??="){
            emitNull(scope);
            emitEqualTo(scope);         // keep when cur is NOT nullish (cur == null -> false)
        }
        // "&&=": no extra test — JumpIfFalse already keeps cur when it is falsy.
    }

    if(left.type === "Identifier"){
        let id = scope.getVarId(left.name);
        let strId = id === -1 ? scope.getStringId(left.name) : -1;

        if(id === -1){ emitString(scope, strId); emitGetGlobalVariableValue(scope); }
        else { emitGetVariableValue(scope, id); }

        emitDuplicate(scope);
        emitSkipTest();
        emitJumpIfFalse(scope);
        let endLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        endLbl.setOrigin();

        emitPop(scope);
        scope.generate(node.right);
        if(id === -1){ emitString(scope, strId); emitAssignValueToGlobal(scope); }
        else { emitAssignValue(scope, id); }

        endLbl.setTarget();
        return;
    }

    if(left.type === "MemberExpression"){
        // Evaluate the object (and a computed key) once, into scratch temps.
        let tObj = scope.allocTemp();
        scope.generate(left.object);
        emitAssignValue(scope, tObj);
        emitPop(scope);

        const staticKey = left.property.type === "Identifier" && !left.computed;
        let tProp = -1;
        let propStrId = -1;
        if(staticKey){
            propStrId = scope.getStringId((left.property as Identifier).name);
        }else{
            tProp = scope.allocTemp();
            scope.generate(left.property);
            emitAssignValue(scope, tProp);
            emitPop(scope);
        }
        const pushProp = () => staticKey ? emitString(scope, propStrId) : emitGetVariableValue(scope, tProp);

        // load cur = obj[prop]
        emitGetVariableValue(scope, tObj);
        pushProp();
        emitGetObjectProperty(scope);

        emitDuplicate(scope);
        emitSkipTest();
        emitJumpIfFalse(scope);
        let endLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        endLbl.setOrigin();

        // assign path: obj[prop] = right  (SetObjectProperty wants [value, obj, prop])
        emitPop(scope);
        scope.generate(node.right);
        emitGetVariableValue(scope, tObj);
        pushProp();
        emitSetObjectProperty(scope);

        endLbl.setTarget();
        scope.freeTemp(staticKey ? 1 : 2);
        return;
    }

    throw("Invalid logical-assignment target: " + left.type);
}

// ---------------------------------------------------------------------------
// Destructuring (array / object patterns) and parameter binding.
//
// Compiled natively rather than lowered by Babel. The pipeline still runs
// @babel/plugin-transform-object-rest-spread ahead of codegen, which strips
// object rest (`{a, ...r}`) out of every pattern — in declarations, assignment
// targets and parameters alike — leaving only non-rest object patterns here. So
// the patterns reaching codegen are: ArrayPattern (holes, defaults, a trailing
// array rest), ObjectPattern (renames, computed keys, defaults) and
// AssignmentPattern (defaults), nested arbitrarily.
//
// Array patterns bind through a fresh array built from the source with the
// spread append (`Array.from` semantics), so any finite iterable — arrays,
// strings, Sets, Maps, generators, arguments — destructures correctly.
// ---------------------------------------------------------------------------

// Collect every identifier name bound by `pattern` (used by the scope pre-pass to
// reserve slots). MemberExpression targets in assignment destructuring bind no
// new name and are ignored.
export function collectPatternNames(pattern: any, out: string[]){
    if(!pattern) return;
    switch(pattern.type){
        case "Identifier": out.push(pattern.name); break;
        case "AssignmentPattern": collectPatternNames(pattern.left, out); break;
        case "RestElement": collectPatternNames(pattern.argument, out); break;
        case "ArrayPattern":
            pattern.elements.forEach((el: any) => collectPatternNames(el, out));
            break;
        case "ObjectPattern":
            pattern.properties.forEach((p: any) => {
                if(p.type === "RestElement") collectPatternNames(p.argument, out);
                else collectPatternNames(p.value, out);
            });
            break;
    }
}

// Push `undefined` (`void 0`).
function emitUndefined(scope: Scope){
    emitI8(scope, 0);
    emitVoid(scope);
}

// Store the value on top of the stack into a simple target — an Identifier (local
// or global) or, in assignment destructuring, a MemberExpression — consuming it.
// The store opcodes leave the stored value behind, so a Pop rebalances the stack.
function emitStoreLeaf(target: any, scope: Scope, declare: boolean){
    if(target.type === "Identifier"){
        let id = scope.getVarId(target.name);
        if(id === -1){
            // Undeclared name -> global. (declare=true names are always registered
            // as locals by the pre-pass, so -1 only happens for assignment targets.)
            emitString(scope, scope.getStringId(target.name));
            emitAssignValueToGlobal(scope);
        }else{
            emitAssignValue(scope, id);
        }
    }else if(target.type === "MemberExpression"){
        // SetObjectProperty wants [value, obj, key]; the value is already on the
        // stack from the caller, so push obj then key on top of it.
        scope.generate(target.object);
        if(!target.computed && target.property.type === "Identifier"){
            emitString(scope, scope.getStringId(target.property.name));
        }else{
            scope.generate(target.property);
        }
        emitSetObjectProperty(scope);
    }else{
        throw("Invalid destructuring assignment target: " + target.type);
    }
    emitPop(scope); // drop the value the store opcode pushed back
}

// Bind `target` to the value on top of the stack, consuming it (net effect:
// removes that one value). `declare` selects local binding (let/const/var/param)
// vs assignment-to-existing-target semantics for leaf identifiers.
function emitDestructure(target: any, scope: Scope, declare: boolean){
    switch(target.type){
        case "Identifier":
        case "MemberExpression":
            emitStoreLeaf(target, scope, declare);
            return;
        case "AssignmentPattern":
            emitDefaulted(target, scope, declare);
            return;
        case "ArrayPattern":
            emitArrayPattern(target, scope, declare);
            return;
        case "ObjectPattern":
            emitObjectPattern(target, scope, declare);
            return;
        default:
            throw("Unsupported destructuring target: " + target.type);
    }
}

// `target = default`: if the value on top of the stack is `undefined`, replace it
// with the default expression; then bind the inner pattern.
function emitDefaulted(node: any, scope: Scope, declare: boolean){
    // stack: [v]
    emitDuplicate(scope);                 // [v, v]
    emitUndefined(scope);                 // [v, v, undefined]
    emitEqualToStrict(scope);             // [v, v === undefined]
    emitJumpIfFalse(scope);               // defined -> skip default, keep [v]
    let defined = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    defined.setOrigin();
    emitPop(scope);                       // v is undefined: drop it
    scope.generate(node.right);           // [default]
    defined.setTarget();                  // [valueToBind]
    emitDestructure(node.left, scope, declare);
}

// Convert the iterable on top of the stack into a fresh array (`Array.from` via
// the spread append) and store it in slot `tArr`, consuming the source.
function emitIterableToTemp(scope: Scope, tArr: number){
    let tSrc = scope.allocTemp();
    emitAssignValue(scope, tSrc); emitPop(scope);   // stash source, []
    emitNewArray(scope);                            // [arr]
    emitGetVariableValue(scope, tSrc);              // [arr, src]
    emitArrayAppendSpread(scope);                   // [Array.from(src)]
    emitAssignValue(scope, tArr); emitPop(scope);   // store in tArr, []
    scope.freeTemp(1);                              // release tSrc
}

// `[a, , b, ...rest]`: materialise the source as an array, then bind each element
// by index (skipping holes) and the trailing rest via slice.
function emitArrayPattern(node: any, scope: Scope, declare: boolean){
    let tArr = scope.allocTemp();
    emitIterableToTemp(scope, tArr);
    let elements = node.elements;
    for(let i = 0; i < elements.length; i++){
        let el = elements[i];
        if(el === null) continue;                        // hole
        if(el.type === "RestElement"){
            // rest = arr.slice(i); ObjectPropertyCall wants [args..., key, obj].
            loadNumber(scope, i);                            // [i]
            emitString(scope, scope.getStringId("slice"));   // [i, "slice"]
            emitGetVariableValue(scope, tArr);               // [i, "slice", arr]
            emitObjectPropertyCall(scope, 1);                // [rest]
            emitDestructure(el.argument, scope, declare);
            break;                                           // rest is always last
        }
        emitGetVariableValue(scope, tArr);          // [arr]
        loadNumber(scope, i);                        // [arr, i]
        emitGetObjectProperty(scope);               // [arr[i]]
        emitDestructure(el, scope, declare);
    }
    scope.freeTemp(1);                              // release tArr
}

// `{a, b: c, [k]: d, e = 1}`: read each property off the source and bind it.
// Object rest is removed upstream, so none reaches here.
function emitObjectPattern(node: any, scope: Scope, declare: boolean){
    let tSrc = scope.allocTemp();
    emitAssignValue(scope, tSrc); emitPop(scope);   // stash source, []
    node.properties.forEach((prop: any) => {
        if(prop.type === "RestElement"){
            throw("object rest in a pattern should be lowered before codegen");
        }
        emitGetVariableValue(scope, tSrc);          // [src]
        if(!prop.computed && prop.key.type === "Identifier"){
            emitString(scope, scope.getStringId(prop.key.name));  // [src, "key"]
        }else{
            scope.generate(prop.key);               // [src, keyVal] (computed / literal key)
        }
        emitGetObjectProperty(scope);               // [src[key]]
        emitDestructure(prop.value, scope, declare);
    });
    scope.freeTemp(1);                              // release tSrc
}

// Bind one parameter at position `index` from the call arguments into `scope`.
// Handles plain identifiers, defaults, destructuring patterns and a trailing rest.
function emitParam(param: any, scope: Scope, index: number){
    if(param.type === "RestElement"){
        // ...rest: the remaining arguments as a fresh array. Build an array from
        // `arguments` (spread), stash it, then slice(index).
        let tArgs = scope.allocTemp();
        emitNewArray(scope);                            // [arr]
        emitArguments(scope);                           // [arr, arguments]
        emitArrayAppendSpread(scope);                   // [Array.from(arguments)]
        emitAssignValue(scope, tArgs); emitPop(scope);  // stash, []
        loadNumber(scope, index);                        // [index]
        emitString(scope, scope.getStringId("slice"));   // [index, "slice"]
        emitGetVariableValue(scope, tArgs);              // [index, "slice", argsArr]
        emitObjectPropertyCall(scope, 1);                // [rest]
        scope.freeTemp(1);                              // release tArgs
        emitDestructure(param.argument, scope, true);
        return;
    }
    emitGetArguments(scope, index);   // [arguments[index]]
    emitDestructure(param, scope, true);
}

// Bind a function/arrow parameter list into `scope` from the call arguments.
export function emitParams(params: any[], scope: Scope){
    for(let i = 0; i < params.length; i++){
        emitParam(params[i], scope, i);
    }
}

export function GenerateVariableDeclarator(node: VariableDeclarator, scope: Scope){
    // `var x;` with no initializer must leave the binding at its current value
    // (undefined on first entry) — NOT assign whatever happens to be on the stack.
    // Emitting AssignValue here would pop a leftover value, e.g. `var i = -1, x;`
    // would wrongly set x to -1.
    if(!node.init) return;
    scope.generate(node.init);
    switch(node.id.type){
        case "Identifier": {
            let id = scope.getVarId(node.id.name);
            emitAssignValue(scope, id);
            break;
        }
        case "ArrayPattern":
        case "ObjectPattern":
            // Destructuring declaration: bind the pattern from the initializer,
            // which is on the stack. (A destructuring declarator always has an
            // initializer — `let [a];` is a SyntaxError — so node.init is present.)
            emitDestructure(node.id, scope, true);
            break;
        default:
            throw("Unknown init varaible");
    }
}

// Optional chaining: `a?.b`, `a?.()`, `a?.[e]`, and any non-optional links after
// them. Acorn wraps the whole chain in one ChainExpression; the links inside are
// ordinary Member/Call nodes carrying an `optional` flag. The entire chain
// short-circuits to `undefined` the moment an optional link's receiver is
// null/undefined. We generate the happy path inline and collect every optional
// link's "receiver was nullish" jump into `guards`, which all land on a single
// cleanup that replaces the receiver on the stack with `undefined`.
//
// Invariant: each guard fires when exactly one value (the receiver just tested)
// is the live top of stack, so the cleanup's single Pop is always correct.

// If the value on top of the stack is null/undefined, jump to the chain cleanup;
// otherwise leave it in place and continue. (`v != null` is false only for null
// and undefined.)
function emitOptionalGuard(scope: Scope, guards: any[]){
    emitDuplicate(scope);
    emitNull(scope);
    emitNotEqualTo(scope);        // [v, v != null]
    emitJumpIfFalse(scope);       // nullish -> jump to cleanup, leaving [v]
    let g = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    g.setOrigin();
    guards.push(g);
}

// Push a member's property key: computed keys evaluate the expression, static
// keys use the name literally.
function emitChainPropertyKey(node: any, scope: Scope){
    if(node.computed) scope.generate(node.property);
    else emitString(scope, scope.getStringId(node.property.name));
}

// Generate one node of a chain, leaving its value on the stack.
function genOptionalChainValue(node: any, scope: Scope, guards: any[]){
    if(node.type === "MemberExpression"){
        genOptionalChainValue(node.object, scope, guards);   // [obj]
        if(node.optional) emitOptionalGuard(scope, guards);  // short-circuit if obj nullish
        emitChainPropertyKey(node, scope);                   // [obj, key]
        emitGetObjectProperty(scope);                        // [obj[key]]
        return;
    }

    if(node.type === "CallExpression"){
        let callee = node.callee;
        if(callee.type === "MemberExpression"){
            // Method call: the receiver is evaluated once (temp), the function
            // obj[key] read once (so a getter runs once), then invoked via
            // fn.apply(receiver, args). This uniformly covers optional members,
            // optional calls, and spread arguments.
            genOptionalChainValue(callee.object, scope, guards);  // [objVal]
            if(callee.optional) emitOptionalGuard(scope, guards);
            let tObj = scope.allocTemp();
            emitAssignValue(scope, tObj);
            emitPop(scope);                                   // tObj = objVal

            emitGetVariableValue(scope, tObj);
            emitChainPropertyKey(callee, scope);
            emitGetObjectProperty(scope);                     // [fn]
            if(node.optional) emitOptionalGuard(scope, guards);
            let tFn = scope.allocTemp();
            emitAssignValue(scope, tFn);
            emitPop(scope);                                   // tFn = fn

            emitGetVariableValue(scope, tFn);                 // [fn]
            emitGetVariableValue(scope, tObj);                // [fn, this]
            emitSpreadArray(node.arguments as any[], scope);  // [fn, this, argsArray]
            emitApplyCall(scope);
            scope.freeTemp(2);                                // tFn, tObj
            return;
        }

        // Plain call (callee is not a member): `this` is the global object.
        genOptionalChainValue(callee, scope, guards);         // [fnVal]
        if(node.optional) emitOptionalGuard(scope, guards);
        let tFn = scope.allocTemp();
        emitAssignValue(scope, tFn);
        emitPop(scope);                                       // tFn = fnVal
        emitGetVariableValue(scope, tFn);                     // [fn]
        emitGlobal(scope);                                    // [fn, global]
        emitSpreadArray(node.arguments as any[], scope);      // [fn, global, argsArray]
        emitApplyCall(scope);
        scope.freeTemp(1);
        return;
    }

    // Chain root (any other expression): generate normally.
    scope.generate(node);
}

export function GenerateChainExpression(node: any, scope: Scope){
    let guards: any[] = [];
    genOptionalChainValue(node.expression, scope, guards);    // [value]

    emitJMP(scope);
    let endLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    endLbl.setOrigin();

    // Cleanup: an optional link short-circuited. The nullish receiver is the lone
    // value on the stack — drop it and yield undefined.
    let cleanupOffset = scope.offset;
    guards.forEach(g => { g.destination = cleanupOffset; });
    emitPop(scope);
    emitI8(scope, 0);
    emitVoid(scope);                                          // undefined

    endLbl.setTarget();
}

export function GenerateMemberExpression(node: MemberExpression, scope: Scope){
    let object = node.object;
    
    switch(object.type){
        case "Identifier":
            //added this check to make sure arguments isnt over ridden
            if(object.name === "arguments"){
                emitArguments(scope);
            }else{
                let id = scope.getVarId(object.name);
                if(id === -1){
                    let id = scope.getStringId(object.name);
                    emitString(scope, id);
                    emitGetGlobalVariableValue(scope);
                }else{
                    emitGetVariableValue(scope, id);
                }   
            }
            break;
        default:
            scope.generate(object);
    }

    let property = node.property;

    switch(property.type){
        
        case "Identifier": {
            if(!node.computed){
                let id = scope.getStringId(property.name);
                emitString(scope, id);
                break;
            }
        }
        default:
            scope.generate(node.property);
    }

    emitGetObjectProperty(scope);
}

// Push a property key onto the stack. Computed keys ({ [expr]: v }) evaluate the
// expression; identifier keys ({ x: v }) use the name literally; literal keys
// ({ "a": v }, { 1: v }) use the literal value.
function emitPropertyKey(node: Property, scope: Scope){
    if((node as any).computed){
        scope.generate(node.key as any);
    }else if(node.key.type === "Identifier"){
        emitString(scope, scope.getStringId(node.key.name));
    }else if(node.key.type === "Literal"){
        scope.generate(node.key as any);
    }else{
        throw("Unsupported property key @emitPropertyKey: " + node.key.type);
    }
}

export function GenerateProperty(node: Property, scope: Scope){
    emitPropertyKey(node, scope);
    scope.generate(node.value);
}

export function GenerateArrayExpression(node: ArrayExpression, scope: Scope){
    if(hasSpread(node.elements as any[])){
        // [a, ...b, c] — build incrementally, flattening spreads.
        emitSpreadArray(node.elements as any[], scope);
        return;
    }
    node.elements.forEach(child => {
        if(child === null){
            // Array elision, e.g. [1, , 3]. The stack machine builds a dense
            // array, so materialise the hole as `undefined`: arr[i] reads and
            // .length then match a real hole (only hole-detection via `in` /
            // sparse iteration differs, which obfuscated code rarely relies on).
            emitI8(scope, 0);
            emitVoid(scope);
        }else{
            scope.generate(child);
        }
    });
    emitMakeArray(scope, node.elements.length);
}

export function GenerateObjectExpression(node: ObjectExpression, scope: Scope){
    // Data properties are collected into the object up front; accessor properties
    // (get/set) are applied afterwards via DefineAccessor.
    let dataProps: any[] = [];
    let accessors: any[] = [];
    node.properties.forEach((child: any) => {
        if(child.type !== "Property") throw("Unsupported object member: " + child.type);
        if(child.kind === "get" || child.kind === "set") accessors.push(child);
        else dataProps.push(child);
    });

    dataProps.forEach(child => scope.generate(child));
    emitMakeObject(scope, dataProps.length);

    // The object stays on the stack; each accessor consumes [obj, key, fn] and
    // leaves the object back on top for the next one.
    accessors.forEach(acc => {
        emitPropertyKey(acc, scope);
        scope.generate(acc.value);
        emitDefineAccessor(scope, acc.kind === "get");
    });
}

export function GenerateForStatement(node: ForStatement, scope: Scope){
    if(node.init) scope.generate(node.init);
    let pre_test_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    pre_test_label.setTarget();

    // A missing test means an unconditional loop (for(;;)); only emit the exit
    // branch when there is a real condition to evaluate.
    let skip_body_label = null;
    if(node.test){
        scope.generate(node.test);
        emitJumpIfFalse(scope);
        skip_body_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
        skip_body_label.setOrigin();
    }

    let ctx: LoopContext = { breaks: [], continues: [], continueOffset: 0, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    if(node.body) scope.generate(node.body);
    loopStack.pop();

    // continue jumps to the update expression (or straight to the back-edge if
    // there is no update).
    let continueOffset = scope.offset;
    ctx.continues!.forEach(label => { label.destination = continueOffset; });

    if(node.update) scope.generate(node.update);

    emitJMP(scope);
    pre_test_label.setOrigin();
    if(skip_body_label) skip_body_label.setTarget();

    ctx.breaks.forEach(label => label.setTarget());
}

// for (LEFT in RIGHT) BODY — native. Snapshot RIGHT's enumerable keys into a
// scratch array (ForInKeys), then iterate it by index, assigning each key to
// LEFT. Mirrors the for-loop's label/continue structure (continue -> increment,
// break -> exit).
export function GenerateForInStatement(node: any, scope: Scope){
    let tKeys = scope.allocTemp();
    let tIdx = scope.allocTemp();

    // tKeys = ForInKeys(RIGHT)
    scope.generate(node.right);
    emitForInKeys(scope);
    emitAssignValue(scope, tKeys);
    emitPop(scope);

    // tIdx = 0
    emitI8(scope, 0);
    emitAssignValue(scope, tIdx);
    emitPop(scope);

    // top:  if (tIdx < tKeys.length) continue into the body, else exit
    let top = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    top.setTarget();
    emitGetVariableValue(scope, tIdx);
    emitGetVariableValue(scope, tKeys);
    emitString(scope, scope.getStringId("length"));
    emitGetObjectProperty(scope);
    emitLessThan(scope);
    emitJumpIfFalse(scope);
    let exit = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    exit.setOrigin();

    // LEFT = tKeys[tIdx]
    emitGetVariableValue(scope, tKeys);
    emitGetVariableValue(scope, tIdx);
    emitGetObjectProperty(scope);
    emitForInAssign(node.left, scope);

    let ctx: LoopContext = { breaks: [], continues: [], continueOffset: 0, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    scope.generate(node.body);
    loopStack.pop();

    // continue -> increment
    let continueOffset = scope.offset;
    ctx.continues!.forEach(label => { label.destination = continueOffset; });

    emitPrePlusPlus(scope, tIdx);   // tIdx++
    emitPop(scope);

    emitJMP(scope);
    top.setOrigin();

    exit.setTarget();
    ctx.breaks.forEach(label => label.setTarget());

    scope.freeTemp(2);
}

// Assign the value on top of the stack to a for-in LEFT target, leaving the
// stack clean. LEFT is `var x` / `let x` / a bare identifier (local or global),
// or a member expression (`obj.p` / `obj[k]`).
function emitForInAssign(left: any, scope: Scope){
    let target = left.type === "VariableDeclaration" ? left.declarations[0].id : left;
    if(target.type === "Identifier"){
        let id = scope.getVarId(target.name);
        if(id === -1){
            emitString(scope, scope.getStringId(target.name));
            emitAssignValueToGlobal(scope);
        }else{
            emitAssignValue(scope, id);
        }
        emitPop(scope);
    }else if(target.type === "MemberExpression"){
        scope.generate(target.object);
        let property = target.property;
        if(property.type === "Identifier" && !target.computed){
            emitString(scope, scope.getStringId(property.name));
        }else{
            scope.generate(property);
        }
        emitSetObjectProperty(scope);
        emitPop(scope);
    }else{
        throw("Unsupported for-in target: " + target.type);
    }
}

// `for (LEFT of RIGHT) BODY`, compiled with the iterator protocol:
//
//   let it = RIGHT[Symbol.iterator](), step;
//   while(!(step = it.next()).done){ LEFT = step.value; BODY }
//
// GetIterator resolves the well-known symbol in the handler, and next/done/value
// are ordinary property/method ops, so any iterable works (arrays, strings,
// Set/Map, generators, arguments). break/continue reuse the standard loop
// machinery. Object rest in LEFT is lowered to a body declaration by the
// object-rest-spread pass, so LEFT here is only a plain target or a non-rest
// array/object pattern.
//
// Note: on an early exit (break / return / throw) the iterator's optional
// `return()` is not invoked — a narrow divergence that affects only iterators
// doing cleanup in a `return` method (e.g. a generator with `try/finally`);
// value iteration, including over never-ending generators, is exact.
export function GenerateForOfStatement(node: any, scope: Scope){
    let tIter = scope.allocTemp();
    let tStep = scope.allocTemp();

    // it = RIGHT[Symbol.iterator]()
    scope.generate(node.right);
    emitGetIterator(scope);
    emitAssignValue(scope, tIter);
    emitPop(scope);

    // top:  step = it.next()
    let top = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    top.setTarget();
    emitString(scope, scope.getStringId("next"));
    emitGetVariableValue(scope, tIter);
    emitObjectPropertyCall(scope, 0);   // it.next() with this = it
    emitAssignValue(scope, tStep);
    emitPop(scope);

    // if (step.done) exit
    emitGetVariableValue(scope, tStep);
    emitString(scope, scope.getStringId("done"));
    emitGetObjectProperty(scope);
    emitNotSymbol(scope);               // loop while !done
    emitJumpIfFalse(scope);
    let exit = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    exit.setOrigin();

    // LEFT = step.value
    emitGetVariableValue(scope, tStep);
    emitString(scope, scope.getStringId("value"));
    emitGetObjectProperty(scope);
    if(node.left.type === "VariableDeclaration"){
        emitDestructure(node.left.declarations[0].id, scope, true);
    }else{
        emitDestructure(node.left, scope, false);
    }

    let ctx: LoopContext = { breaks: [], continues: [], continueOffset: 0, finallyDepth: finallyStack.length };
    loopStack.push(ctx);
    scope.generate(node.body);
    loopStack.pop();

    // continue -> back to the top (re-evaluate it.next())
    let continueOffset = scope.offset;
    ctx.continues!.forEach(label => { label.destination = continueOffset; });

    emitJMP(scope);
    top.setOrigin();

    exit.setTarget();
    ctx.breaks.forEach(label => label.setTarget());

    scope.freeTemp(2);
}

export function GenerateVariableDeclaration(node: VariableDeclaration, scope: Scope){
    node.declarations.forEach(child => scope.generate(child));
}

export function GenerateUnaryExpression(node: UnaryExpression, scope: Scope){
    if(node.operator === "delete"){
        let memExp = node.argument as any;
        if(memExp.type === "ChainExpression"){
            // delete a?.b[.c…] — generate the final member's object with the chain's
            // short-circuit, then delete the key. A short-circuit (nullish receiver)
            // makes `delete` yield true, matching `delete undefined`.
            let inner = memExp.expression;
            if(inner.type !== "MemberExpression") throw("can only delete a member expression");
            let guards: any[] = [];
            genOptionalChainValue(inner.object, scope, guards);
            if(inner.optional) emitOptionalGuard(scope, guards);
            emitChainPropertyKey(inner, scope);
            emitdelete(scope);
            emitJMP(scope);
            let endLbl = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
            endLbl.setOrigin();
            let cleanup = scope.offset;
            guards.forEach(g => { g.destination = cleanup; });
            emitPop(scope);
            emitBOOL(scope, true);
            endLbl.setTarget();
        }else if(memExp.type === "MemberExpression"){
            scope.generate(memExp.object);
            let property = memExp.property;
            if(property.type === "Identifier" && !memExp.computed){
                // delete obj.a -> the key is the literal "a", not a variable
                // reference (mirrors GenerateMemberExpression's computed check).
                emitString(scope, scope.getStringId(property.name));
            }else{
                scope.generate(property);
            }
            emitdelete(scope);
        }else{
            throw("cant delete on not a member expression");
        }
        return;
    }
    if(node.operator === "typeof"){
        if(node.argument.type === "Identifier"){
            let varid = scope.getVarId(node.argument.name);
            if(varid === -1){
                emitTypeOfGlobal(scope, node.argument.name);
            }else{
                emitGetVariableValue(scope, varid);
                emitTypeOf(scope);
            }
        }else{
            scope.generate(node.argument);
            emitTypeOf(scope);
        }
        return;
    }
    scope.generate(node.argument);
    switch(node.operator){
        case "!":
            emitNotSymbol(scope);
            break;
        case "~":
            emitNegateSymbol(scope);
            break;
        case "-":
            emitMinusOutFront(scope);
            break;
        case "+":
            emitPlusOutFront(scope);
            break;
        case "void":
            emitVoid(scope);
            break;
        default:
            throw("Unsuported unary expression: " + node.operator);
    }
}

export function GenerateUpdateExpression(node: UpdateExpression, scope: Scope){
    let argument = node.argument;
    if(node.operator !== "++" && node.operator !== "--"){
        throw("Unknown update statement: " + node.operator);
    }
    let isPlus = node.operator === "++";

    switch(argument.type){
        case "Identifier": {
            let varid = scope.getVarId(argument.name);
            if(varid !== -1){
                // Local variable. Prefix yields the new value, postfix the old.
                if(isPlus) node.prefix ? emitPrePlusPlus(scope, varid) : emitPlusPlus(scope, varid);
                else node.prefix ? emitPreMinusMinus(scope, varid) : emitMinusMinus(scope, varid);
            }else{
                // Global variable: desugar to globalScope[name]++.
                emitGlobal(scope);
                emitString(scope, scope.getStringId(argument.name));
                emitPropertyUpdate(scope, isPlus, !!node.prefix);
            }
            break;
        }
        case "MemberExpression": {
            let object = argument.object;
            if(object.type === "Identifier" && object.name === "arguments"){
                emitArguments(scope);
            }else if(object.type === "Identifier"){
                let id = scope.getVarId(object.name);
                if(id === -1){
                    emitString(scope, scope.getStringId(object.name));
                    emitGetGlobalVariableValue(scope);
                }else{
                    emitGetVariableValue(scope, id);
                }
            }else{
                scope.generate(object);
            }

            let property = argument.property;
            if(property.type === "Identifier" && !argument.computed){
                emitString(scope, scope.getStringId(property.name));
            }else{
                scope.generate(property);
            }

            emitPropertyUpdate(scope, isPlus, !!node.prefix);
            break;
        }
        default:
            throw("Unknown update statement type");
    }
}

export function GenerateBinaryExpression(node: BinaryExpression, scope: Scope){
    scope.generate(node.left);
    scope.generate(node.right);
    switch(node.operator){
        case "<": {
            emitLessThan(scope);
            break;
        }
        case "<=": {
            emitLessThanOrEqual(scope);
            break;
        }
        case ">": {
            emitGreaterThan(scope);
            break;
        }
        case ">=": {
            emitGreaterThanOrEqual(scope);
            break;
        }
        case "==": {
            emitEqualTo(scope);
            break;
        }
        case "===": {
            emitEqualToStrict(scope);
            break;
        }
        case "!=": {
            emitNotEqualTo(scope);
            break;
        }
        case "!==": {
            emitNotEqualToStrict(scope);
            break;
        }
        case "**": {
            emitRaiseExponent(scope);
            break;
        }
        case ">>": {
            emitBitRightShift(scope);
            break;
        }
        case ">>>": {
            emitBitZeroFillRightShift(scope);
            break;
        }
        case "<<": {
            emitBitLeftShift(scope);
            break;
        }
        case "&": {
            emitBitAnd(scope);
            break;
        }
        case "|": {
            emitBitOr(scope);
            break;
        }
        case "^": {
            emitBitXOR(scope);
            break;
        }
        case "*": {
            emitMultiply(scope);
            break;
        }
        case "/": {
            emitDivide(scope);
            break;
        }
        case "-": {
            emitSub(scope);
            break;
        }
        case "+": {
            emitAdd(scope);
            break;
        }
        case "%": {
            emitRemainder(scope);
            break;
        }
        case "instanceof": {
            emitInstanceOf(scope);
            break;
        }
        case "in": {
            emitIn(scope);
            break;
        }
        default:
            throw("Unknown binary operation: " + node.operator);
    }
}

export function GenerateThrowStatement(node: ThrowStatement, scope: Scope){
    scope.generate(node.argument);
    emitThrow(scope);
}

export function GenerateBlockStatement(node: BlockStatement, scope: Scope){
    node.body.forEach(child => scope.generate(child));
}

export function GenerateIfStatement(node: IfStatement, scope: Scope){
    scope.generate(node.test);

    emitJumpIfFalse(scope);
    const test_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    test_label.setOrigin();
    
    scope.generate(node.consequent);

    emitJMP(scope);
    let consequent_label = scope.makeLabel(Uint32Array.BYTES_PER_ELEMENT);
    consequent_label.setOrigin();
    
    test_label.setTarget();
    if(node.alternate) scope.generate(node.alternate);
    consequent_label.setTarget();
}

export function GenerateExpressionStatement(node: ExpressionStatement, scope: Scope){
    scope.generate(node.expression);
}

export function GenerateProgram(node: Program, scope: Scope){
    node.body.forEach(child => scope.generate(child));
    emitEND(scope);
}

export function GenerateByteCode(node: Node, scope: Scope){
    // Control flow (break/continue/finally routing) cannot cross a function
    // boundary; isolate the stacks for this body and restore them afterwards.
    let savedControlFlow = saveControlFlowStacks();

    //add any functions to the top
    scope.function_set.forEach( fn => {
        //we want to generate params

        let variableId = scope.getVarId(fn.id.name);
        if(variableId === -1) throw("Cant find function to unknown varaible: " + variableId);

        let child_scope = scope.makeChild(fn);

        emitCreateFunction(scope, child_scope.id);
        emitAssignValue(scope, variableId);

        emitParams(fn.params as any[], child_scope);

        let argumentVariableId = child_scope.getVarId("arguments");
        emitArguments(child_scope);
        emitAssignValue(child_scope, argumentVariableId);

        //child_scope.generate(fn.body);
        GenerateByteCode(fn.body, child_scope);
        emitEND(child_scope);
    } )

    //walk the the node for all children
    scope.generate(node);

    restoreControlFlowStacks(savedControlFlow);
}
