# asm.ts

Implements a tiny assember with a minimal set of instructions
for CPU architectures. Offers a TypeScript API that exposes
the mneomics as functions and operands as arguments. Macros
and directives are supported as well.

Example in NASM:
```asm
; code.asm
hang:
    jmp hang
times 510 -( $ - $$ ) db 0
dw 0xAA55
```
Then you run: `nasm -f bin -o code.bin code.asm`

Example in asm.ts:
```ts
import { asm, Assembler, MacroFunction } from "asm.ts"

// with this, we get auto-complete on jmp() and label()
export type labels = 'hang'

interface IfDirective {
    if: (fn: MacroFunction) => Assembler
}

// code.asm with asm.ts, generating x86 machine code
asm<labels, Assembler & IfDirective>('x86', {
    highMem: true
})
    .code()
        .label('hang') // declare label
        .jmp('hang') // jump to iself; initinite loop
        .macro((asm) => {

            // could be "assembler flags" assembling code in or no
            if (asm.flags.highMem) {
                // do something
            }

            // pad until 510 bytes are reached
            for (let i = 0; i < 510 - asm.length; i++) {
                asm.db(0x0)
            }
        })
    // this data is put at the end, packed in the data section
    .data()
        // internal big endian to little endian conversion
        .dw(0xAA55) 

const machienCode = asm.encode() // returns a Buffer (native in Node.js, polyfilled in browser)
```

## Beginner course on assembler

https://www.youtube.com/playlist?list=PL9C96j-WSJzIGSzImXyK2Yec2Z0cbPZ5p

## Encoding schema

https://www.felixcloutier.com/x86/
http://ref.x86asm.net/coder.html


## Video Course

Nice easy course:
https://www.youtube.com/watch?v=E5coOpC-uAM
https://asmirvine.com/


General low level
https://www.youtube.com/watch?v=qyBuzeUYs2M&list=PLUl4u3cNGP62WVs95MNq3dQBqY2vGOtQ2&index=1

Assembly
https://www.youtube.com/watch?v=o7h_sYMk_oc&list=PLUl4u3cNGP63VIBQVWguXxZZi0566y7Wf