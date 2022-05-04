import { State } from './state'
import Asm, { IAsmOptions } from './backend/Asm'
import { MacroFunction } from './macro'

export interface CodeEncoder extends DataEncoder {
  jmp(label: string): CodeEncoder

  label(name: string): CodeEncoder
  data(): DataEncoder
  macro: (fn: MacroFunction) => CodeEncoder
  assemble(format?: 'buffer' | 'arraybuffer'): Buffer | ArrayBuffer
}

export interface DataEncoder {
  db: (operand1: string | number) => DataEncoder
  dw: (operand1: string | number) => DataEncoder

  data: () => DataEncoder
  code: () => CodeEncoder
  macro: (fn: MacroFunction) => DataEncoder
  assemble(format?: 'buffer' | 'arraybuffer'): Buffer | ArrayBuffer
}

export interface Assembler {
  codegen: Asm<IAsmOptions>
  STATE: State
  code: () => CodeEncoder
  data: () => DataEncoder
  $: number
}

export type AssemblerFunction = <T extends Assembler>(options: IAsmOptions) => T
