import * as o from '../../../operand'
import { Register as RegisterBase, SIZE } from '../../../operand'
import { R16, R32, R64, R8, R8H } from '../regfile'
import { Expression } from '../../../expression'
import { MemoryX86 } from './memory'

export class RegisterX86 extends RegisterBase {
  static getName(size, id) {
    const def = 'REG'
    if (typeof size !== 'number') return def
    if (typeof id !== 'number') return def
    switch (size) {
      case SIZE.Q:
        return R64[id]
      case SIZE.D:
        return R32[id]
      case SIZE.W:
        return R16[id]
      case SIZE.B:
        if (this instanceof Register8High) return R8H[id]
        else return R8[id]
      default:
        return def
    }
  }

  constructor(id, size) {
    super(id, size)
    this.name = RegisterX86.getName(size, id).toLowerCase()
  }

  ref(): MemoryX86 {
    return new MemoryX86().ref(this)
  }

  ind(scale_factor: number): MemoryX86 {
    return new MemoryX86().ind(this, scale_factor)
  }

  disp(value: o.Tvariable | Expression): MemoryX86 {
    return new MemoryX86().ref(this).disp(value)
  }

  // Whether the register is one of `%r8`, `%r9`, etc. extended registers.
  isExtended() {
    return this.id > 0b111
  }
}

export class RegisterGP extends RegisterX86 {}

export class Register8 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.B)
  }
}

export class Register8High extends Register8 {}

export class Register16 extends RegisterX86 {
  constructor(id: number) {
    super(id, SIZE.W)
  }
}

export class Register32 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.D)
  }
}

export class Register64 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.Q)
  }
}

export class Register128 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.O)
  }
}

export class Register256 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.H)
  }
}

export class Register512 extends RegisterGP {
  constructor(id: number) {
    super(id, SIZE.I)
  }
}

export class RegisterRip extends RegisterX86 {
  static atomName = 'rip'

  name = RegisterRip.atomName

  constructor() {
    super(0, SIZE.Q)
  }
}

export class RegisterBounds extends RegisterX86 {
  constructor(id) {
    super(id, SIZE.O)
  }
}

export class RegisterFloatingPoint extends RegisterX86 {
  static atomName = 'fp'
}

export class RegisterMm extends RegisterFloatingPoint {
  static atomName = 'mm'

  constructor(id: number) {
    super(id, SIZE.O)
    this.name = RegisterMm.atomName + id
  }
}

export class RegisterSt extends RegisterFloatingPoint {
  static atomName = 'st'

  constructor(id: number) {
    super(id, SIZE.T)
    this.name = RegisterSt.atomName + id
  }
}

export class RegisterVector extends RegisterX86 {}

export class RegisterXmm extends RegisterVector {
  static atomName = 'xmm'

  constructor(id: number) {
    super(id, SIZE.O)
    this.name = RegisterXmm.atomName + id
  }
}

export class RegisterYmm extends RegisterVector {
  static atomName = 'ymm'

  constructor(id: number) {
    super(id, SIZE.H)
    this.name = RegisterYmm.atomName + id
  }
}

export class RegisterZmm extends RegisterVector {
  static atomName = 'zmm'

  constructor(id: number) {
    super(id, SIZE.I)
    this.name = RegisterZmm.atomName + id
  }
}

export class RegisterK extends RegisterX86 {
  static atomName = 'k'

  constructor(id: number) {
    super(id, SIZE.Q)
    this.name = RegisterK.atomName + id
  }
}

export class RegisterCr extends RegisterX86 {
  // Control registers.
  static atomName = 'cr'

  constructor(id: number) {
    super(id, SIZE.Q)
    this.name = RegisterCr.atomName + id
  }
}

export class RegisterDr extends RegisterX86 {
  // Debug registers.
  static atomName = 'dr'

  constructor(id: number) {
    super(id, SIZE.Q)
    this.name = RegisterDr.atomName + id
  }
}

// ## Registers
//
// `Register` represents one of `%rax`, `%rbx`, etc. registers.
export class RegisterSegment extends RegisterX86 {
  static atomName = 'sreg'

  constructor(id) {
    super(id, SIZE.W)
  }
}
