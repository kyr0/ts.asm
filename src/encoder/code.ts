import { Assembler, CodeEncoder } from '../api'
import { getDataEncoder } from './data'

export const getCodeEncoder = (asm: Assembler): CodeEncoder => {
  const encoder = {
    jmp: (labelName: string) => {
      if (!asm.STATE.labelMap[labelName]) {
        throw new Error('Label is not defined: ' + labelName)
      }
      asm.codegen._('jmp', asm.STATE.labelMap[labelName])
      return encoder
    },
    label: (name: string) => {
      if (asm.STATE.labelMap[name]) {
        throw new Error('Label is already defined: ' + name)
      }
      asm.STATE.labelMap[name] = asm.codegen._('label', name)
      return encoder
    },
    data: () => asm.data(),
    ...getDataEncoder<CodeEncoder>(asm, true),
  }
  return encoder
}
