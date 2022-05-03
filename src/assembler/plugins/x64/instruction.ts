import { SIZE } from '../../operand'
import * as o from '../x86/operand'
import { InstructionX86 } from '../x86/instruction'
import * as p from '../x86/parts'
import { DisplacementValue } from '../x86/operand/displacement'
import { Register8High, RegisterRip, RegisterX86 } from '../x86/operand/register'
import { MemoryX86 } from '../x86/operand/memory'

export class InstructionX64 extends InstructionX86 {
  protected needs32To64OperandSizeChange() {
    // Default operand size in x64 mode is 32 bits.
    return this.mnemonic.operandSize === SIZE.Q
  }

  protected needsRexPrefix() {
    if (this.pfxEx) return false // VEX or EVEX already set
    if (this.mnemonic.rex) return true
    if (!this.ops.list.length) return false
    // if(!this.ops.hasRegisterOrMemory()) return false;

    if (this.ops.hasExtendedRegister()) return true

    let [dst, src] = this.ops.list
    // sil, dil, spl, bpl
    // if(((dst instanceof o.Register8) && !(dst instanceof o.Register8High) && (dst.id >= r.R8.SPL) && (dst.id <= r.R8.DIL)) ||
    //     ((src instanceof o.Register8) && !(src instanceof o.Register8High) && (src.id >= r.R8.SPL) && (src.id <= r.R8.DIL))) return true;
    if (
      dst === o.sil ||
      dst === o.dil ||
      dst === o.spl ||
      dst === o.bpl ||
      src === o.sil ||
      src === o.dil ||
      src === o.spl ||
      src === o.bpl
    )
      return true

    if (this.mnemonic.operandSizeDefault === SIZE.Q) return false
    if (this.needs32To64OperandSizeChange()) return true
    return false
  }

  protected createPrefixes() {
    super.createPrefixes()
    if (this.needsRexPrefix()) this.createRex()
  }

  protected createRex() {
    let [dst, src] = this.ops.list
    if (dst instanceof Register8High || src instanceof Register8High)
      throw Error('Cannot encode REX prefix with high 8-bit register.')

    if (this.mnemonic.opEncoding === 'mr') [dst, src] = [src, dst]

    let W = 0,
      R = 0,
      X = 0,
      B = 0

    if (this.needs32To64OperandSizeChange() && this.mnemonic.operandSizeDefault !== SIZE.Q) W = 1

    let pos = this.mnemonic.opEncoding.indexOf('m')
    if (pos > -1) {
      let m = this.ops.getMemoryOperand() as MemoryX86 // Memory operand is only one.
      if (m) {
        if (m.base && m.base.idSize() > 3) B = 1
        if (m.index && m.index.idSize() > 3) X = 1
      }
    }

    if (dst instanceof RegisterX86 && src instanceof RegisterX86) {
      if ((dst as RegisterX86).isExtended()) R = 1
      if ((src as RegisterX86).isExtended()) B = 1
    } else {
      let r = this.ops.getRegisterOperand()
      let mem: MemoryX86 = this.ops.getMemoryOperand() as MemoryX86

      if (r) {
        if (r.idSize() > 3)
          if (mem) R = 1
          else B = 1
      }
    }

    this.pfxEx = new p.PrefixRex(W, R, X, B)
    this.length++
    this.lengthMax++
  }

  // Adding RIP-relative addressing in long mode.
  //
  // > In the 64-bit mode, any instruction that uses ModRM addressing can use RIP-relative addressing.
  //
  // > Without RIP-relative addressing, ModRM instructions address memory relative to zero. With RIP-relative
  // > addressing, ModRM instructions can address memory relative to the 64-bit RIP using a signed
  // > 32-bit displacement.
  protected createModrm() {
    let mem: MemoryX86 = this.ops.getMemoryOperand() as MemoryX86
    if (mem && mem.base && mem.base instanceof RegisterRip) {
      if (mem.index || mem.scale)
        throw TypeError('RIP-relative addressing does not support index and scale addressing.')

      // Encode `Modrm.reg` field.
      let reg = 0
      if (this.mnemonic.opreg > -1) {
        reg = this.mnemonic.opreg
      } else {
        let r = this.ops.getRegisterOperand()
        if (r) reg = r.get3bitId()
      }

      this.modrm = new p.Modrm(p.Modrm.MOD.INDIRECT, reg, p.Modrm.RM.INDIRECT_DISP)
      this.length++
      this.lengthMax++
    } else super.createModrm()
  }

  protected fixDisplacementSize() {
    let mem = this.ops.getMemoryOperand()
    if (mem && typeof mem == 'object' && mem.base instanceof RegisterRip) {
      // RIP-relative addressing
      // Do nothing as we already created RIP-displacement which is always 4-bytes.
    } else super.fixDisplacementSize()
  }

  protected createDisplacement() {
    let mem = this.ops.getMemoryOperand() as MemoryX86
    if (mem && typeof mem == 'object' && mem.base instanceof RegisterRip) {
      // RIP-relative addressing has always 4-byte displacement.

      if (!mem.displacement) mem.disp(0)

      let size = DisplacementValue.SIZE.DISP32
      if (mem.displacement.size < size) mem.displacement.signExtend(size)

      this.displacement = new p.Displacement(mem.displacement)

      this.length += size / 8
      this.lengthMax += size / 8
    } else return super.createDisplacement()
  }
}
