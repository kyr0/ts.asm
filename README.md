# asm.ts

X86_64 assember with a chaining API and auto-complete support.

## Motivation

Learning assembly for real. Having fun while doing so.
Feel free to join me in this; keep calm and PR! :)

## Install

    npm install ts.asm

    # or

    yarn add ts.asm

## Usage

Example in `ts.asm` (a.k.a. TSASM):

```ts
import { asm } from 'ts.asm'

// standard-compliant x86_64 machine code
// this code creates a 512 byte bootloader which ends up
// in an infinite loop; can be loaded e.g. via QEmu, VMWare, v86, etc.
const machineCode = asm()
  .code()
  .label('hang') // declare label
  .jmp('hang') // jump to iself; initinite loop
  .macro((asm) => {
    // pad until 510 bytes are reached
    for (let i = 0; i < 510 - asm.$; i++) {
      asm.code().db(0x0)
    }
  })
  // this data is put at the end, packed in the data section
  .data()
  // internal big endian to little endian conversion
  .dw(0xaa55)
  // returns a Buffer (native in Node.js, polyfilled in browser)
  .assemble()
```

The same code in Netwide Assembler (NASM):

```nasm
loop:
  jmp loop
times 510 -( $ - $$ ) db 0
dw 0xaa55
```

To assemple using NASM:

    nasm boot_sect.asm -f bin -o boot_sect.bin

## Current status

The x86_64 code generation backend is based on the original ass.js implementation.
I'm still refactoring it, but the codebase seems to be stable and supporting even advanced
instruction sets like SSE up to version 4.1. However, there is no guarantee on the stability.
Please consider this project as a work in progress.

On top of the code generation backend, the TSASM library provides a chaining API.
The chaining API allows for easy creation of complex assembly code. It features
macros, code and data sections and several other features to improve the DX, like
auto-completion and built-in label referencing.

However, the chaining API is in alpha stage and instructions are only added in a
step-by-step progress, following TDD practices.

## Future plans

For the future I'd like to add more features; please beware that this is no
clear roadmap, just an unordered list of ideas that are driven by my own demand
and interest. If you'd like to see some features, you're very welcome to PR! :)

- [ ] Complete the chaining API (MVP-stage); e.g. via `Proxy` and interfaces
- [ ] Parser for the NASM syntax and bridging to the chaining API
- [ ] Executable file format support (Mach-O, ELF, PE)
- [ ] Integration and testing with modern, widly-used linkers like `lld`
- [ ] CLI `tsasm` with a NASM CLI compatibility
- [ ] Support for more CPU architectures (namely `aarch64` would be cool)

## Learning Resources

### Beginner course on assembler

https://www.youtube.com/playlist?list=PL9C96j-WSJzIGSzImXyK2Yec2Z0cbPZ5p

### X86 Cheat sheets

OpCode table for x86_64:
http://ref.x86asm.net/coder.html

Instruction set reference:
https://www.felixcloutier.com/x86/

### Low Level from 0 to hero

Low level from zero to hero (MIT OpenCourseWare)
MIT 6.004 Computation Structures, Spring 2017 by Chris Terman
https://www.youtube.com/watch?v=qyBuzeUYs2M&list=PLUl4u3cNGP62WVs95MNq3dQBqY2vGOtQ2&index=1

Complete course: https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/

### Performance - and Assembly deep dive

MIT 6.172 Performance Engineering of Software Systems, Fall 2018 by Charles Leiserson
https://www.youtube.com/watch?v=o7h_sYMk_oc&list=PLUl4u3cNGP63VIBQVWguXxZZi0566y7Wf

Complete course: https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/

### Own Operating System course

A course on how to write your own operating system by Daedalus Community.
https://www.youtube.com/watch?v=MwPjvJ9ulSc

### Another course on writing your own operating system

Writing a Simple Operating System — from Scratch by Nick Blundell
https://www.cs.bham.ac.uk/~exr/lectures/opsys/10_11/lectures/os-dev.pdf
