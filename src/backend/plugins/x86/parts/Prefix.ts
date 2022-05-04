import InstructionPart from './InstructionPart'

export enum PREFIX {
  LOCK = 0xf0,
  REP = 0xf3, // REP prefix.
  REPE = 0xf3, // REPE/REPZ prefix.
  REPNE = 0xf2, // REPNE/REPNZ prefix
  CS = 0x2e,
  SS = 0x36,
  DS = 0x3e,
  ES = 0x26,
  FS = 0x64,
  GS = 0x65,
  REX = 0b01000000, // 0x40
  BNT = 0x2e, // Branch not taken, same as CS.
  BT = 0x3e, // Branch taken, same as DS.
  OS = 0x66, // Operand size override.
  AS = 0x67, // Address size override.
}

abstract class Prefix extends InstructionPart {}

export default Prefix
