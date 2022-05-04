import { Expression, ExpressionVolatile, IPushable, SIZE_UNKNOWN } from './expression'
import Mnemonic from './Mnemonic'
import * as t from './table'
import { Immediate, isTnumber, Operand, Operands, Relative, Tnumber } from './operand'
import { Match } from './plugins/x86/MnemonicX86'
import { repeat } from './util'

export class Instruction extends ExpressionVolatile {
  mnemonic: Mnemonic = null // Definition on how to construct this instruction.
  opts: object = null // Instruction options provided by user.

  build(): this {
    super.build()
    return this
  }

  write(arr: IPushable) {}

  protected toStringExpression() {
    const parts = []

    parts.push(this.mnemonic.getName())

    if (parts.join(' ').length < 8) parts.push(new Array(7 - parts.join(' ').length).join(' '))

    if (this.ops) if (this.ops.list.length) parts.push(this.ops.toString())

    return parts.join(' ')
  }

  toString(margin = '    ', comment = true) {
    const expression = this.toStringExpression()
    let cmt = ''

    if (comment) {
      let octets = []

      this.write(octets)
      octets = octets.map(function (byte) {
        return byte <= 0xf ? '0' + byte.toString(16).toUpperCase() : byte.toString(16).toUpperCase()
      })
      cmt = `0x` + octets.join(', 0x') + ` ${this.bytes()} bytes` // + ' / ' + this.def.toString();
    }

    return this.formatToString(margin, expression, cmt)
  }
}

// Wrapper around multiple instructions when different machine instructions can be used to perform the same task.
// For example, `jmp` with `rel8` or `rel32` immediate, or when multiple instruction definitions match provided operands.
export class InstructionSet<TInstruction extends Instruction> extends ExpressionVolatile {
  matches: Match[] = null
  insn: TInstruction[] = []
  picked: number = -1 // Index of instruction that was eventually chosen.
  opts: object = null // Instruction options provided by user.
  length: number

  constructor(ops: Operands, matches: Match[], opts: object) {
    super(ops)
    this.matches = matches
    this.opts = opts
  }

  write(arr: IPushable) {
    if (this.picked === -1) throw Error('Instruction candidates not reduced.')
    this.getPicked().write(arr)
  }

  getPicked() {
    return this.insn[this.picked]
  }

  allInstructionsSameSize(): boolean {
    const size = this.insn[0].bytes()

    for (let i = 1; i < this.insn.length; i++) {
      if (size !== this.insn[i].bytes()) return false
    }

    return true
  }

  getFixedSizeExpression(): Expression {
    let shortestInd = -1
    let shortestLen = Infinity

    for (let m = 0; m < this.ops.list.length; m++) {
      const op = this.ops.list[m]

      if (op instanceof Relative) {
        for (let j = 0; j < this.insn.length; j++) {
          const ins = this.insn[j] as TInstruction
          const rel = ins.ops.list[m] as Relative // Relative of instruction.
          const success = rel.canHoldMaxOffset(this)

          if (success) {
            // potential candidate.
            if (shortestInd === -1) {
              ;[shortestInd, shortestLen] = [j, ins.bytes()]
            } else {
              const bytes = ins.bytes()

              if (bytes < shortestLen) {
                ;[shortestInd, shortestLen] = [j, bytes]
              }
            }
          }
        }
      }
    }

    if (shortestInd === -1) {
      const instruction = this.pickShortestInstruction()

      if (!instruction) throw Error(`Could not fix size for [${this.index}] Expression.\n${this.toString()}`)

      return instruction
    }

    this.picked = shortestInd
    return this.getPicked()
  }

  evaluate() {
    let picked = this.getPicked()
    return picked.evaluate()
  }

  bytes() {
    return this.picked === -1 ? SIZE_UNKNOWN : this.getPicked().bytes()
  }

  bytesMax() {
    let bytes = 0
    let max = 0
    for (let ins of this.insn) {
      if (ins) {
        bytes = ins.bytesMax()
        if (bytes > max) max = bytes
      }
    }
    return bytes
  }

  calcOffset() {
    super.calcOffset()
    let picked = this.getPicked()
    if (picked) {
      picked.offset = this.offset
    }
  }

  pickShortestInstruction(): Instruction {
    if (this.insn.length === 1) return this.insn[0]

    if (this.ops.hasRelative()) return null

    // Pick the shortest instruction if we know all instruction sizes, otherwise don't pick any.
    let size = SIZE_UNKNOWN
    let isize = 0
    for (let j = 0; j < this.insn.length; j++) {
      const insn = this.insn[j]

      isize = insn.bytes()
      if (isize === SIZE_UNKNOWN) {
        this.picked = -1
        return null
      }
      if (size === SIZE_UNKNOWN || isize < size) {
        size = isize
        this.picked = j
      }
    }
    return this.getPicked()
  }

  protected cloneOperands() {
    return this.ops.clone(Operands)
  }

  protected createInstructionOperands(insn: Instruction, tpls: t.TTableOperand[]): Operands {
    let ops = this.cloneOperands()
    for (let j = 0; j < ops.list.length; j++) {
      let op = ops.list[j]
      if (op instanceof Operand) {
        if (op instanceof Relative) {
          let Clazz = tpls[j] as any
          if (Clazz.name.indexOf('Relative') === 0) {
            let RelativeClass = Clazz as typeof Relative
            let rel = op.clone()
            rel.cast(RelativeClass)
            ops.list[j] = rel
          }
        }
      } else if (isTnumber(op)) {
        let tpl = tpls[j] as any
        let num = op as any as Tnumber
        if (typeof tpl === 'number') {
          // Skip number
          // `int 3`, for example, is just `0xCC` instruction.
          ops.list[j] = null
        } else if (typeof tpl === 'function') {
          let Clazz = tpl as any
          if (Clazz.name.indexOf('Relative') === 0) {
            let RelativeClass = Clazz as typeof Relative
            let rel = new Relative(insn, num as number)
            rel.cast(RelativeClass)
            ops.list[j] = rel
          } else if (Clazz.name.indexOf('Immediate') === 0) {
            let ImmediateClass = Clazz as typeof Immediate
            let imm = new ImmediateClass(num)
            ops.list[j] = imm
          } else throw TypeError('Invalid definition expected Immediate or Relative.')
        } else throw TypeError('Invalid definition expected Immediate or Relative or number.')
      } else throw TypeError('Invalid operand expected Register, Memory, Relative, number or number64.')
    }
    return ops
  }

  build() {
    super.build()

    const { matches } = this
    const len = matches.length

    console.log('build() matches', matches)
    this.insn = []
    for (let j = 0; j < len; j++) {
      const match = matches[j]

      const insn = this.asm.instruction() as TInstruction
      insn.index = this.index
      insn.mnemonic = match.mnemonic
      insn.opts = this.opts

      const ops = this.createInstructionOperands(insn, match.operandMatch)
      ops.validateSize()
      insn.ops = ops

      insn.asm = this.asm
      insn.build()

      this.insn.push(insn)
      this.length += insn.length
    }
  }

  toString(margin = '    ', comment = true) {
    if (this.picked === -1) {
      let expression = '(one of:)'
      const spaces = repeat(' ', Math.max(0, Expression.commentColls - expression.length))

      expression += spaces + `; ${this.formatOffset()} max ${this.bytesMax()} bytes\n`

      const lines = []

      for (const match of this.matches) lines.push(margin + match.mnemonic.toString())

      return expression + lines.join('\n')
    } else {
      const picked = this.getPicked()

      return picked.toString(margin, comment) + ' ' + picked.bytes() + ' bytes'
    }
  }
}
