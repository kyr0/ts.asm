import { IAsmOptions } from './backend/Asm'

/**
 * Assembly instruction serialized
 * as it is given to the assembler.
 * This is used for pushing .data()
 * section instructions at the end
 * of the code section.
 */
export interface Instruction {
  mnemonic: string
  operands: Array<any>
}

export interface State {
  options?: IAsmOptions

  /**
   * Registry for labels.
   * Used for resolving labels in the code segment.
   * Also used to make sure no duplicate labels are used,
   * and to make sure all labels referenced are defined.
   */
  labelMap: { [key: string]: number }

  /**
   * Encoded opcode result
   */
  opcode: Buffer
  /**
   * List of .data() section instructions to be
   * encoded at the end of the .code() section.
   */
  dataSegmentInstructions: Array<Instruction>
}

export const getDefaultState = (): State => ({
  labelMap: {},
  opcode: null,
  dataSegmentInstructions: [],
})
