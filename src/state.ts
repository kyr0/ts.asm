import { IAsmOptions } from './assembler/Asm'

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
  labelMap: { [key: string]: number }
  opcode: Buffer
  dataSegmentInstructions: Array<Instruction>
}

export const STATE: State = {
  /**
   * List of .data() section instructions to be
   * encoded at the end of the .code() section.
   */
  dataSegmentInstructions: [],

  /**
   * Registry for labels.
   * Used for resolving labels in the code segment.
   * Also used to make sure no duplicate labels are used,
   * and to make sure all labels referenced are defined.
   */
  labelMap: {},

  /**
   * Encoded opcode result
   */
  opcode: null,
}
