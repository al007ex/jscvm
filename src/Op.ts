// @ts-nocheck
let id = 0;
export const _Op: { [key: string]: number } = {
    Jump : id++,
    END : id++,
    I8 : id++,
    I32 : id++,
    BOOL : id++,
    String : id++,
    JumpIfFalse : id++,
    JumpToBlock : id++,
    JumpToStart : id++,
    GetArguments : id++,

    //binary expressions
    LessThan : id++,
    LessThanOrEqual : id++,
    GreaterThan : id++,
    GreaterThanOrEqual : id++,
    EqualTo : id++,
    EqualToStrict : id++,
    NotEqualTo : id++,
    NotEqualToStrict : id++,
    Add : id++,
    Sub : id++,
    Divide : id++,
    Multiply : id++,
    Remainder : id++,
    BitAnd : id++,
    BitOr : id++,
    BitXOR : id++,
    BitLeftShift : id++,
    BitRightShift : id++,
    BitZeroFillRightShift : id++,
    RaiseExponent : id++,

    AssignValue : id++,
    AssignValueToGlobal : id++,
    GetVariableValue : id++,
    GetObjectProperty : id++,
    SetObjectProperty : id++,
    GetGlobalVariableValue : id++,
    CreateFunction : id++,
    Call : id++,
    ObjectPropertyCall : id++,
    ReturnValue : id++,
    RegisterString : id++,

    MakeArray : id++,
    MakeObject : id++,
    This : id++,
    GetArgs : id++,
    Debugger : id++,

    PlusPlus : id++,
    MinusMinus : id++,
    PropertyPlusPlus : id++,
    PropertyMinusMinus : id++,

    GlobalScope : id++,
    New : id++,

    Or : id++,
    And : id++,
    NotSymbol : id++,
    TypeOf : id++,
    TypeOfGlobal : id++,
    NegateSymbol : id++,
    InstanceOf : id++,
    Throw : id++,
    Null : id++,
    In : id++,
    Delete : id++,
    MinusOutFront : id++,
    PlusOutFront : id++,
    Void : id++,
    Duplicate: id++,
    Regex: id++,

    F64: id++,

    PrePlusPlus: id++,
    PreMinusMinus: id++,
    PushHandler: id++,
    PopHandler: id++,

    PrePropertyPlusPlus: id++,
    PrePropertyMinusMinus: id++,
    EndFinally: id++,
    PushFinally: id++,
    PopFinally: id++,
    ReturnFinally: id++,
    DefineAccessor: id++,
    CompoundAssignProperty: id++,
    CreateArrow: id++,
    Pop: id++,
    ForInKeys: id++,
    NewArray: id++,
    ArrayAppend: id++,
    ArrayAppendSpread: id++,
    ApplyCall: id++,
    ConstructSpread: id++,
};
export const OpRemap: { [key: string]: number } = {};
export const Op: { [key: string]: number } = {};
export const RNG_XOR = 0;
export let OpIdx = 0;
for(const key in _Op){
    Object.defineProperty(Op, key, {
        get(){
            if(OpRemap.hasOwnProperty(key)){
                return OpRemap[key];
            }else{
                let id = OpIdx++;
                OpRemap[key] = id;
                return id;
            }
        }
    })
}

// Reset the per-build opcode shuffle so one process can compile many programs
// (each build re-derives the opcode numbering from that program's access order).
export function resetOpcodeState(){
    OpIdx = 0;
    for(const key in OpRemap){ delete OpRemap[key]; }
}

