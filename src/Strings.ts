import { Op } from "./Op";
import { forEveryParser, Scope } from "./Parserv2";
import { i32Bytes } from "./Utils";

export class Strings {
    public id = 0;
    public strings: Array<string> = [];
    public set: {[key: string]: number} = {};
    public parent: Scope;

    constructor(parent: Scope){
        this.parent = parent;
    }

    add(string: string){
        if(string.length > 0xffffffff) throw("Cant support strings over 0xffffffff length yet");
        //wtf javascript
        if(string === "__proto__") string = "____proto____";
       
        if(!Object.hasOwnProperty.apply(this.set, [string])){
            let id = this.id++;
            this.set[string] = id;
            this.strings[id] = string;
        }
    }

    get(string: string): number{
        //wtf javascript
        if(string === "__proto__") string = "____proto____";
        if(!Object.hasOwnProperty.apply(this.set, [string])) this.add(string);
        return this.set[string];
    }

    getData(): {
        stringScope: Array<any>,
        rawStringdata: Uint8Array,
    }{
        let offset = 0;
        forEveryParser(this.parent, (scope) => {
            offset += scope.offset;
        });
        let stringScope = [0, -1, 0, [], offset];
        let buffer = [];
        this.strings.forEach(str => {
            buffer.push(Op.RegisterString);

            let bytes = Buffer.from(str, "utf8");
            let byteLength = bytes.length;
            if(byteLength >= 0xff){
                buffer.push(0xff);
                let lenBytes = i32Bytes(byteLength);
                lenBytes.forEach(b => buffer.push(b));
            }else{
                buffer.push(byteLength);
            }

            // Serialise as UTF-8 so characters above U+00FF (CJK, emoji, ...)
            // survive; the byte length above tells the runtime how many bytes
            // to consume. Decoder lives in Emulator._loadString and must match.
            for(let i = 0 ; i < byteLength; i++) buffer.push(bytes[i]);
        })
        
        buffer.push(Op.JumpToBlock);
        buffer.push(1); //jump to 0
        buffer.push(0);
        buffer.push(0);
        buffer.push(0);
        buffer.push(Op.END);

        let rawStringdata = new Uint8Array(buffer);
        return {
            stringScope,
            rawStringdata,
        }
    }
}
