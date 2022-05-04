import * as o from './plugins/x86/operand'
import { RegisterX86 } from './plugins/x86/operand/register'
import Label from './Label'
import { Expression } from './expression'
import Asm, { IAsmOptions } from './Asm'

export class Function {
  abi: Abi = null
  lbl: Label = null // Label is created for every function.
  clobbered: RegisterX86[] = [] // Clobbered registers.
  stackFrame = false // Whether to create a new stack frame.
  locals = 0 // Stack size reserved for function local variables.

  _(bodyCallback): this {
    return this.implement(bodyCallback)
  }
  implement(bodyCallback): this {
    this.abi.code.insert(this.lbl)

    // Prologue
    this.abi.prologue(this.stackFrame, this.clobbered, this.locals)

    // Function body
    bodyCallback()

    // Epilogue
    this.abi.epilogue(this.stackFrame, this.clobbered, this.locals)

    return this
  }
}

// Implements platform and architecture specific ABI conventions, for example,
// calls the right syscall instruction, be it `syscall`, `sysenter`, `int 0x80` or anything else;
// `push`es and `pop`s function arguments to stack according to calling conventions, etc.
export class Abi {
  FunctionClass = Function

  code: Asm<IAsmOptions>

  // rax, rdi, rsi, rdx, r10, r8, r9
  syscallArgs = [o.rax, o.rdi, o.rsi, o.rdx, o.r10, o.r8, o.r9]
  notSyscallArgs = [o.rbx, o.rcx, o.r11, o.r12, o.r13, o.r14, o.r15]

  // args: rdi, rsi, rdx, rcx, r8, r9 + stack
  callArgs = [o.rdi, o.rsi, o.rdx, o.rcx, o.r8, o.r9]

  // scratch: rax, rdi, rsi, rdx, rcx, r8, r9, r10, r11
  scratchRegisters = [o.rax, o.rdi, o.rsi, o.rdx, o.rcx, o.r8, o.r9, o.r10, o.r11]

  // preserved: rbx, rsp, rbp, r12, r13, r14, r15
  preservedRegisters = [o.rbx, o.rsp, o.rbp, o.r12, o.r13, o.r14, o.r15]

  constructor(code: Asm<IAsmOptions>) {
    this.code = code
  }

  syscall(args: any[] = []) {
    if (args.length > 7) throw TypeError('System call can have up to 6 arguments.')

    for (let j = 0; j < args.length; j++) {
      let arg = args[j]
      if (arg !== null) {
        this.code._('mov', [this.syscallArgs[j], arg])
      }
    }
    this.code._('syscall')
  }

  func(lbl_name: string | Label, stackFrame = false, clobbered: RegisterX86[] = [], locals: number = 0): Function {
    let lbl: Label
    if (lbl_name instanceof Label) lbl = lbl_name as Label
    else if (typeof lbl_name === 'string') lbl = this.code.lbl(lbl_name as string)
    else throw TypeError('lbl_name must be a string or a Label.')

    let func = new this.FunctionClass()
    func.abi = this
    func.lbl = lbl
    func.clobbered = clobbered
    func.stackFrame = stackFrame
    func.locals = locals
    return func
  }

  prologue(stackFrame = false, clobbered: RegisterX86[] = [], locals: number = 0) {
    if (stackFrame || locals) {
      // this.code._('enter', [locals, 0]);
      this.code._('push', o.rbp)
      this.code._('mov', [o.rbp, o.rsp])
      if (locals) this.code._('sub', [o.rsp, locals])
    }
    for (let j = 0; j < clobbered.length; j++) {
      let reg = clobbered[j]
      if (this.preservedRegisters.indexOf(reg) > -1) {
        this.code._('push', reg)
      }
    }
  }

  epilogue(stackFrame = false, clobbered: RegisterX86[] = [], locals: number = 0) {
    for (let j = clobbered.length - 1; j > -1; j--) {
      let reg = clobbered[j]
      if (this.preservedRegisters.indexOf(reg) > -1) {
        this.code._('pop', reg)
      }
    }
    if (stackFrame || locals) {
      // this.code._('leave');
      this.code._('mov', [o.rsp, o.rbp])
      this.code._('pop', o.rbp)
    }
    this.code._('ret')
  }

  call(target: Expression | Function, args: any[] = [], preserve: RegisterX86[] = this.scratchRegisters) {
    // Save registers.
    for (let j = 0; j < preserve.length; j++) {
      let reg = preserve[j]
      if (this.scratchRegisters.indexOf(reg) > -1) {
        this.code._('push', reg)
      }
    }

    for (let j = 0; j < args.length; j++) {
      let arg = args[j]
      if (arg !== null) {
        if (j < this.callArgs.length) {
          this.code._('mov', [this.callArgs[j], arg])
        } else {
          this.code._('push', args[j])
        }
      }
    }

    let expr: Expression
    if (target instanceof Expression) expr = target
    else if (target instanceof Function) expr = target.lbl
    else throw TypeError('`target` must be an Expression or a Function.')

    this.code._('call', expr)

    // Restore registers.
    for (let j = preserve.length - 1; j > -1; j--) {
      let reg = preserve[j]
      if (this.scratchRegisters.indexOf(reg) > -1) {
        this.code._('pop', reg)
      }
    }
  }
}
