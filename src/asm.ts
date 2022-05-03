import { Assembler } from './api'
import { X64 } from './assembler'
import { IAsmOptions } from './assembler/Asm'
import { InstructionSetX86 } from './assembler/plugins/x86/instruction'
import { getCodeEncoder } from './encoder/code'
import { getDataEncoder } from './encoder/data'
import { STATE } from './state'

export const asm = (options?: IAsmOptions) => {
  STATE.options = {
    ...STATE.options,
    ...options,
  }

  // TODO: https://github.com/streamich/ass-js/blob/master/src/instruction.ts
  // TODO: implement something like: https://github.com/Jensen-Mourat/js-intel-x86-assembler/blob/main/src/asm.ts
  const assembler: Assembler = {
    codegen: X64(options),
    STATE,
    code: () => getCodeEncoder(assembler),
    data: () => getDataEncoder(assembler),
    // https://www.ibm.com/docs/en/aix/7.2?topic=addressing-location-counter
    get $() {
      let $ = 0
      assembler.codegen.expressions.forEach((is: InstructionSetX86) => {
        if (!is || typeof is.getFixedSizeExpression !== 'function') return
        const fixedExpression = is.getFixedSizeExpression()
        if (!fixedExpression) return
        $ += fixedExpression.length
      })
      return $
    },
  }
  return assembler
}