export const OpcodeString: { [key: number]: string } = {
    [_Op.Jump] : "Jump",
    [_Op.END] : "End",
    [_Op.I8] : "Load I8",
    [_Op.I32] : "Load I32",
    [_Op.BOOL] : "Load Bool",
    [_Op.String] : "Load String",
    [_Op.JumpIfFalse] : "JumpIfFalse",
    [_Op.JumpToBlock] : "JumpToBlock",
    [_Op.JumpToStart] : "JumpToStart",
    [_Op.GetArguments] : "GetArguments",

    //binary expressions
    [_Op.LessThan] : "LessThan",
    [_Op.LessThanOrEqual] : "LessThanOrEqual",
    [_Op.GreaterThan] : "GreaterThan",
    [_Op.GreaterThanOrEqual] : "GreaterThanOrEqual",
    [_Op.EqualTo] : "EqualTo",
    [_Op.EqualToStrict] : "EqualToStrict",
    [_Op.NotEqualTo] : "NotEqualTo",
    [_Op.NotEqualToStrict] : "NotEqualToStrict",
    [_Op.Add] : "Add",
    [_Op.Sub] : "Sub",
    [_Op.Divide] : "Divide",
    [_Op.Multiply] : "Multiply",
    [_Op.Remainder] : "Remainder",
    [_Op.BitAnd] : "BitAnd",
    [_Op.BitOr] : "BitOr",
    [_Op.BitXOR] : "BitXOR",
    [_Op.BitLeftShift] : "BitLeftShift",
    [_Op.BitRightShift] : "BitRightShift",
    [_Op.BitZeroFillRightShift] : "BitZeroFillRightShift",
    [_Op.RaiseExponent] : "RaiseExponent",

    [_Op.AssignValue] : "AssignValue",
    [_Op.AssignValueToGlobal] : "AssignValueToGlobal",
    [_Op.GetVariableValue] : "GetVariableValue",
    [_Op.GetObjectProperty] : "GetObjectProperty",
    [_Op.SetObjectProperty] : "SetObjectProperty",
    [_Op.GetGlobalVariableValue] : "GetGlobalVariableValue",
    [_Op.CreateFunction] : "CreateFunction",
    [_Op.Call] : "Call",
    [_Op.ObjectPropertyCall] : "ObjectPropertyCall",
    [_Op.ReturnValue] : "ReturnValue",
    [_Op.RegisterString] : "RegisterString",

    [_Op.MakeArray] : "MakeArray",
    [_Op.MakeObject] : "MakeObject",
    [_Op.This] : "This",
    [_Op.GetArgs] : "GetArgs",
    [_Op.Debugger] : "Debugger",

    [_Op.PlusPlus] : "PlusPlus",
    [_Op.MinusMinus] : "MinusMinus",
    [_Op.PropertyPlusPlus] : "PropertyPlusPlus",
    [_Op.PropertyMinusMinus] : "PropertyMinusMinus",

    [_Op.GlobalScope] : "GlobalScope",
    [_Op.New] : "New",

    [_Op.Or] : "Or",
    [_Op.And] : "And",
    [_Op.NotSymbol] : "NotSymbol",
    [_Op.TypeOf] : "TypeOf",
    [_Op.TypeOfGlobal] : "TypeOfGlobal",
    [_Op.NegateSymbol] : "NegateSymbol",
    [_Op.InstanceOf] : "InstanceOf",
    [_Op.Throw] : "Throw",
    [_Op.Null] : "Null",
    [_Op.In] : "In",
    [_Op.Delete] : "Delete",
    [_Op.MinusOutFront] : "MinusOutFront",
    [_Op.PlusOutFront] : "PlusOutFront",
    [_Op.Void] : "Void",
    [_Op.Duplicate] : "Duplicate",
    [_Op.Regex] : "Regex",
    [_Op.F64] : "Load F64",
    [_Op.PrePlusPlus] : "PrePlusPlus",
    [_Op.PreMinusMinus] : "PreMinusMinus",
    [_Op.PushHandler] : "PushHandler",
    [_Op.PopHandler] : "PopHandler",
    [_Op.PrePropertyPlusPlus] : "PrePropertyPlusPlus",
    [_Op.PrePropertyMinusMinus] : "PrePropertyMinusMinus",
    [_Op.EndFinally] : "EndFinally",
    [_Op.PushFinally] : "PushFinally",
    [_Op.PopFinally] : "PopFinally",
    [_Op.ReturnFinally] : "ReturnFinally",
    [_Op.DefineAccessor] : "DefineAccessor",
    [_Op.CompoundAssignProperty] : "CompoundAssignProperty",
    [_Op.CreateArrow] : "CreateArrow",
    [_Op.Pop] : "Pop",
    [_Op.ForInKeys] : "ForInKeys",
    [_Op.NewArray] : "NewArray",
    [_Op.ArrayAppend] : "ArrayAppend",
    [_Op.ArrayAppendSpread] : "ArrayAppendSpread",
    [_Op.ApplyCall] : "ApplyCall",
    [_Op.ConstructSpread] : "ConstructSpread",
};
