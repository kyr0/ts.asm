import { Assembler, CodeEncoder, DataEncoder } from '../api'
import { MacroFunction } from '../macro'

export const getDataEncoder = <T extends DataEncoder | CodeEncoder>(asm: Assembler, codeSegment = false): T => {
  const encoder = {
    db: (data: string | number) => {
      if (!codeSegment) {
        asm.STATE.dataSegmentInstructions.push({
          mnemonic: 'db',
          operands: [data],
        })
      } else {
        asm.codegen._('db', data)
      }
      return encoder
    },
    dw: (data: string | number) => {
      if (!codeSegment) {
        asm.STATE.dataSegmentInstructions.push({
          mnemonic: 'dw',
          operands: [data],
        })
      } else {
        asm.codegen._('dw', data)
      }
      return encoder
    },
    code: () => asm.code(),
    data: () => encoder,

    // general-purpose
    macro: (fn: MacroFunction) => {
      fn(asm)
      return encoder
    },
    assemble: (format: 'buffer' | 'arraybuffer' = 'buffer') => {
      // encode .data() section instructions at the end of the .code() section
      if (asm.STATE.dataSegmentInstructions.length) {
        asm.STATE.dataSegmentInstructions.forEach((instruction) => {
          asm.codegen._(instruction.mnemonic, ...instruction.operands)
        })
        asm.STATE.dataSegmentInstructions = []
      }

      const machineCode = asm.codegen.compile()
      asm.STATE.opcode = machineCode as Buffer

      switch (format) {
        default:
        case 'buffer':
          return machineCode
        case 'arraybuffer':
          return new Uint8Array(asm.codegen.compile()).buffer
      }
    },
  }
  return encoder as T
}
