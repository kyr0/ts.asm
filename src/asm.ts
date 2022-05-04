import { Assembler } from './api'
import { X64 } from './backend'
import { IAsmOptions } from './backend/Asm'
import { InstructionSetX86 } from './backend/plugins/x86/instruction'
import { getCodeEncoder } from './encoder/code'
import { getDataEncoder } from './encoder/data'
import { getDefaultState } from './state'

export const asm = (options?: IAsmOptions) => {
  const assembler: Assembler = {
    codegen: X64(options),
    STATE: {
      ...getDefaultState(),
      ...options,
    },
    code: () => getCodeEncoder(assembler),
    data: () => getDataEncoder(assembler),
    // https://www.ibm.com/docs/en/aix/7.2?topic=addressing-location-counter
    get $() {
      let $ = 0
      // look-ahead 2nd pass run
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
