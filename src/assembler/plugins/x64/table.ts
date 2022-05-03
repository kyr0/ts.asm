import { extend } from '../../util'
import * as o from '../x86/operand'
import * as t from '../x86/table'
import {
  S,
  rel,
  rel8,
  rel16,
  rel32,
  imm,
  imm8,
  imm16,
  imm32,
  imm64,
  immu,
  immu8,
  immu16,
  immu32,
  immu64,
  M,
  r,
  r8,
  r16,
  r32,
  r64,
  mm,
  st,
  xmm,
  xmmm,
  xmm_xmmm,
  xmm_xmm_xmmm,
  ymm,
  ymmm,
  ymm_ymmm,
  ymm_ymm_ymmm,
  zmm,
  zmmm,
  zmm_zmmm,
  zmm_zmm_zmmm,
  bnd,
  cr,
  dr,
  sreg,
  m,
  m8,
  m16,
  m32,
  m64,
  m128,
  m256,
  m512,
  rm8,
  rm16,
  rm32,
  rm64,
} from '../x86/atoms'
import { EXT, INS } from '../x86/consts'
import { cr0_7, dr0_7, ext_avx, ext_avx2, ext_mmx, ext_sse, ext_sse2, rvm } from './atoms'

declare const require
function lazy(part: string, mnemonic: string) {
  return require('./table/' + part).default[mnemonic]
}

export const defaults = {
  ...t.defaults,
  rex: false,
  ds: S.D,
}

function tpl_not(o = 0xf6, or = 2, lock = true): t.ITableDefinitionX86[] {
  return [
    { o: o + 1, or: or, lock: lock },
    // F6 /2 NOT r/m8 M Valid Valid Reverse each bit of r/m8.
    // REX + F6 /2 NOT r/m8* M Valid N.E. Reverse each bit of r/m8.
    { o: o, ops: [rm8] },
    // F7 /2 NOT r/m16 M Valid Valid Reverse each bit of r/m16.
    { ops: [rm16] },
    // F7 /2 NOT r/m32 M Valid Valid Reverse each bit of r/m32.
    { ops: [rm32] },
    // REX.W + F7 /2 NOT r/m64 M Valid N.E. Reverse each bit of r/m64.
    { ops: [rm64] },
  ]
}

function tpl_bt(o_r = 0x0fa3, or_imm = 4, o_imm = 0x0fba) {
  return [
    { en: 'mr' },
    // 0F A3 /r BT r/m16, r16 MR Valid Valid Store selected bit in CF flag.
    { o: o_r, ops: [rm16, r16] },
    // 0F A3 /r BT r/m32, r32 MR Valid Valid Store selected bit in CF flag.
    { o: o_r, ops: [rm32, r32] },
    // REX.W + 0F A3 /r BT r/m64, r64 MR Valid N.E. Store selected bit in CF flag.
    { o: o_r, ops: [rm64, r64] },
    // 0F BA /4 ib BT r/m16, imm8 MI Valid Valid Store selected bit in CF flag.
    { o: o_imm, or: or_imm, ops: [rm16, imm8] },
    // 0F BA /4 ib BT r/m32, imm8 MI Valid Valid Store selected bit in CF flag.
    { o: o_imm, or: or_imm, ops: [rm32, imm8] },
    // REX.W + 0F BA /4 ib BT r/m64, imm8 MI Valid N.E. Store selected bit in CF flag.
    { o: o_imm, or: or_imm, ops: [rm64, imm8] },
  ]
}

function tpl_bsf(op = 0x0fbc) {
  return [
    { o: op },
    // 0F BC /r BSF r16, r/m16 RM Valid Valid Bit scan forward on r/m16.
    { ops: [r16, rm16] },
    // 0F BC /r BSF r32, r/m32 RM Valid Valid Bit scan forward on r/m32.
    { ops: [r32, rm32] },
    // REX.W + 0F BC /r BSF r64, r/m64 RM Valid N.E. Bit scan forward on r/m64.
    { ops: [r64, rm64] },
  ]
}

function tpl_ja(op = 0x77, op2 = 0x0f87) {
  return [
    {},
    // 77 cb JA rel8 D Valid Valid Jump short if above (CF=0 and ZF=0).
    { o: op, ops: [rel8] },
    // 0F 87 cd JA rel32 D Valid Valid Jump near if above (CF=0 and ZF=0).
    { o: op2, ops: [rel32] },
  ]
}

function tpl_cmovc(op = 0x0f42) {
  return [
    { o: op },
    // 0F 42 /r CMOVC r16, r/m16 RM Valid Valid Move if carry (CF=1).
    { ops: [r16, rm16] },
    // 0F 42 /r CMOVC r32, r/m32 RM Valid Valid Move if carry (CF=1).
    { ops: [r32, rm32] },
    // REX.W + 0F 42 /r CMOVC r64, r/m64 RM Valid N.E. Move if carry (CF=1).
    { ops: [r64, rm64] },
  ]
}

function tpl_xadd(op = 0, lock = true) {
  return [
    { o: op + 1, en: 'mr', lock: lock },
    // 0F C0 /r XADD r/m8, r8 MR Valid Valid Exchange r8 and r/m8; load sum into r/m8.
    // REX + 0F C0 /r XADD r/m8*, r8* MR Valid N.E. Exchange r8 and r/m8; load sum into r/m8.
    { o: op, ops: [rm8, r8] },
    // 0F C1 /r XADD r/m16, r16 MR Valid Valid Exchange r16 and r/m16; load sum into r/m16.
    { ops: [rm16, r16] },
    // 0F C1 /r XADD r/m32, r32 MR Valid Valid Exchange r32 and r/m32; load sum into r/m32.
    { ops: [rm32, r32] },
    // REX.W + 0F C1 /r XADD r/m64, r64 MR Valid N.E. Exchange r64 and r/m64; load sum into r/m64.
    { ops: [rm64, r64] },
  ]
}

function tpl_movs(op = 0xa4) {
  return [
    { o: op + 1 },
    // A4 MOVS m8, m8 NP Valid Valid
    { o: op, s: S.B },
    // A5 MOVS m16, m16 NP Valid Valid
    { s: S.W },
    // A5 MOVS m32, m32 NP Valid Valid
    { s: S.D },
    // REX.W + A5 MOVS m64, m64 NP Valid N.E. Move qword from address (R|E)SI to (R|E)DI.
    { s: S.Q },
  ]
}

function tpl_lss(op = 0x0fb2) {
  return [
    { o: op },
    // 0F B2 /r LSS r16,m16:16 RM Valid Valid Load SS:r16 with far pointer from memory.
    { ops: [rm16, m] },
    // 0F B2 /r LSS r32,m16:32 RM Valid Valid Load SS:r32 with far pointer from memory.
    { ops: [rm32, m] },
    // REX + 0F B2 /r LSS r64,m16:64 RM Valid N.E. Load SS:r64 with far pointer from memory.
    { ops: [rm64, m] },
  ]
}

function tpl_blsi(op = 0xf3, or = 3) {
  return [
    { o: op, or: or, en: 'vm', ext: [EXT.BMI1] },
    { vex: 'NDD.LZ.0F38.W0', ops: [r32, rm32] },
    { vex: 'NDD.LZ.0F38.W1', ops: [r64, rm64], mod: M.X64 },
  ]
}

function tpl_bndcl(op = 0xf30f1a) {
  return [
    { o: op, ext: [EXT.MPX] },
    { ops: [bnd, rm32], mod: M.X32, s: S.D },
    { ops: [bnd, rm64], mod: M.X64, s: S.Q },
  ]
}

// TODO:
// TODO: CALL - ptr16:16 vs m16:16
// TODO: test `mib` operands, that require SIB and have no SCALE and INDEX
// TODO: JMP - memory and pointer legacy references.

let _dec = tpl_not(0xfe, 1)
_dec.push({ o: 0x48, r: true, ops: [r16], mod: M.COMP | M.LEG })
_dec.push({ o: 0x48, r: true, ops: [r32], mod: M.COMP | M.LEG })

let _inc = tpl_not(0xfe, 0)
_inc.push({ o: 0x40, r: true, ops: [r16], mod: M.COMP | M.LEG })
_inc.push({ o: 0x40, r: true, ops: [r32], mod: M.COMP | M.LEG })

export const table = {
  ...t.table,
  // # A-letter
  aaa: require('./mnemonics/aaa').default,
  aad: require('./mnemonics/aad').default,
  aam: [{ mod: M.OLD }, { o: 0xd40a }, { o: 0xd4, ops: [imm8] }],
  aas: [{ o: 0x3f, mod: M.OLD }],

  addpd: [{ o: 0x660f58, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vaddpd: [
    { o: 0x58, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  // 0F 58 /r ADDPS xmm1, xmm2/m128 V/V SSE
  addps: [{ o: 0x0f58, ops: xmm_xmmm, ext: ext_sse }],
  get vaddps() {
    return lazy('avx', 'vaddps')
  },
  kandw: [
    {},
    // VEX.L1.0F.W0 41 /r KANDW k1, k2, k3 V/V AVX512F
    { o: 0x41, vex: 'L1.0F.W0', ops: [], ext: [EXT.AVX512F] },
  ],

  addsd: [{ o: 0xf20f58, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vaddsd: [{ o: 0x58, vex: 'NDS.LIG.F2.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  addss: [{ o: 0xf30f58, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vaddss: [{ o: 0x58, vex: 'NDS.LIG.F3.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  addsubpd: [{ o: 0x660fd0, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vaddsubpd: [
    { o: 0xd0, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  addsubps: [{ o: 0xf20fd0, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vaddsubps: [
    { o: 0xd0, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.F2.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.F2.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  aesdec: [{ o: 0x0f38de, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.AES] }],
  vaesdec: [{ o: 0xde, vex: 'NDS.128.66.0F38.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AES, EXT.AVX] }],

  aesdeclast: [{ o: 0x0f38df, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.AES] }],
  vaesdeclast: [{ o: 0xdf, vex: 'NDS.128.66.0F38.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AES, EXT.AVX] }],

  aesenc: [{ o: 0x0f38dc, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.AES] }],
  vaesenc: [{ o: 0xdc, vex: 'NDS.128.66.0F38.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AES, EXT.AVX] }],

  aesenclast: [{ o: 0x0f38dd, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.AES] }],
  vaesenclast: [{ o: 0xdd, vex: 'NDS.128.66.0F38.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AES, EXT.AVX] }],

  aesimc: [{ o: 0x0f38db, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.AES] }],
  vaesimc: [{ o: 0xdb, vex: '128.66.0F38.WIG', ops: [xmm, [xmm, m]], ext: [EXT.AES, EXT.AVX] }],

  aeskeygenassist: [{ o: 0x0f3adf, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.AES] }],
  vaeskeygenassist: [{ o: 0xdf, vex: '128.66.0F3A.WIG', ops: [xmm, [xmm, m], imm8], ext: [EXT.AES, EXT.AVX] }],

  andn: [
    { o: 0xf2, en: 'rvm', ext: [EXT.BMI1] },
    { vex: 'NDS.LZ.0F38.W0', ops: [r32, r32, rm32] },
    { vex: 'NDS.LZ.0F38.W1', ops: [r64, r64, rm64], mod: M.X64 },
  ],

  andpd: [{ o: 0x660f54, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vandpd: [
    { o: 0x54, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  andps: [{ o: 0x0f54, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vandps: [
    { o: 0x54, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  andnpd: [{ o: 0x660f55, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vandnpd: [
    { o: 0x55, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  andnps: [{ o: 0x0f55, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vandnps: [
    { o: 0x55, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  arpl: [{ o: 0x63, ops: [rm16, r16], mod: M.OLD }],

  // # B-letter
  blendpd: [{ o: 0x0f3a0f, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vblendpd: [
    { o: 0x0d, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F3A.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
    { vex: 'NDS.256.66.0F3A.WIG', ops: [ymm, ymm, [ymm, m], imm8] },
  ],

  bextr: [
    { o: 0xf7, en: 'rmv', ext: [EXT.BMI1] },
    { vex: 'NDS.LZ.0F38.W0', ops: [r32, rm32, r32] },
    { vex: 'NDS.LZ.0F38.W1', ops: [r64, rm64, r64], mod: M.X64 },
  ],

  blendps: [{ o: 0x0f3a0c, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vblendps: [
    { o: 0x0c, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F3A.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
    { vex: 'NDS.256.66.0F3A.WIG', ops: [ymm, ymm, [ymm, m], imm8] },
  ],

  blendvpd: [{ o: 0x0f3815, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.SSE4_1] }],
  vblendvpd: [
    { o: 0x4b, en: 'rvmr', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F3A.W0', ops: [xmm, xmm, [xmm, m], xmm] },
    { vex: 'NDS.256.66.0F3A.W0', ops: [ymm, ymm, [ymm, m], ymm] },
  ],

  blendvps: [{ o: 0x0f3814, pfx: [0x66], ops: [xmm, [xmm, m]], ext: [EXT.SSE4_1] }],
  vblendvps: [
    { o: 0x4a, en: 'rvmr', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F3A.W0', ops: [xmm, xmm, [xmm, m], xmm] },
    { vex: 'NDS.256.66.0F3A.W0', ops: [ymm, ymm, [ymm, m], ymm] },
  ],

  blsi: tpl_blsi(),
  blsmsk: tpl_blsi(0xf3, 2),
  blsr: tpl_blsi(0xf3, 1),

  bndcl: tpl_bndcl(),
  bndcu: tpl_bndcl(0xf20f1a),
  bndcn: tpl_bndcl(0xf20f1b),
  bndmk: tpl_bndcl(0xf30f1b),

  bndldx: [{ o: 0x0f1a, ops: [bnd, m], ext: [EXT.MPX] }],

  bndmov: [
    { pfx: [0x66, 0x0f], ext: [EXT.MPX] },
    { o: 0x1a, ops: [bnd, [bnd, m]], dbit: true },
    { o: 0x1b, ops: [[bnd, m], bnd], en: 'mr', dbit: true },
  ],

  bndstx: [{ o: 0x0f1b, ops: [m, bnd], en: 'mr', ext: [EXT.MPX] }],

  bound: [{ o: 0x62, mod: M.OLD }, { ops: [r16, m] }, { ops: [r32, m] }],

  bzhi: [
    { o: 0xf5, en: 'rmv', ext: [EXT.BMI2] },
    { vex: 'NDS.LZ.0F38.W0', ops: [r32, rm32, r32] },
    { vex: 'NDS.LZ.0F38.W1', ops: [r64, rm64, r64], mod: M.X64 },
  ],

  // # C-letter
  clflush: [{ o: 0x0fae, or: 7, ops: [m] }],
  clflushopt: [{ o: 0x660fae, or: 7, ops: [m] }],

  clts: [{ o: 0x0f06 }],

  cmppd: [{ o: 0x660fc2, ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE2] }],
  vcmppd: [
    { o: 0xc2, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m], imm8] },
  ],

  cmpps: [{ o: 0x0fc2, ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE] }],
  vcmpps: [
    { o: 0xc2, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG C2', ops: [xmm, xmm, [xmm, m], imm8] },
    { vex: 'NDS.256.0F.WIG C2', ops: [ymm, ymm, [ymm, m], imm8] },
  ],

  cmpsd: [{ o: 0xf20fc2, ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE2] }],
  vcmpsd: [
    { o: 0xc2, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.LIG.F2.0F.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
  ],

  cmpss: [{ o: 0xf30fc2, ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE] }],
  vcmpss: [
    { o: 0xc2, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.LIG.F3.0F.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
  ],

  comisd: [{ o: 0x660f2f, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcomisd: [{ o: 0x2f, vex: 'LIG.66.0F.WIG', ops: [xmm, [xmm, m]], ext: [EXT.AVX] }],

  comiss: [{ o: 0x0f2f, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vcomiss: [{ o: 0x2f, vex: 'LIG.0F.WIG', ops: [xmm, [xmm, m]], ext: [EXT.AVX] }],

  cvtdq2pd: [{ o: 0xf30fe6, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtdq2pd: [
    { o: 0xe6, ext: [EXT.AVX] },
    { vex: '128.F3.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F3.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtdq2ps: [{ o: 0x0f5b, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtdq2ps: [
    { o: 0x5b, ext: [EXT.AVX] },
    { vex: '128.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtpd2dq: [{ o: 0xf20fe6, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtpd2dq: [
    { o: 0xe6, ext: [EXT.AVX] },
    { vex: '128.F2.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F2.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtpd2pi: [{ o: 0x660f2d, ops: [xmm, [xmm, m]] }],

  cvtpd2ps: [{ o: 0x660f5a, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtpd2ps: [
    { o: 0x5a, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtpi2pd: [{ o: 0x660f2a, ops: [xmm, [xmm, m]] }],

  cvtpi2ps: [{ o: 0x0f2a, ops: [xmm, [xmm, m]] }],

  cvtps2dq: [{ o: 0x660f5b, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtps2dq: [
    { o: 0x5b, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtps2pd: [{ o: 0x0f5a, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtps2pd: [
    { o: 0x5a, ext: [EXT.AVX] },
    { vex: '128.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvtps2pi: [{ o: 0x0f2d, ops: [xmm, [xmm, m]] }],

  cvtsd2si: [{ o: 0xf20f2d, ops: [r32, [xmm, m]], s: S.D, ext: [EXT.SSE2] }],
  vcvtsd2si: [
    { o: 0x2d, ext: [EXT.AVX] },
    { o: 0x0f2d, pfx: [0xf2], ops: [r64, [xmm, m]], s: S.Q, ext: [EXT.SSE2], mod: M.X64 },
    { vex: 'LIG.F2.0F.W0', ops: [r32, [xmm, m]], s: S.D },
    { vex: 'LIG.F2.0F.W1', ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],

  cvtsd2ss: [{ o: 0xf20f5a, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtsd2ss: [{ o: 0x5a, vex: 'NDS.LIG.F2.0F.WIG', ops: [xmm, xmm, [xmm, m]], en: 'rvm', ext: [EXT.AVX] }],

  cvtsi2sd: [
    { o: 0x0f2a, pfx: [0xf2], ext: [EXT.SSE2] },
    { ops: [xmm, rm32], s: S.D },
    { ops: [xmm, rm64], s: S.Q },
  ],
  vcvtsi2sd: [
    { o: 0x2a, ext: [EXT.AVX], en: 'rvm' },
    { vex: 'NDS.LIG.F2.0F.W0', ops: [xmm, xmm, rm32], s: S.D },
    { vex: 'NDS.LIG.F2.0F.W1', ops: [xmm, xmm, rm64], s: S.Q },
  ],

  cvtsi2ss: [
    { o: 0x0f2a, pfx: [0xf3], ext: [EXT.SSE] },
    { ops: [xmm, rm32], s: S.D },
    { ops: [xmm, rm64], s: S.Q },
  ],
  vcvtsi2ss: [
    { o: 0x2a, ext: [EXT.AVX], en: 'rvm' },
    { vex: 'NDS.LIG.F3.0F.W0', ops: [xmm, xmm, rm32], s: S.D },
    { vex: 'NDS.LIG.F3.0F.W1', ops: [xmm, xmm, rm64], s: S.Q },
  ],

  cvtss2sd: [{ o: 0xf30f5a, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvtss2sd: [{ o: 0x5a, vex: 'NDS.LIG.F3.0F.WIG', ops: [xmm, xmm, [xmm, m]], en: 'rvm', ext: [EXT.AVX] }],

  cvtss2si: [
    { o: 0x0f2d, pfx: [0xf3], ext: [EXT.SSE] },
    { ops: [r32, [xmm, m]], s: S.D },
    { ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],
  vcvtss2si: [
    { o: 0x2d, ext: [EXT.AVX] },
    { vex: 'LIG.F3.0F.W0', ops: [r32, [xmm, m]], s: S.D },
    { vex: 'LIG.F3.0F.W1', ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],

  cvttpd2dq: [{ o: 0x660fe6, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvttpd2dq: [
    { o: 0xe6, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvttpd2pi: [{ o: 0x660f2c, ops: [xmm, [xmm, m]] }],

  cvttps2dq: [{ o: 0xf30f5b, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vcvttps2dq: [
    { o: 0x5b, ext: [EXT.AVX] },
    { vex: '128.F3.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F3.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  cvttps2pi: [{ o: 0x0f2c, ops: [xmm, [xmm, m]] }],

  cvttsd2si: [
    { o: 0x0f2c, pfx: [0xf2], ext: [EXT.SSE2] },
    { ops: [r32, [xmm, m]], s: S.D },
    { ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],
  vcvttsd2si: [
    { o: 0x2c, ext: [EXT.AVX] },
    { vex: 'LIG.F2.0F.W0', ops: [r32, [xmm, m]], s: S.D },
    { vex: 'LIG.F2.0F.W1', ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],

  cvttss2si: [
    { o: 0x0f2c, pfx: [0xf3], ext: [EXT.SSE] },
    { ops: [r32, [xmm, m]], s: S.D },
    { ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],
  vcvttss2si: [
    { o: 0x2c, ext: [EXT.AVX] },
    { vex: 'LIG.F3.0F.W0', ops: [r32, [xmm, m]], s: S.D },
    { vex: 'LIG.F3.0F.W1', ops: [r64, [xmm, m]], s: S.Q, mod: M.X64 },
  ],

  // # D-letter
  daa: [{ o: 0x27, mod: M.OLD }],
  das: [{ o: 0x2f, mod: M.OLD }],

  divpd: [{ o: 0x660f5e, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vdivpd: [
    { o: 0x5e, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  divps: [{ o: 0x0f5e, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vdivps: [
    { o: 0x5e, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  divsd: [{ o: 0xf20f5e, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vdivsd: [
    { o: 0x5e, en: 'rvm', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.LIG.F2.0F.WIG', ext: [EXT.AVX] },
    { evex: 'NDS.LIG.F2.0F.W1', ext: [EXT.AVX512F] },
  ],

  divss: [{ o: 0xf30f5e, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vdivss: [
    { o: 0x5e, en: 'rvm', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.LIG.F3.0F.WIG', ext: [EXT.AVX] },
  ],

  dppd: [{ o: 0x0f3a41, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vdppd: [{ o: 0x41, vex: 'NDS.128.66.0F3A.WIG', ops: [xmm, xmm, [xmm, m], imm8], ext: [EXT.AVX] }],

  dpps: [{ o: 0x0f3a40, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vdpps: [
    { o: 0x40, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F3A.WIG', ops: [xmm, xmm, [xmm, m], imm8] },
    { vex: 'NDS.256.66.0F3A.WIG', ops: [ymm, ymm, [ymm, m], imm8] },
  ],

  // # E-letter
  emms: [{ o: 0x0f77 }],

  extractps: [{ o: 0x0f3a17, pfx: [0x66], en: 'mr', ops: [r32, xmm, imm8], s: S.D, ext: [EXT.SSE4_1] }],
  vextractps: [{ o: 0x17, en: 'mr', vex: '128.66.0F3A.WIG', ops: [rm32, xmm, imm8], s: S.Q, ext: [EXT.AVX] }],

  // # F-letter
  f2xm1: [{ o: 0xd9f0 }],
  fabs: [{ o: 0xd9e1 }],

  fadd: [
    {},
    { o: 0xd8, or: 0, ops: [m], s: S.D },
    { o: 0xdc, or: 0, ops: [m], s: S.Q },
    { o: 0xd8, ops: [o.st(0), st] },
    { o: 0xdc, ops: [st, o.st(0)] },
  ],
  faddp: [{}, { o: 0xde, ops: [st, o.st(0)] }, { o: 0xdec1 }],
  fiadd: [{ or: 0 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.W }],

  fbld: [{ o: 0xdf, or: 4, ops: [m] }],
  fbstp: [{ o: 0xdf, or: 6, ops: [m] }],
  fchs: [{ o: 0xd9e0 }],
  fclex: [{ o: 0x9bdbe2 }],
  fnclex: [{ o: 0xdbe2 }],

  fcmovb: [{ o: 0xda, or: 0, ops: [st] }],
  fcmove: [{ o: 0xda, or: 1, ops: [st] }],
  fcmovbe: [{ o: 0xda, or: 2, ops: [st] }],
  fcmovu: [{ o: 0xda, or: 3, ops: [st] }],
  fcmovnb: [{ o: 0xdb, or: 0, ops: [st] }],
  fcmovne: [{ o: 0xdb, or: 1, ops: [st] }],
  fcmovnbe: [{ o: 0xdb, or: 2, ops: [st] }],
  fcmovnu: [{ o: 0xdb, or: 3, ops: [st] }],

  fcom: [
    { or: 2 },
    { o: 0xd8, ops: [m], s: S.D },
    { o: 0xdc, ops: [m], s: S.Q },
    { o: 0xd8, ops: [st] },
    { o: 0xd8d1 },
  ],
  fcomp: [
    { or: 3 },
    { o: 0xd8, ops: [m], s: S.D },
    { o: 0xdc, ops: [m], s: S.Q },
    { o: 0xd8, ops: [st] },
    { o: 0xd8d9 },
  ],
  fcompp: [{ o: 0xded9 }],

  fcomi: [{ o: 0xdb, or: 6, ops: [st] }],
  fcomip: [{ o: 0xdf, or: 6, ops: [st] }],
  fucomi: [{ o: 0xdb, or: 5, ops: [st] }],
  fucomip: [{ o: 0xdf, or: 5, ops: [st] }],

  fcos: [{ o: 0xd9ff }],
  fdecstp: [{ o: 0xd9f6 }],

  fdiv: [
    {},
    { o: 0xd8, or: 6, ops: [m], s: S.D },
    { o: 0xdc, or: 6, ops: [m], s: S.Q },
    { o: 0xd8, i: 0xf0, ops: [o.st(0), st] },
    { o: 0xdc, i: 0xf8, ops: [st, o.st(0)] },
  ],
  fdivp: [{}, { o: 0xde, i: 0xf8, ops: [st, o.st(0)] }, { o: 0xdef9 }],
  fidiv: [{ or: 6 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.W }],

  fdivr: [
    {},
    { o: 0xd8, or: 7, ops: [m], s: S.D },
    { o: 0xdc, or: 7, ops: [m], s: S.Q },
    { o: 0xd8, i: 0xf8, ops: [o.st(0), st] },
    { o: 0xdc, i: 0xf0, ops: [st, o.st(0)] },
  ],
  fdivrp: [{ o: 0xde }, { i: 0xf0, ops: [st, o.st(0)] }, { i: 0xf1 }],
  fidivr: [{ or: 7 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.W }],

  ffree: [{ o: 0xdd, i: 0xc0, ops: [st] }],

  ficom: [{ or: 2 }, { o: 0xde, ops: [m], s: S.W }, { o: 0xda, ops: [m], s: S.D }],
  ficomp: [{ or: 3 }, { o: 0xde, ops: [m], s: S.W }, { o: 0xda, ops: [m], s: S.D }],

  fild: [
    {},
    { o: 0xdf, or: 0, ops: [m], s: S.W },
    { o: 0xdb, or: 0, ops: [m], s: S.D },
    { o: 0xdf, or: 5, ops: [m], s: S.Q },
  ],

  fincstp: [{ o: 0xd9f7 }],
  finit: [{ o: 0x9bdbe3 }],
  fninit: [{ o: 0xdbe3 }],

  fist: [
    { or: 2, ops: [m] },
    { o: 0xdf, s: S.W },
    { o: 0xdb, s: S.D },
  ],
  fistp: [{ ops: [m] }, { o: 0xdf, or: 3, s: S.W }, { o: 0xdb, or: 3, s: S.D }, { o: 0xdf, or: 7, s: S.Q }],

  fisttp: [
    { or: 1, ops: [m] },
    { o: 0xdf, s: S.W },
    { o: 0xdb, s: S.D },
    { o: 0xdd, s: S.Q },
  ],

  fld: [
    {},
    { o: 0xd9, or: 0, ops: [m], s: S.D },
    { o: 0xdd, or: 0, ops: [m], s: S.Q },
    { o: 0xdb, or: 5, ops: [m], s: S.T },
    { o: 0xd9, i: 0xc0, ops: [st] },
  ],

  fld1: [{ o: 0xd9e8 }],
  fldl2t: [{ o: 0xd9e9 }],
  fldl2e: [{ o: 0xd9ea }],
  fldpi: [{ o: 0xd9eb }],
  fldlg2: [{ o: 0xd9ec }],
  fldln2: [{ o: 0xd9ed }],
  fldz: [{ o: 0xd9ee }],

  fldcw: [{ o: 0xd9, or: 5, ops: [m], s: S.W }],

  fldenv: [{ o: 0xd9, or: 4, ops: [m] }], // TODO: Size? What is `m14/28byte`

  fmul: [
    {},
    { o: 0xd8, or: 1, ops: [m], s: S.D },
    { o: 0xdc, or: 1, ops: [m], s: S.Q },
    { o: 0xd8, i: 0xc8, ops: [o.st(0), st] },
    { o: 0xdc, i: 0xc8, ops: [st, o.st(0)] },
  ],
  fmulp: [{}, { o: 0xde, i: 0xc8, ops: [st, o.st(0)] }, { o: 0xdec9 }],
  fimul: [{ or: 1 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.Q }],

  fnop: [{ o: 0xd9d0 }],
  fpatan: [{ o: 0xd9f3 }],
  fprem: [{ o: 0xd9f8 }],
  fprem1: [{ o: 0xd9f5 }],
  fptan: [{ o: 0xd9f2 }],
  frndint: [{ o: 0xd9fc }],

  frstor: [{ o: 0xdd, or: 4, ops: [m] }], // TODO: m94/108byte ?

  fsave: [{ o: 0x9bdd, or: 6, ops: [m] }],
  fnsave: [{ o: 0xdd, or: 6, ops: [m] }],

  fscale: [{ o: 0xd9fd }],
  fsin: [{ o: 0xd9fe }],
  fsincos: [{ o: 0xd9fb }],
  fsqrt: [{ o: 0xd9fa }],

  fst: [
    {},
    { o: 0xd9, or: 2, ops: [m], s: S.D },
    { o: 0xdd, or: 2, ops: [m], s: S.Q },
    { o: 0xdd, i: 0xd0, ops: [st] },
  ],
  fstp: [
    {},
    { o: 0xd9, or: 3, ops: [m], s: S.D },
    { o: 0xdd, or: 3, ops: [m], s: S.Q },
    { o: 0xdb, or: 7, ops: [m], s: S.T },
    { o: 0xdd, i: 0xd8, ops: [st] },
  ],

  fstcw: [{ o: 0x9bd9, or: 7, ops: [m], s: S.W }],
  fnstcw: [{ o: 0xd9, or: 7, ops: [m], s: S.W }],

  fstenv: [{ o: 0x9bd9, or: 6, ops: [m] }],
  fnstenv: [{ o: 0xd9, or: 6, ops: [m] }],

  fstsw: [{}, { o: 0x9bdd, or: 7, ops: [m], s: S.W }, { o: 0x9bdfe0, mr: false, ops: [o.ax] }],
  fnstsw: [{}, { o: 0xdd, or: 7, ops: [m], s: S.W }, { o: 0xdfe0, mr: false, ops: [o.ax] }],

  fsub: [
    {},
    { o: 0xd8, or: 4, ops: [m], s: S.D },
    { o: 0xdc, or: 4, ops: [m], s: S.Q },
    { o: 0xd8, i: 0xe0, ops: [o.st(0), st] },
    { o: 0xdc, i: 0xe8, ops: [st, o.st(0)] },
  ],
  fsubp: [{}, { o: 0xde, i: 0xe8, ops: [st, o.st(0)] }, { o: 0xdee9 }],
  fisub: [{ or: 4 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.W }],

  fsubr: [
    {},
    { o: 0xd8, or: 5, ops: [m], s: S.D },
    { o: 0xdc, or: 5, ops: [m], s: S.Q },
    { o: 0xd8, i: 0xe8, ops: [o.st(0), st] },
    { o: 0xdc, i: 0xe0, ops: [st, o.st(0)] },
  ],
  fsubrp: [{}, { o: 0xde, i: 0xe0, ops: [st, o.st(0)] }, { o: 0xdee1 }],
  fisubr: [{ or: 5 }, { o: 0xda, ops: [m], s: S.D }, { o: 0xde, ops: [m], s: S.W }],

  ftst: [{ o: 0xd9e4 }],

  fucom: [{ o: 0xdd, i: 0xe0, ops: [st] }],
  fucomp: [{ o: 0xdd, i: 0xe8, ops: [st] }],
  fucompp: [{ o: 0xdae9 }],

  fxam: [{ o: 0xd9e5 }],

  fxch: [{ o: 0xd9, i: 0xc8, ops: [st] }],

  fxrstor: [{ o: 0x0fae, or: 1, ops: [m], s: 512 }],
  fxrstor64: [{ o: 0x0fae, or: 1, ops: [m], s: 512, mod: M.X64 }],

  fxsave: [{ o: 0x0fae, or: 0, ops: [m], s: 512 }],
  fxsave64: [{ o: 0x0fae, or: 0, ops: [m], s: 512, mod: M.X64 }],

  fxtract: [{ o: 0xd9f4 }],
  fyl2x: [{ o: 0xd9f1 }],
  fyl2xp1: [{ o: 0xd9f9 }],

  // # H-letter
  haddpd: [{ o: 0x660f7c, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vhaddpd: [
    { o: 0x7c, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  haddps: [{ o: 0xf20f7c, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vhaddps: [
    { o: 0x7c, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.F2.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.F2.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  hlt: [{ o: 0xf4 }],

  hsubpd: [{ o: 0x660f7d, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vhsubpd: [
    { o: 0x7d, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  hsubps: [{ o: 0xf20f7d, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vhsubps: [
    { o: 0x7d, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.F2.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.F2.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  // # I-letter
  insertps: [{ o: 0x0f3a21, pfx: [0x66], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vinsertps: [{ o: 0x21, vex: 'NDS.128.66.0F3A.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m], imm8], ext: [EXT.AVX] }],

  invd: [{ o: 0x0f08 }],

  invlpg: [{ o: 0x0f01, or: 7, ops: [m] }],

  invpcid: [
    { o: 0x3882, pfx: [0x66, 0x0f], ext: [EXT.INVPCID] },
    { ops: [r32, m], mod: M.X32 },
    { ops: [r64, m], mod: M.X64 },
  ],

  // # J-letter

  // # L-letter
  lahf: [{ o: 0x9f, mod: M.COMP | M.LEG }],

  lar: [{ o: 0x0f02 }, { ops: [r16, rm16] }, { ops: [r, rm32] }],

  lddqu: [{ o: 0xf20ff0, ops: [xmm, m], ext: [EXT.SSE3] }],
  vlddqu: [
    { o: 0xf0, ext: [EXT.AVX] },
    { vex: '128.F2.0F.WIG', ops: [xmm, m] },
    { vex: '256.F2.0F.WIG', ops: [ymm, m] },
  ],

  ldmxcsr: [{ o: 0x0fae, or: 2, ops: [m], s: S.D, ext: ext_sse }],
  vldmxcsr: [{ o: 0xae, or: 2, vex: 'VEX.LZ.0F.WIG', ops: [m], ext: ext_avx }],

  lfence: [{ o: 0x0faee8 }],

  lgdt: [
    { o: 0x0f01, or: 2 }, // TODO: Fix memory sizes.
    { ops: [m] },
  ],
  lidt: [{ o: 0x0f01, or: 3 }, { ops: [m] }],

  lldt: [{ o: 0x0f00, or: 2, ops: [rm16] }],
  lmsw: [{ o: 0x0f01, or: 6, ops: [rm16] }],

  lock: [{ o: 0xf0 }],

  lsl: [{ o: 0x0f03 }, { ops: [r16, rm16] }, { ops: [r32, rm32] }, { ops: [r64, rm32], s: S.Q }],

  ltr: [{ o: 0x0f00, or: 3, ops: [rm16] }],

  lzcnt: [
    { o: 0x0fbd, pfx: [0xf3], ext: [EXT.LZCNT] },
    { ops: [r16, rm16] },
    { ops: [r32, rm32] },
    { ops: [r64, rm64] },
  ],

  // # M-letter
  maskmovdqu: [{ o: 0x660ff7, ops: [xmm, xmm], ext: [EXT.SSE2] }],
  vmaskmovdqu: [{ o: 0xf7, vex: '128.66.0F.WIG', ops: [xmm, xmm], ext: [EXT.AVX] }],
  maskmovq: [{ o: 0x0ff7, ops: [mm, mm] }],

  maxpd: [{ o: 0x660f5f, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vmaxpd: [
    { o: 0x5f, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  maxps: [{ o: 0x0f5f, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vmaxps: [
    { o: 0x5f, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  maxsd: [{ o: 0xf20f5f, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vmaxsd: [{ o: 0x5f, vex: 'NDS.LIG.F2.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  maxss: [{ o: 0xf30f5f, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vmaxss: [{ o: 0x5f, vex: 'NDS.LIG.F3.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  mfence: [{ o: 0x0faef0 }],

  minpd: [{ o: 0x660f5d, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vminpd: [
    { o: 0x5d, ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.66.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  minps: [{ o: 0x0f5d, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vminps: [
    { o: 0x5d, ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  minsd: [{ o: 0xf20f5d, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }],
  vminsd: [{ o: 0x5d, vex: 'NDS.LIG.F2.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  minss: [{ o: 0xf30f5d, ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vminss: [{ o: 0x5d, vex: 'NDS.LIG.F3.0F.WIG', en: 'rvm', ops: [xmm, xmm, [xmm, m]], ext: [EXT.AVX] }],

  monitor: [{ o: 0x0f01c8 }],

  movapd: [
    { pfx: [0x66, 0x0f], ext: [EXT.SSE2] },
    { o: 0x28, ops: [xmm, [xmm, m]], dbit: true },
    { o: 0x29, ops: [[xmm, m], xmm], dbit: true, en: 'mr' },
  ],
  vmovapd: [
    { ext: [EXT.AVX] },
    { o: 0x28, vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]], dbit: true },
    { o: 0x29, vex: '128.66.0F.WIG', ops: [[xmm, m], xmm], dbit: true, en: 'mr' },
    { o: 0x28, vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]], dbit: true },
    { o: 0x29, vex: '256.66.0F.WIG', ops: [[ymm, m], ymm], dbit: true, en: 'mr' },
  ],

  movaps: [
    { pfx: [0x0f], ext: [EXT.SSE] },
    { o: 0x28, ops: [xmm, [xmm, m]], dbit: true },
    { o: 0x29, ops: [[xmm, m], xmm], dbit: true, en: 'mr' },
  ],
  vmovaps: [
    { ext: [EXT.AVX] },
    { o: 0x28, vex: '128.0F.WIG', ops: [xmm, [xmm, m]], dbit: true },
    { o: 0x29, vex: '128.0F.WIG', ops: [[xmm, m], xmm], dbit: true, en: 'mr' },
    { o: 0x28, vex: '256.0F.WIG', ops: [ymm, [ymm, m]], dbit: true },
    { o: 0x29, vex: '256.0F.WIG', ops: [[ymm, m], ymm], dbit: true, en: 'mr' },
  ],

  movd: [
    {},
    // 0F 6E /r MOVD mm, r/m32 RM V/V MMX Move doubleword from r/m32 to mm.
    { o: 0x0f6e, ops: [mm, rm32], s: S.D, ext: [EXT.MMX] },
    // 0F 7E /r MOVD r/m32, mm MR V/V MMX Move doubleword from mm to r/m32.
    { o: 0x0f7e, ops: [rm32, mm], s: S.D, ext: [EXT.MMX] },
    // 66 0F 6E /r MOVD xmm, r/m32 RM V/V SSE2 Move doubleword from r/m32 to xmm.
    { o: 0x0f6e, pfx: [0x66], ops: [xmm, rm32], s: S.D, ext: [EXT.SSE2] },
    // 66 0F 7E /r MOVD r/m32, xmm MR V/V SSE2 Move doubleword from xmm register to r/m32.
    { o: 0x0f7e, pfx: [0x66], ops: [rm32, xmm], s: S.D, ext: [EXT.SSE2] },
  ],
  vmovd: [
    { ext: [EXT.AVX] },
    // VEX.128.66.0F.W0 6E / VMOVD xmm1, r32/m32 RM V/V AVX Move doubleword from r/m32 to xmm1.
    { o: 0x6e, vex: '128.66.0F.W0', ops: [xmm, rm32], s: S.D },
    // VEX.128.66.0F.W0 7E /r VMOVD r32/m32, xmm1 MR V/V AVX Move doubleword from xmm1 register to r/m32.
    { o: 0x7e, vex: '128.66.0F.W0', ops: [rm32, xmm], s: S.D },
  ],
  movq: [
    { mod: M.X64 },
    // REX.W + 0F 6E /r MOVQ mm, r/m64 RM V/N.E. MMX Move quadword from r/m64 to mm.
    { o: 0x0f6e, ops: [mm, rm64], s: S.Q, ext: [EXT.MMX] },
    // REX.W + 0F 7E /r MOVQ r/m64, mm MR V/N.E. MMX Move quadword from mm to r/m64.
    { o: 0x0f7e, ops: [rm64, mm], s: S.Q, ext: [EXT.MMX] },
    // 66 REX.W 0F 6E /r MOVQ xmm, r/m64 RM V/N.E. SSE2 Move quadword from r/m64 to xmm.
    { o: 0x0f6e, pfx: [0x66], ops: [xmm, rm64], s: S.Q, ext: [EXT.SSE2] },
    // 66 REX.W 0F 7E /r MOVQ r/m64, xmm MR V/N.E. SSE2 Move quadword from xmm register to r/m64.
    { o: 0x0f7e, pfx: [0x66], ops: [rm64, xmm], s: S.Q, ext: [EXT.SSE2] },

    // MOVQ—Move Quadword
    // 0F 6F /r MOVQ mm, mm/m64 RM V/V MMX Move quadword from mm/m64 to mm.
    { o: 0x0f6f, ops: [mm, [mm, m64]], s: S.Q, ext: ext_mmx },
    // 0F 7F /r MOVQ mm/m64, mm MR V/V MMX Move quadword from mm to mm/m64.
    { o: 0x0f7f, ops: [[mm, m64], mm], s: S.Q, en: 'mr', ext: ext_mmx },
    // F3 0F 7E /r MOVQ xmm1, xmm2/m64 RM V/V SSE2 Move quadword from xmm2/mem64 to xmm1.
    { o: 0xf30f7e, ops: [xmm, [xmm, m64]], s: S.Q, ext: ext_sse2 },
    // 66 0F D6 /r MOVQ xmm2/m64, xmm1 MR V/V SSE2 Move quadword from xmm1 to xmm2/mem64.
    { o: 0x660fd6, ops: [[xmm, m64], xmm], s: S.Q, en: 'mr', ext: ext_sse2 },
  ],
  vmovq: [
    { mod: M.X64, ext: [EXT.AVX] },
    // VEX.128.66.0F.W1 6E /r VMOVQ xmm1, r64/m64 RM V/N.E. AVX Move quadword from r/m64 to xmm1.
    { o: 0x6e, vex: '128.66.0F.W1', ops: [xmm, rm64], s: S.Q },
    // VEX.128.66.0F.W1 7E /r VMOVQ r64/m64, xmm1 MR V/N.E. AVX Move quadword from xmm1 register to r/m64.
    { o: 0x7e, vex: '128.66.0F.W1', ops: [rm64, xmm], s: S.Q, en: 'mr' },
    // VEX.128.F3.0F.WIG 7E /r VMOVQ xmm1, xmm2 RM V/V AVX Move quadword from xmm2 to xmm1.
    { o: 0x7e, vex: '128.F3.0F.WIG', ops: [xmm, xmm] },
    // VEX.128.F3.0F.WIG 7E /r VMOVQ xmm1, m64 RM V/V AVX Load quadword from m64 to xmm1.
    { o: 0x7e, vex: '128.F3.0F.WIG', ops: [xmm, m64], s: S.Q },
    // VEX.128.66.0F.WIG D6 /r VMOVQ xmm1/m64, xmm2 MR V/V AVX Move quadword from
    { o: 0xd6, vex: '128.66.0F.WIG', ops: [[xmm, m64], xmm], s: S.Q, en: 'mr' },
  ],

  movddup: [{ o: 0xf20f12, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vmovddup: [
    { o: 0x12, ext: [EXT.AVX] },
    { vex: '128.F2.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F2.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  movdqa: [
    { pfx: [0x66, 0x0f], ext: [EXT.SSE2] },
    { o: 0x6f, ops: [xmm, [xmm, m]] },
    { o: 0x7f, ops: [[xmm, m], xmm], en: 'mr' },
  ],
  vmovdqa: [
    { ext: [EXT.AVX] },
    { o: 0x6f, vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]] },
    { o: 0x7f, vex: '128.66.0F.WIG', ops: [[xmm, m], xmm], en: 'mr' },
    { o: 0x6f, vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]] },
    { o: 0x7f, vex: '256.66.0F.WIG', ops: [[ymm, m], ymm], en: 'mr' },
  ],

  movdqu: [
    { pfx: [0xf3, 0x0f], ext: [EXT.SSE2] },
    { o: 0x6f, ops: [xmm, [xmm, m]] },
    { o: 0x7f, ops: [[xmm, m], xmm], en: 'mr' },
  ],
  vmovdqu: [
    { ext: [EXT.AVX] },
    { o: 0x6f, vex: '128.F3.0F.WIG', ops: [xmm, [xmm, m]] },
    { o: 0x7f, vex: '128.F3.0F.WIG', ops: [[xmm, m], xmm], en: 'mr' },
    { o: 0x6f, vex: '256.F3.0F.WIG', ops: [ymm, [ymm, m]] },
    { o: 0x7f, vex: '256.F3.0F.WIG', ops: [[ymm, m], ymm], en: 'mr' },
  ],

  movdq2q: [{ o: 0xf20fd6, ops: [mm, xmm] }],

  movhlps: [{ o: 0x0f12, ops: [xmm, xmm], ext: [EXT.SSE] }],
  vmovhlps: [{ o: 0x12, vex: 'NDS.128.0F.WIG', en: 'rvm', ops: [xmm, xmm, xmm], ext: [EXT.AVX] }],

  movhpd: [
    { pfx: [0x66, 0x0f], ext: [EXT.SSE2] },
    { o: 0x16, ops: [xmm, m64], dbit: true },
    { o: 0x17, ops: [m64, xmm], dbit: true, en: 'mr' },
  ],
  vmovhpd: [
    { ext: [EXT.AVX] },
    { o: 0x16, vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, m64], en: 'rvm' },
    { o: 0x17, vex: '128.66.0F.WIG', ops: [m64, xmm], en: 'mr' },
  ],

  movhps: [
    { pfx: [0x0f], ext: [EXT.SSE] },
    { o: 0x16, ops: [xmm, m64], dbit: true },
    { o: 0x17, ops: [m64, xmm], dbit: true, en: 'mr' },
  ],
  vmovhps: [
    { ext: [EXT.AVX] },
    { o: 0x16, vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, m64], en: 'rvm' },
    { o: 0x17, vex: '128.0F.WIG', ops: [m64, xmm], en: 'mr' },
  ],

  movlhps: [{ o: 0x0f16, ops: [xmm, xmm], ext: [EXT.SSE] }],
  vmovlhps: [{ o: 0x16, vex: 'NDS.128.0F.WIG', en: 'rvm', ops: [xmm, xmm, xmm], ext: [EXT.AVX] }],

  movlpd: [
    { pfx: [0x66, 0x0f], ext: [EXT.SSE2] },
    { o: 0x12, ops: [xmm, m64], dbit: true },
    { o: 0x13, ops: [m64, xmm], dbit: true, en: 'mr' },
  ],
  vmovlpd: [
    { ext: [EXT.AVX] },
    { o: 0x12, vex: 'NDS.128.66.0F.WIG', ops: [xmm, xmm, m64], en: 'rvm' },
    { o: 0x13, vex: '128.66.0F.WIG', ops: [m64, xmm], en: 'mr' },
  ],

  movlps: [
    { pfx: [0x0f], ext: [EXT.SSE] },
    { o: 0x12, ops: [xmm, m64], dbit: true },
    { o: 0x13, ops: [m64, xmm], dbit: true, en: 'mr' },
  ],
  vmovlps: [
    { ext: [EXT.AVX] },
    { o: 0x12, vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, m64], en: 'rvm' },
    { o: 0x13, vex: '128.0F.WIG', ops: [m64, xmm], en: 'mr' },
  ],

  movmskpd: [{ o: 0x660f50, ops: [r, xmm], ext: [EXT.SSE2] }],
  vmovmskpd: [
    { o: 0x50, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', ops: [r, xmm] },
    { vex: '256.66.0F.WIG', ops: [r, ymm] },
  ],

  movmskps: [{ o: 0x0f50, ops: [r, xmm], ext: [EXT.SSE] }],
  vmovmskps: [
    { o: 0x50, ext: [EXT.AVX] },
    { vex: '128.0F.WIG', ops: [r, xmm] },
    { vex: '256.0F.WIG', ops: [r, ymm] },
  ],

  movntdqa: [{ o: 0x382a, pfx: [0x66, 0x0f], ops: [xmm, m], ext: [EXT.SSE4_1] }],
  vmovntdqa: [
    { o: 0x2a },
    { vex: '128.66.0F38.WIG', ops: [xmm, m], ext: [EXT.AVX] },
    { vex: '256.66.0F38.WIG', ops: [ymm, m], ext: [EXT.AVX2] },
  ],

  movntdq: [{ o: 0xe7, pfx: [0x66, 0x0f], en: 'mr', ops: [m128, xmm], ext: [EXT.SSE2] }],
  vmovntdq: [
    { o: 0xe7, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', en: 'mr', ops: [m, xmm] },
    { vex: '256.66.0F.WIG', en: 'mr', ops: [m, ymm] },
  ],

  movnti: [{ o: 0x0fc3, en: 'mr' }, { ops: [m32, r32] }, { ops: [m64, r64] }],

  movntpd: [{ o: 0x2b, pfx: [0x66, 0x0f], en: 'mr', ops: [m128, xmm], ext: [EXT.SSE2] }],
  vmovntpd: [
    { o: 0x2b, ext: [EXT.AVX] },
    { vex: '128.66.0F.WIG', en: 'mr', ops: [m, xmm] },
    { vex: '256.66.0F.WIG', en: 'mr', ops: [m, ymm] },
  ],

  movntps: [{ o: 0x2b, pfx: [0x0f], en: 'mr', ops: [m, xmm], ext: [EXT.SSE] }],
  vmovntps: [
    { o: 0x2b, en: 'mr', ext: [EXT.AVX] },
    { vex: '128.0F.WIG', ops: [m, xmm] },
    { vex: '256.0F.WIG', ops: [m, ymm] },
  ],

  movntq: [{ o: 0x0fe7, ops: [m64, mm], en: 'mr' }],
  movq2dq: [{ o: 0xf30fd6, ops: [xmm, mm] }],

  movsd: [
    { pfx: [0xf2, 0x0f], ext: [EXT.SSE2] },
    { o: 0x10, ops: [xmm, [xmm, m64]], dbit: true },
    { o: 0x11, ops: [[xmm, m64], xmm], dbit: true, en: 'mr' },
  ],
  vmovsd: [
    { ext: [EXT.AVX] },
    { o: 0x10, vex: 'NDS.LIG.F2.0F.WIG', ops: [xmm, xmm, xmm], en: 'rvm' },
    { o: 0x10, vex: 'LIG.F2.0F.WIG', ops: [xmm, m64], en: 'rm' },
    { o: 0x11, vex: 'NDS.LIG.F2.0F.WIG', ops: [xmm, xmm, xmm], en: 'mvr' },
    { o: 0x11, vex: 'LIG.F2.0F.WIG', ops: [m64, xmm], en: 'mr' },
  ],

  movshdup: [{ o: 0xf30f16, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vmovshdup: [
    { o: 0x16, ext: [EXT.AVX] },
    { vex: '128.F3.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F3.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  movsldup: [{ o: 0xf30f12, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }],
  vmovsldup: [
    { o: 0x12, ext: [EXT.AVX] },
    { vex: '128.F3.0F.WIG', ops: [xmm, [xmm, m]] },
    { vex: '256.F3.0F.WIG', ops: [ymm, [ymm, m]] },
  ],

  movss: [{ ext: [EXT.SSE] }, { o: 0xf30f10, ops: [xmm, [xmm, m]] }, { o: 0xf30f11, ops: [[xmm, m], xmm], en: 'mr' }],
  vmovss: [
    { ext: [EXT.AVX] },
    { o: 0x10, vex: 'NDS.LIG.F3.0F.WIG', ops: [xmm, xmm, xmm], en: 'rvm' },
    { o: 0x10, vex: 'LIG.F3.0F.WIG', ops: [xmm, m] },
    { o: 0x11, vex: 'NDS.LIG.F3.0F.WIG', ops: [xmm, xmm, xmm], en: 'mvr' },
    { o: 0x11, vex: 'LIG.F3.0F.WIG', ops: [m, xmm], en: 'mr' },
  ],

  movupd: [{ ext: [EXT.SSE2] }, { o: 0x660f10, ops: [xmm, [xmm, m]] }, { o: 0x660f11, ops: [[xmm, m], xmm], en: 'mr' }],
  vmovupd: [
    { ext: [EXT.AVX] },
    { o: 0x10, vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]] },
    { o: 0x10, vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]] },
    { o: 0x11, vex: '128.66.0F.WIG', ops: [xmm, [xmm, m]], en: 'mr' },
    { o: 0x11, vex: '256.66.0F.WIG', ops: [ymm, [ymm, m]], en: 'mr' },
  ],

  movups: [{ ext: [EXT.SSE] }, { o: 0x0f10, ops: [xmm, [xmm, m]] }, { o: 0x0f11, ops: [[xmm, m], xmm], en: 'mr' }],
  vmovups: [
    { ext: [EXT.AVX] },
    { o: 0x10, vex: '128.0F.WIG', ops: [xmm, [xmm, m]] },
    { o: 0x10, vex: '256.0F.WIG', ops: [ymm, [ymm, m]] },
    { o: 0x11, vex: '128.0F.WIG', ops: [xmm, [xmm, m]], en: 'mr' },
    { o: 0x11, vex: '256.0F.WIG', ops: [ymm, [ymm, m]], en: 'mr' },
  ],

  mpsadbw: [{ o: 0x42, pfx: [0x66, 0x0f, 0x3a], ops: [xmm, [xmm, m], imm8], ext: [EXT.SSE4_1] }],
  vmpsadbw: [
    { o: 0x42, en: 'rvm' },
    { ops: [xmm, xmm, [xmm, m], imm8], ext: [EXT.AVX] },
    { ops: [ymm, ymm, [ymm, m], imm8], ext: [EXT.AVX2] },
  ],

  mulps: [{ o: 0x59, pfx: [0x0f], ops: [xmm, [xmm, m]], ext: [EXT.SSE] }],
  vmulps: [
    { o: 0x59, ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: [xmm, xmm, [xmm, m]] },
    { vex: 'NDS.256.0F.WIG', ops: [ymm, ymm, [ymm, m]] },
  ],

  mulsd: [{ o: 0x59, pfx: [0xf2, 0x0f], ops: xmm_xmmm, ext: [EXT.SSE2] }],
  vmulsd: [{ o: 0x59, vex: 'NDS.LIG.F2.0F.WIG', ops: xmm_xmm_xmmm, en: 'rvm', ext: [EXT.AVX] }],

  mulss: [{ o: 0x59, pfx: [0xf3, 0x0f], ops: xmm_xmmm, ext: [EXT.SSE] }],
  vmulss: [{ o: 0x59, vex: 'NDS.LIG.F3.0F.WIG', ops: xmm_xmm_xmmm, en: 'rvm', ext: [EXT.AVX] }],

  mulx: [
    { o: 0xf6, en: 'rvm', ext: [EXT.BMI2] },
    { vex: 'NDD.LZ.F2.0F38.W0', ops: [r32, r32, rm32] },
    { vex: 'NDD.LZ.F2.0F38.W1', ops: [r64, r64, rm64] },
  ],

  mwait: [{ o: 0x0f01c9 }],

  // # O-letter
  orpd: [{ o: 0x56, pfx: [0x66, 0x0f], ops: xmm_xmmm, ext: [EXT.SSE2] }],
  vorpd: [
    { o: 0x56, ext: [EXT.AVX] },
    { vex: 'NDS.128.66.0F.WIG', ops: xmm_xmm_xmmm },
    { vex: 'NDS.256.66.0F.WIG', ops: ymm_ymm_ymmm },
  ],

  orps: [{ o: 0x56, pfx: [0x0f], ops: xmm_xmmm, ext: [EXT.SSE] }],
  vorps: [
    { o: 0x56, en: 'rvm', ext: [EXT.AVX] },
    { vex: 'NDS.128.0F.WIG', ops: xmm_xmm_xmmm },
    { vex: 'NDS.256.0F.WIG', ops: ymm_ymm_ymmm },
  ],

  // # P-letter
  pabsb: [
    { o: 0x1c, ext: [EXT.SSSE3] },
    { pfx: [0x0f, 0x38], ops: [mm, [mm, m]] },
    { pfx: [0x66, 0x0f, 0x38], ops: xmm_xmmm },
  ],
  vpabsb: [
    { o: 0x1c },
    { vex: '128.66.0F38.WIG', ops: xmm_xmmm, ext: [EXT.AVX] },
    { vex: '256.66.0F38.WIG', ops: ymm_ymmm, ext: [EXT.AVX2] },
  ],
  pabsw: [
    { o: 0x1d, ext: [EXT.SSSE3] },
    { pfx: [0x0f, 0x38], ops: [mm, [mm, m]] },
    { pfx: [0x66, 0x0f, 0x38], ops: xmm_xmmm },
  ],
  vpabsw: [
    { o: 0x1d },
    { vex: '128.66.0F38.WIG', ops: xmm_xmmm, ext: ext_avx },
    { vex: '256.66.0F38.WIG', ops: ymm_ymmm, ext: ext_avx2 },
  ],
  pabsd: [
    { o: 0x1e, ext: [EXT.SSSE3] },
    { pfx: [0x0f, 0x38], ops: [mm, [mm, m]] },
    { pfx: [0x66, 0x0f, 0x38], ops: xmm_xmmm },
  ],
  vpabsd: [
    { o: 0x1e },
    { vex: '128.66.0F38.WIG', ops: xmm_xmmm, ext: ext_avx },
    { vex: '256.66.0F38.WIG', ops: ymm_ymmm, ext: ext_avx2 },
  ],

  packsswb: [
    { o: 0x63 },
    { pfx: [0x0f], ops: [mm, [mm, m]], ext: ext_mmx },
    { pfx: [0x66, 0x0f], ops: xmm_xmmm, ext: ext_sse2 },
  ],
  vpacksswb: [
    { o: 0x63 },
    { vex: 'NDS.128.66.0F.WIG', ops: xmm_xmm_xmmm, ext: ext_avx },
    { vex: 'NDS.256.66.0F.WIG', ops: ymm_ymm_ymmm, ext: ext_avx2 },
  ],
  packssdw: [
    { o: 0x6b, en: rvm },
    { pfx: [0x0f], ops: [mm, [mm, m]], ext: ext_mmx },
    { pfx: [0x66, 0x0f], ops: xmm_xmmm, ext: ext_sse2 },
  ],
  vpackssdw: [
    { o: 0x6b, en: rvm },
    { vex: 'NDS.128.66.0F.WIG', ops: xmm_xmm_xmmm, ext: ext_avx },
    { vex: 'NDS.256.66.0F.WIG', ops: ymm_ymm_ymmm, ext: ext_avx2 },
  ],

  packusdw: [{ o: 0x2b, pfx: [0x66, 0x0f, 0x38], ops: xmm_xmmm, ext: [EXT.SSE4_1] }],
  vpackusdw: [
    { o: 0x2b, en: rvm },
    { vex: 'NDS.128.66.0F38.WIG', ops: xmm_xmm_xmmm, ext: ext_avx },
    { vex: 'NDS.256.66.0F38.WIG', ops: ymm_ymm_ymmm, ext: ext_avx2 },
  ],

  pause: [{ o: 0xf390 }],

  // ## Data Transfer
  // MOV Move data between general-purpose registers
  mov: [
    {},
    // 88 /r MOV r/m8,r8 MR Valid Valid Move r8 to r/m8.
    // REX + 88 /r MOV r/m8***,r8*** MR Valid N.E. Move r8 to r/m8.
    { o: 0x88, ops: [rm8, r8], en: 'mr', dbit: true },
    // 8A /r MOV r8,r/m8 RM Valid Valid Move r/m8 to r8.
    // REX + 8A /r MOV r8***,r/m8*** RM Valid N.E. Move r/m8 to r8.
    { o: 0x8a, ops: [r8, rm8], dbit: true },
    // 89 /r MOV r/m16,r16 MR Valid Valid Move r16 to r/m16.
    { o: 0x89, ops: [rm16, r16], en: 'mr', dbit: true },
    // 8B /r MOV r16,r/m16 RM Valid Valid Move r/m16 to r16.
    { o: 0x8b, ops: [r16, rm16], dbit: true },
    // 89 /r MOV r/m32,r32 MR Valid Valid Move r32 to r/m32.
    { o: 0x89, ops: [rm32, r32], en: 'mr', dbit: true },
    // 8B /r MOV r32,r/m32 RM Valid Valid Move r/m32 to r32.
    { o: 0x8b, ops: [r32, rm32], dbit: true },
    // REX.W + 89 /r MOV r/m64,r64 MR Valid N.E. Move r64 to r/m64.
    { o: 0x89, ops: [rm64, r64], en: 'mr', dbit: true },
    // REX.W + 8B /r MOV r64,r/m64 RM Valid N.E. Move r/m64 to r64.
    { o: 0x8b, ops: [r64, rm64], dbit: true },

    // 8C /r MOV r/m16,Sreg** MR Valid Valid Move segment register to r/m16.
    { o: 0x8c, ops: [rm16, sreg], s: S.W },
    // 8E /r MOV Sreg,r/m16** RM Valid Valid Move r/m16 to segment register.
    { o: 0x8e, ops: [sreg, rm16], s: S.W },
    // REX.W + 8C /r MOV r/m64,Sreg** MR Valid Valid Move zero extended 16-bit segment register to r/m64.
    { o: 0x8c, ops: [rm64, sreg], s: S.W },
    // REX.W + 8E /r MOV Sreg,r/m64** RM Valid Valid Move lower 16 bits of r/m64 to segment register.
    { o: 0x8e, ops: [sreg, rm64], s: S.W },

    // B0+ rb ib MOV r8, imm8 OI Valid Valid Move imm8 to r8.
    // REX + B0+ rb ib MOV r8***, imm8 OI Valid N.E. Move imm8 to r8.
    { o: 0xb0, r: true, ops: [r8, imm8] },
    // B8+ rw iw MOV r16, imm16 OI Valid Valid Move imm16 to r16.
    { o: 0xb8, r: true, ops: [r16, imm16] },
    // B8+ rd id MOV r32, imm32 OI Valid Valid Move imm32 to r32.
    { o: 0xb8, r: true, ops: [r32, imm32] },
    // REX.W + B8+ rd io MOV r64, imm64 OI Valid N.E. Move imm64 to r64.
    { o: 0xb8, r: true, ops: [r64, imm64] },
    // C6 /0 ib MOV r/m8, imm8 MI Valid Valid Move imm8 to r/m8.
    // REX + C6 /0 ib MOV r/m8***, imm8 MI Valid N.E. Move imm8 to r/m8.
    { o: 0xc6, or: 0, ops: [rm8, imm8] },
    // C7 /0 iw MOV r/m16, imm16 MI Valid Valid Move imm16 to r/m16.
    { o: 0xc7, or: 0, ops: [rm16, imm16] },
    // C7 /0 id MOV r/m32, imm32 MI Valid Valid Move imm32 to r/m32.
    { o: 0xc7, or: 0, ops: [rm32, imm32] },
    // REX.W + C7 /0 io MOV r/m64, imm32 MI Valid N.E. Move imm32 sign extended to 64-bits to r/m64.
    { o: 0xc7, or: 0, ops: [rm64, imm32] },

    // MOV—Move to/from Control Registers
    { o: 0x0f20, ops: [r32, cr0_7], dbit: true, s: S.D, mod: M.COMP | M.LEG },
    { o: 0x0f20, ops: [r64, cr0_7], dbit: true, s: S.Q, mod: M.X64 },
    { o: 0x0f20, or: 0, ops: [r64, o.cr(8)], s: S.Q, mod: M.X64 },
    { o: 0x0f22, ops: [cr0_7, r32], dbit: true, s: S.D, mod: M.COMP | M.LEG },
    { o: 0x0f22, ops: [cr0_7, r64], dbit: true, s: S.Q, mod: M.X64 },
    { o: 0x0f22, or: 0, ops: [o.cr(8), r64], s: S.Q, mod: M.X64 },

    // MOV—Move to/from Debug Registers
    { o: 0x0f21, ops: [r32, dr0_7], dbit: true, s: S.D, mod: M.COMP | M.LEG },
    { o: 0x0f23, ops: [dr0_7, r32], dbit: true, s: S.D, mod: M.COMP | M.LEG },
    { o: 0x0f21, ops: [r64, dr0_7], dbit: true, s: S.Q, mod: M.X64 },
    { o: 0x0f23, ops: [dr0_7, r64], dbit: true, s: S.Q, mod: M.X64 },
  ],
  movabs: [
    {},
    // A0 MOV AL,moffs8* FD Valid Valid Move byte at (seg:offset) to AL.
    // REX.W + A0 MOV AL,moffs8* FD Valid N.E. Move byte at (offset) to AL.
    { o: 0xa0, ops: [o.al, imm8] },
    // A1 MOV AX,moffs16* FD Valid Valid Move word at (seg:offset) to AX.
    { o: 0xa1, ops: [o.ax, imm16] },
    // A1 MOV EAX,moffs32* FD Valid Valid Move doubleword at (seg:offset) to EAX.
    { o: 0xa1, ops: [o.eax, imm32] },
    // REX.W + A1 MOV RAX,moffs64* FD Valid N.E. Move quadword at (offset) to RAX.
    { o: 0xa1, ops: [o.rax, imm64] },
    // A2 MOV moffs8,AL TD Valid Valid Move AL to (seg:offset).
    // REX.W + A2 MOV moffs8***,AL TD Valid N.E. Move AL to (offset).
    { o: 0xa2, ops: [imm8, o.al] },
    // A3 MOV moffs16*,AX TD Valid Valid Move AX to (seg:offset).
    { o: 0xa3, ops: [imm16, o.ax] },
    // A3 MOV moffs32*,EAX TD Valid Valid Move EAX to (seg:offset).
    { o: 0xa3, ops: [imm32, o.eax] },
    // REX.W + A3 MOV moffs64*,RAX TD Valid N.E. Move RAX to (offset).
    { o: 0xa3, ops: [imm64, o.rax] },
  ],
  // CMOVE/CMOVZ Conditional move if equal/Conditional move if zero
  cmove: tpl_cmovc(0x0f44),
  cmovz: ['cmove'],
  // CMOVNE/CMOVNZ Conditional move if not equal/Conditional move if not zero
  cmovne: tpl_cmovc(0x0f45),
  cmovnz: ['cmovne'],
  // CMOVA/CMOVNBE Conditional move if above/Conditional move if not below or equal
  cmova: tpl_cmovc(0x0f47),
  cmovnbe: ['cmova'],
  // CMOVAE/CMOVNB Conditional move if above or equal/Conditional move if not below
  cmovae: tpl_cmovc(0x0f43),
  cmovnb: ['cmovae'],
  // CMOVB/CMOVNAE Conditional move if below/Conditional move if not above or equal
  cmovb: tpl_cmovc(0x0f42),
  cmovnae: ['cmovb'],
  // CMOVBE/CMOVNA Conditional move if below or equal/Conditional move if not above
  cmovbe: tpl_cmovc(0x0f46),
  cmovna: ['cmovbe'],
  // CMOVG/CMOVNLE Conditional move if greater/Conditional move if not less or equal
  cmovg: tpl_cmovc(0x0f4f),
  cmovnle: ['cmovg'],
  // CMOVGE/CMOVNL Conditional move if greater or equal/Conditional move if not less
  cmovge: tpl_cmovc(0x0f4d),
  cmovnl: ['cmovge'],
  // CMOVL/CMOVNGE Conditional move if less/Conditional move if not greater or equal
  cmovl: tpl_cmovc(0x0f4c),
  cmovnge: ['cmovl'],
  // CMOVLE/CMOVNG Conditional move if less or equal/Conditional move if not greater
  cmovle: tpl_cmovc(0x0f4e),
  cmovng: ['cmovle'],
  // CMOVC Conditional move if carry
  cmovc: tpl_cmovc(),
  // CMOVNC Conditional move if not carry
  cmovnc: tpl_cmovc(0x0f43),
  // CMOVO Conditional move if overflow
  cmovo: tpl_cmovc(0x0f40),
  // CMOVNO Conditional move if not overflow
  cmovno: tpl_cmovc(0x0f41),
  // CMOVS Conditional move if sign (negative)
  cmovs: tpl_cmovc(0x0f48),
  // CMOVNS Conditional move if not sign (non-negative)
  cmovns: tpl_cmovc(0x0f4b),
  // CMOVP/CMOVPE Conditional move if parity/Conditional move if parity even
  cmovp: tpl_cmovc(0x0f4a),
  cmovpe: ['cmovp'],
  // CMOVNP/CMOVPO Conditional move if not parity/Conditional move if parity odd
  cmovnp: tpl_cmovc(0x0f4b),
  cmovpo: ['cmovnp'],
  // XCHG Exchange
  xchg: [
    {},
    // 90+rw XCHG AX, r16 O Valid Valid Exchange r16 with AX.
    { o: 0x90, r: true, ops: [o.ax, r16] },
    // 90+rw XCHG r16, AX O Valid Valid Exchange AX with r16.
    { o: 0x90, r: true, ops: [r16, o.ax] },
    // 90+rd XCHG EAX, r32 O Valid Valid Exchange r32 with EAX.
    { o: 0x90, r: true, ops: [o.eax, r32] },
    // REX.W + 90+rd XCHG RAX, r64 O Valid N.E. Exchange r64 with RAX.
    { o: 0x90, r: true, ops: [o.rax, r64] },
    // 90+rd XCHG r32, EAX O Valid Valid Exchange EAX with r32.
    { o: 0x90, r: true, ops: [r32, o.eax] },
    // REX.W + 90+rd XCHG r64, RAX O Valid N.E. Exchange RAX with r64.
    { o: 0x90, r: true, ops: [r64, o.rax] },
    // 86 /r XCHG r/m8, r8 MR Valid Valid Exchange r8 (byte register) with byte from r/m8.
    // REX + 86 /r XCHG r/m8*, r8* MR Valid N.E. Exchange r8 (byte register) with byte from r/m8.
    // 86 /r XCHG r8, r/m8 RM Valid Valid Exchange byte from r/m8 with r8 (byte register).
    // REX + 86 /r XCHG r8*, r/m8* RM Valid N.E. Exchange byte from r/m8 with r8 (byte register).
    { o: 0x86, ops: [rm8, rm8] },
    // 87 /r XCHG r/m16, r16 MR Valid Valid Exchange r16 with word from r/m16.
    // 87 /r XCHG r16, r/m16 RM Valid Valid Exchange word from r/m16 with r16.
    { o: 0x87, ops: [rm16, rm16] },
    // 87 /r XCHG r/m32, r32 MR Valid Valid Exchange r32 with doubleword from r/m32.
    // 87 /r XCHG r32, r/m32 RM Valid Valid Exchange doubleword from r/m32 with r32.
    { o: 0x87, ops: [rm32, rm32] },
    // REX.W + 87 /r XCHG r/m64, r64 MR Valid N.E. Exchange r64 with quadword from r/m64.
    // REX.W + 87 /r XCHG r64, r/m64 RM Valid N.E. Exchange quadword from r/m64 with r64.
    { o: 0x87, ops: [rm64, rm64] },
  ],
  // BSWAP Byte swap
  bswap: [
    { o: 0x0fc8, r: true },
    // 0F C8+rd BSWAP r32 O Valid* Valid Reverses the byte order of a 32-bit register.
    { ops: [r32] },
    // REX.W + 0F C8+rd BSWAP r64 O Valid N.E. Reverses the byte order of a 64-bit register.
    { ops: [r64] },
  ],
  // XADD Exchange and add
  xadd: tpl_xadd(0x0fc0),
  // CMPXCHG Compare and exchange
  cmpxchg: tpl_xadd(0x0fb0),
  // CMPXCHG8B Compare and exchange 8 bytes
  cmpxchg8b: [{ o: 0x0fc7, or: 1, ops: [m], s: S.Q }],
  cmpxchg16b: [{ o: 0x0fc7, or: 1, ops: [m], s: S.O }],
  // PUSH Push onto stack
  push: [
    { ds: S.Q },
    // FF /6 PUSH r/m16 M Valid Valid Push r/m16.
    { o: 0xff, or: 6, ops: [rm16] },
    // FF /6 PUSH r/m64 M Valid N.E. Push r/m64.
    { o: 0xff, or: 6, ops: [rm64] },
    // 50+rw PUSH r16 O Valid Valid Push r16.
    { o: 0x50, r: true, ops: [r16] },
    // 50+rd PUSH r64 O Valid N.E. Push r64.
    { o: 0x50, r: true, ops: [r64] },
    // 6A ib PUSH imm8 I Valid Valid Push imm8.
    { o: 0x6a, ops: [imm8] },
    // 68 iw PUSH imm16 I Valid Valid Push imm16.
    { o: 0x68, ops: [imm16] },
    // 68 id PUSH imm32 I Valid Valid Push imm32.
    { o: 0x68, ops: [imm32] },
    // 0F A0 PUSH FS NP Valid Valid Push FS.
    { o: 0x0fa0, ops: [o.fs] },
    // 0F A8 PUSH GS NP Valid Valid Push GS.
    { o: 0x0fa8, ops: [o.gs] },
  ],
  // POP Pop off of stack
  pop: [
    { ds: S.Q },
    // 8F /0 POP r/m16 M Valid Valid
    { o: 0x8f, or: 0, ops: [rm16] },
    // 8F /0 POP r/m64 M Valid N.E.
    { o: 0x8f, or: 0, ops: [rm64] },
    // 58+ rw POP r16 O Valid Valid
    { o: 0x58, r: true, ops: [r16] },
    // 58+ rd POP r64 O Valid N.E.
    { o: 0x58, r: true, ops: [r64] },
    // 0F A1 POP FS NP Valid Valid 16-bits
    { o: 0x0fa1, ops: [o.fs], s: S.W },
    // 0F A1 POP FS NP Valid N.E. 64-bits
    { o: 0x0fa1, ops: [o.fs], s: S.Q },
    // 0F A9 POP GS NP Valid Valid 16-bits
    { o: 0x0fa9, ops: [o.gs], s: S.W },
    // 0F A9 POP GS NP Valid N.E. 64-bits
    { o: 0x0fa9, ops: [o.gs], s: S.W },
  ],
  // CWD/CDQ/CQO Convert word to doubleword/Convert doubleword to quadword
  // 99 CWD NP Valid Valid DX:AX ← sign-extend of AX.
  cwd: [{ o: 0x99, s: S.W }],
  // 99 CDQ NP Valid Valid EDX:EAX ← sign-extend of EAX.
  cdq: [{ o: 0x99, s: S.D }],
  // REX.W + 99 CQO NP Valid N.E. RDX:RAX← sign-extend of RAX.
  cqo: [{ o: 0x99, s: S.Q }],
  // CBW/CWDE/CDQE Convert byte to word/Convert word to doubleword in EAX register
  // 98 CBW NP Valid Valid AX ← sign-extend of AL.
  cbw: [{ o: 0x98, s: S.W }],
  // 98 CWDE NP Valid Valid EAX ← sign-extend of AX.
  cwde: [{ o: 0x98, s: S.D }],
  // REX.W + 98 CDQE NP Valid N.E. RAX ← sign-extend of EAX.
  cdqe: [{ o: 0x98, s: S.Q }],
  // MOVSX Move and sign extend
  movsx: [
    {},
    // 0F BE /r MOVSX r16, r/m8 RM Valid Valid Move byte to word with sign-extension.
    { o: 0x0fbe, ops: [r16, rm8], s: S.W },
    // 0F BE /r MOVSX r32, r/m8 RM Valid Valid Move byte to doubleword with signextension.
    { o: 0x0fbe, ops: [r32, rm8], s: S.D },
    // REX + 0F BE /r MOVSX r64, r/m8* RM Valid N.E. Move byte to quadword with sign-extension.
    { o: 0x0fbe, ops: [r64, rm8], s: S.Q },
    // 0F BF /r MOVSX r32, r/m16 RM Valid Valid Move word to doubleword, with signextension.
    { o: 0x0fbf, ops: [r32, rm16], s: S.D },
    // REX.W + 0F BF /r MOVSX r64, r/m16 RM Valid N.E. Move word to quadword with sign-extension.
    { o: 0x0fbf, ops: [r64, rm16], s: S.Q },
  ],
  // REX.W** + 63 /r MOVSXD r64, r/m32 RM Valid N.E. Move doubleword to quadword with signextension.
  movsxd: [{ o: 0x63, ops: [r64, rm32], s: S.Q }],
  // MOVZX Move and zero extend
  movzx: [
    {},
    // 0F B6 /r MOVZX r16, r/m8 RM Valid Valid Move byte to word with zero-extension.
    { o: 0x0fb6, ops: [r16, rm8], s: S.W },
    // 0F B6 /r MOVZX r32, r/m8 RM Valid Valid Move byte to doubleword, zero-extension.
    { o: 0x0fb6, ops: [r32, rm8], s: S.D },
    // REX.W + 0F B6 /r MOVZX r64, r/m8* RM Valid N.E. Move byte to quadword, zero-extension.
    { o: 0x0fb6, ops: [r64, rm8], s: S.Q },
    // 0F B7 /r MOVZX r32, r/m16 RM Valid Valid Move word to doubleword, zero-extension.
    { o: 0x0fb7, ops: [r32, rm16], s: S.D },
    // REX.W + 0F B7 /r MOVZX r64, r/m16 RM Valid N.E. Move word to quadword, zero-extension.
    { o: 0x0fb7, ops: [r64, rm16], s: S.Q },
  ],

  // ## Binary Arithmetic
  // ADCX Unsigned integer add with carry
  adcx: [{ o: 0x0f38f6, pfx: [0x66], ext: [EXT.ADX] }, { ops: [r32, rm32] }, { ops: [r64, rm64], mod: M.X64 }],
  // ADOX Unsigned integer add with overflow
  adox: [{ o: 0x0f38f6, pfx: [0xf3], ext: [EXT.ADX] }, { ops: [r32, rm32] }, { ops: [r64, rm64], mod: M.X64 }],
  // ADD Integer add
  get add() {
    return lazy('common', 'add')
  },
  // ADC Add with carry
  get adc() {
    return lazy('common', 'adc')
  },
  // SUB Subtract
  get sub() {
    return lazy('common', 'sub')
  },
  // SBB Subtract with borrow
  get sbb() {
    return lazy('common', 'sbb')
  },
  // IMUL Signed multiply
  imul: [
    {},
    // F6 /5 IMUL r/m8* M Valid Valid AX← AL ∗ r/m byte.
    { o: 0xf6, or: 5, ops: [rm8] },
    // F7 /5 IMUL r/m16 M Valid Valid DX:AX ← AX ∗ r/m word.
    { o: 0xf7, or: 5, ops: [rm16] },
    // F7 /5 IMUL r/m32 M Valid Valid EDX:EAX ← EAX ∗ r/m32.
    { o: 0xf7, or: 5, ops: [rm32] },
    // REX.W + F7 /5 IMUL r/m64 M Valid N.E. RDX:RAX ← RAX ∗ r/m64.
    { o: 0xf7, or: 5, ops: [rm64] },
    // 0F AF /r IMUL r16, r/m16 RM Valid Valid word register ← word register ∗ r/m16.
    { o: 0x0faf, ops: [r16, rm16] },
    // 0F AF /r IMUL r32, r/m32 RM Valid Valid doubleword register ← doubleword register ∗ r/m32.
    { o: 0x0faf, ops: [r32, rm32] },
    // REX.W + 0F AF /r IMUL r64, r/m64 RM Valid N.E. Quadword register ← Quadword register ∗ r/m64.
    { o: 0x0faf, ops: [r64, rm64] },
    // 6B /r ib IMUL r16, r/m16, imm8 RMI Valid Valid word register ← r/m16 ∗ sign-extended immediate byte.
    { o: 0x6b, ops: [r16, rm16, imm8] },
    // 6B /r ib IMUL r32, r/m32, imm8 RMI Valid Valid doubleword register ← r/m32 ∗ signextended immediate byte.
    { o: 0x6b, ops: [r32, rm32, imm8] },
    // REX.W + 6B /r ib IMUL r64, r/m64, imm8 RMI Valid N.E. Quadword register ← r/m64 ∗ sign-extended immediate byte.
    { o: 0x6b, ops: [r64, rm64, imm8] },
    // 69 /r iw IMUL r16, r/m16, imm16 RMI Valid Valid word register ← r/m16 ∗ immediate word.
    { o: 0x69, ops: [r16, rm16, imm16] },
    // 69 /r id IMUL r32, r/m32, imm32 RMI Valid Valid doubleword register ← r/m32 ∗ immediate doubleword.
    { o: 0x69, ops: [r32, rm32, imm32] },
    // REX.W + 69 /r id IMUL r64, r/m64, imm32 RMI Valid N.E. Quadword register
    { o: 0x69, ops: [r64, rm64, imm32] },
  ],
  // MUL Unsigned multiply
  mul: tpl_not(0xf6, 4, false),
  // IDIV Signed divide
  idiv: tpl_not(0xf6, 7, false),
  // DIV Unsigned divide
  div: tpl_not(0xf6, 6, false),
  // INC Increment
  inc: _inc,
  // DEC Decrement
  dec: _dec,
  // NEG Negate
  neg: tpl_not(0xf6, 3),

  // CMP Compare
  get cmp() {
    return lazy('common', 'cmp')
  },

  // ## Logical
  // AND Perform bitwise logical AND
  get and() {
    return lazy('common', 'and')
  },
  // OR Perform bitwise logical OR
  get or() {
    return lazy('common', 'or')
  },
  // XOR Perform bitwise logical exclusive OR
  get xor() {
    return lazy('common', 'xor')
  },
  // NOT Perform bitwise logical NOT
  not: tpl_not(),

  // ## Shift and Rotate
  // SAR Shift arithmetic right
  get sar() {
    return lazy('sar', 'sar')
  },
  // SHR Shift logical right
  get shr() {
    return lazy('sar', 'shr')
  },
  // SAL/SHL Shift arithmetic left/Shift logical left
  get shl() {
    return lazy('sar', 'shl')
  },
  sal: ['shl'],
  // SHRD Shift right double
  get shrd() {
    return lazy('shrd', 'shrd')
  },
  // SHLD Shift left double
  get shld() {
    return lazy('shrd', 'shld')
  },
  // ROR Rotate right
  get ror() {
    return lazy('sar', 'ror')
  },
  // ROL Rotate left
  get rol() {
    return lazy('sar', 'rol')
  },
  // RCR Rotate through carry right
  get rcr() {
    return lazy('sar', 'rcr')
  },
  // RCL Rotate through carry left
  get rcl() {
    return lazy('sar', 'rcl')
  },

  // ## Bit and Byte
  // BT Bit test
  bt: tpl_bt(),
  // BTS Bit test and set
  bts: tpl_bt(0x0fab, 4),
  // BTR Bit test and reset
  btr: tpl_bt(0x0fb3, 6),
  // BTC Bit test and complement
  btc: tpl_bt(0x0fbb, 7),
  // BSF Bit scan forward
  bsf: tpl_bsf(),
  // BSR Bit scan reverse
  bsr: tpl_bsf(0x0fbd),
  // SETE/SETZ Set byte if equal/Set byte if zero
  sete: [{ o: 0x0f94, ops: [rm8] }],
  setz: ['sete'],
  // SETNE/SETNZ Set byte if not equal/Set byte if not zero
  setne: [{ o: 0x0f95, ops: [rm8] }],
  setnz: ['setne'],
  // SETA/SETNBE Set byte if above/Set byte if not below or equal
  seta: [{ o: 0x0f97, ops: [rm8] }],
  setnbe: ['seta'],
  // SETAE/SETNB/SETNC Set byte if above or equal/Set byte if not below/Set byte if not carry
  setae: [{ o: 0x0f93, ops: [rm8] }],
  setnb: ['setae'],
  setnc: ['setae'],
  // SETB/SETNAE/SETCSet byte if below/Set byte if not above or equal/Set byte if carry
  setb: [{ o: 0x0f92, ops: [rm8] }],
  setnae: ['setb'],
  setc: ['setb'],
  // SETBE/SETNA Set byte if below or equal/Set byte if not above
  setbe: [{ o: 0x0f96, ops: [rm8] }],
  setna: ['setbe'],
  // SETG/SETNLE Set byte if greater/Set byte if not less or equal
  setg: [{ o: 0x0f9f, ops: [rm8] }],
  setnle: ['setg'],
  // SETGE/SETNL Set byte if greater or equal/Set byte if not less
  setge: [{ o: 0x0f9d, ops: [rm8] }],
  setnl: ['setge'],
  // SETL/SETNGE Set byte if less/Set byte if not greater or equal
  setl: [{ o: 0x0f9c, ops: [rm8] }],
  setnge: ['setl'],
  // SETLE/SETNG Set byte if less or equal/Set byte if not greater
  setle: [{ o: 0x0f9e, ops: [rm8] }],
  setng: ['setle'],
  // SETS Set byte if sign (negative)
  sets: [{ o: 0x0f98, ops: [rm8] }],
  // SETNS Set byte if not sign (non-negative)
  setns: [{ o: 0x0f99, ops: [rm8] }],
  // SETO Set byte if overflow
  seto: [{ o: 0x0f90, ops: [rm8] }],
  // SETNO Set byte if not overflow
  setno: [{ o: 0x0f91, ops: [rm8] }],
  // SETPE/SETP Set byte if parity even/Set byte if parity
  setp: [{ o: 0x0f9a, ops: [rm8] }],
  setpe: ['setp'],
  // SETPO/SETNP Set byte if parity odd/Set byte if not parity
  setnp: [{ o: 0x0f9b, ops: [rm8] }],
  setpo: ['setnp'],
  // TEST Logical compare
  test: [
    {},
    // A8 ib TEST AL, imm8 I Valid Valid AND imm8 with AL; set SF, ZF, PF according to result.
    { o: 0xa8, ops: [o.al, imm8] },
    // A9 iw TEST AX, imm16 I Valid Valid AND imm16 with AX; set SF, ZF, PF according to result.
    { o: 0xa9, ops: [o.ax, imm16] },
    // A9 id TEST EAX, imm32 I Valid Valid AND imm32 with EAX; set SF, ZF, PF according to result.
    { o: 0xa9, ops: [o.eax, imm32] },
    // REX.W + A9 id TEST RAX, imm32 I Valid N.E. AND imm32 sign-extended to 64-bits with RAX; set SF, ZF, PF according to result.
    { o: 0xa9, ops: [o.rax, imm32] },
    // F6 /0 ib TEST r/m8, imm8 MI Valid Valid AND imm8 with r/m8; set SF, ZF, PF according to result.
    // REX + F6 /0 ib TEST r/m8*, imm8 MI Valid N.E. AND imm8 with r/m8; set SF, ZF, PF according to result.
    { o: 0xf6, or: 0, ops: [rm8, imm8] },
    // F7 /0 iw TEST r/m16, imm16 MI Valid Valid AND imm16 with r/m16; set SF, ZF, PF according to result.
    { o: 0xf7, or: 0, ops: [rm16, imm16] },
    // F7 /0 id TEST r/m32, imm32 MI Valid Valid AND imm32 with r/m32; set SF, ZF, PF according to result.
    { o: 0xf7, or: 0, ops: [rm32, imm32] },
    // REX.W + F7 /0 id TEST r/m64, imm32 MI Valid N.E. AND imm32 sign-extended to 64-bits with r/m64; set SF, ZF, PF according to result.
    { o: 0xf7, or: 0, ops: [rm64, imm32] },
    // 84 /r TEST r/m8, r8 MR Valid Valid AND r8 with r/m8; set SF, ZF, PF according to result.
    // REX + 84 /r TEST r/m8*, r8* MR Valid N.E. AND r8 with r/m8; set SF, ZF, PF according to result.
    { o: 0x84, ops: [rm8, r8] },
    // 85 /r TEST r/m16, r16 MR Valid Valid AND r16 with r/m16; set SF, ZF, PF according to result.
    { o: 0x85, ops: [rm16, r16] },
    // 85 /r TEST r/m32, r32 MR Valid Valid AND r32 with r/m32; set SF, ZF, PF according to result.
    { o: 0x85, ops: [rm32, r32] },
    // REX.W + 85 /r TEST r/m64, r64 MR Valid N.E. AND r64 with
    { o: 0x85, ops: [rm64, r64] },
  ],
  // CRC32 Provides hardware acceleration to calculate cyclic redundancy checks for fast and efficient implementation of data integrity protocols.
  crc32: [
    { pfx: [0xf2] },
    // F2 0F 38 F0 /r CRC32 r32, r/m8 RM Valid Valid Accumulate CRC32 on r/m8.
    // F2 REX 0F 38 F0 /r CRC32 r32, r/m8* RM Valid N.E. Accumulate CRC32 on r/m8.
    { o: 0x0f38f0, ops: [r32, rm8], s: S.D },
    // F2 0F 38 F1 /r CRC32 r32, r/m16 RM Valid Valid Accumulate CRC32 on r/m16.
    { o: 0x0f38f1, ops: [r32, rm16], s: S.D },
    // F2 0F 38 F1 /r CRC32 r32, r/m32 RM Valid Valid Accumulate CRC32 on r/m32.
    { o: 0x0f38f1, ops: [r32, rm32], s: S.D },
    // F2 REX.W 0F 38 F0 /r CRC32 r64, r/m8 RM Valid N.E. Accumulate CRC32 on r/m8.
    { o: 0x0f38f0, ops: [r64, rm8], s: S.Q },
    // F2 REX.W 0F 38 F1 /r CRC32 r64, r/m64
    { o: 0x0f38f1, ops: [r64, rm64] },
  ],
  // POPCNT This instruction calculates of number of bits set to 1 in the second
  popcnt: [
    { pfx: [0xf3] },
    // F3 0F B8 /r POPCNT r16, r/m16 RM Valid Valid POPCNT on r/m16
    { o: 0x0fb8, ops: [r16, rm16], s: S.W },
    // F3 0F B8 /r POPCNT r32, r/m32 RM Valid Valid POPCNT on r/m32
    { o: 0x0fb8, ops: [r32, rm32], s: S.D },
    // F3 REX.W 0F B8 /r POPCNT r64, r/m64 RM Valid N.E. POPCNT on r/m64
    { o: 0x0fb8, ops: [r64, rm64], s: S.Q },
  ],

  // ## Control Transfer
  // JMP Jump
  jmp: [
    { ds: S.Q },
    // relX is just immX
    // EB cb JMP rel8 D Valid Valid Jump short, RIP = RIP + 8-bit displacement sign extended to 64-bits
    { o: 0xeb, ops: [rel8] },
    // E9 cd JMP rel32 D Valid Valid Jump near, relative, RIP = RIP + 32-bit displacement sign extended to 64-bits
    { o: 0xe9, ops: [rel32] },
    // FF /4 JMP r/m64 M Valid N.E. Jump near, absolute indirect, RIP = 64-Bit offset from register or memory
    { o: 0xff, or: 4, ops: [rm64] },
  ],
  ljmp: [
    { ds: S.Q },
    // FF /5 JMP m16:16 D Valid Valid Jump far, absolute indirect, address given in m16:16
    // FF /5 JMP m16:32 D Valid Valid Jump far, absolute indirect, address given in m16:32.
    // REX.W + FF /5 JMP m16:64 D Valid N.E. Jump far, absolute
    // TODO: Improve this.
    { o: 0xff, or: 5, ops: [m], s: S.Q },
  ],
  // Jcc
  // E3 cb JECXZ rel8 D Valid Valid Jump short if ECX register is 0.
  jecxz: [{ o: 0xe3, ops: [rel8], pfx: [0x67] }],
  // E3 cb JRCXZ rel8 D Valid N.E. Jump short if RCX register is 0.
  jrcxz: [{ o: 0xe3, ops: [rel8] }],
  ja: tpl_ja(),
  jae: tpl_ja(0x73, 0x0f83),
  jb: tpl_ja(0x72, 0x0f82),
  jbe: tpl_ja(0x76, 0x0f86),
  jc: tpl_ja(0x72, 0x0f82),
  je: tpl_ja(0x74, 0x0f84),
  jg: tpl_ja(0x7f, 0x0f8f),
  jge: tpl_ja(0x7d, 0x0f8d),
  jl: tpl_ja(0x7c, 0x0f8c),
  jle: tpl_ja(0x7e, 0x0f8e),
  jna: tpl_ja(0x76, 0x0f86),
  jnae: tpl_ja(0x72, 0x0f82),
  jnb: tpl_ja(0x73, 0x0f83),
  jnbe: tpl_ja(0x77, 0x0f87),
  jnc: tpl_ja(0x73, 0x0f83),
  jne: tpl_ja(0x75, 0x0f85),
  jng: tpl_ja(0x7e, 0x0f8e),
  jnge: tpl_ja(0x7c, 0x0f8c),
  jnl: tpl_ja(0x7d, 0x0f8d),
  jnle: tpl_ja(0x7f, 0x0f8f),
  jno: tpl_ja(0x71, 0x0f81),
  jnp: tpl_ja(0x7b, 0x0f8b),
  jns: tpl_ja(0x79, 0x0f89),
  jnz: tpl_ja(0x75, 0x0f85),
  jo: tpl_ja(0x70, 0x0f80),
  jp: tpl_ja(0x7a, 0x0f8a),
  jpe: tpl_ja(0x7a, 0x0f8a),
  jpo: tpl_ja(0x7b, 0x0f8b),
  js: tpl_ja(0x78, 0x0f88),
  jz: tpl_ja(0x74, 0x0f84),
  // LOOP Loop with ECX counter
  // E2 cb LOOP rel8 D Valid Valid Decrement count; jump short if count ≠ 0.
  loop: [{ o: 0xe2, ops: [rel8] }],
  // LOOPZ/LOOPE Loop with ECX and zero/Loop with ECX and equal
  // E1 cb LOOPE rel8 D Valid Valid Decrement count; jump short if count ≠ 0 and ZF = 1.
  loope: [{ o: 0xe1, ops: [rel8] }],
  loopz: ['loope'],
  // LOOPNZ/LOOPNE Loop with ECX and not zero/Loop with ECX and not equal
  // E0 cb LOOPNE rel8 D Valid Valid Decrement count; jump short if count ≠ 0 and ZF = 0.
  loopne: [{ o: 0xe0, ops: [rel8] }],
  loopnz: ['loopne'],
  // CALL Call procedure
  call: [
    { ds: S.Q },
    { o: 0xe8, ops: [rel16], mod: M.OLD },
    { o: 0xe8, ops: [rel32] },
    { o: 0xff, or: 2, ops: [rm16], mod: M.OLD },
    { o: 0xff, or: 2, ops: [rm32], mod: M.OLD },
    { o: 0xff, or: 2, ops: [rm64] },
  ],
  lcall: [
    { ds: S.Q },
    // FF /3 CALL m16:16 M Valid Valid Call far, absolute indirect address given in m16:16.
    // FF /3 CALL m16:32 M Valid Valid
    // REX.W + FF /3 CALL m16:64 M Valid N.E.
    // TODO: Test this.
    // {o: 0xFF, or: 3, ops: [m], s: S.Q},
    { o: 0xff, or: 3, ops: [m], s: S.D },
  ],
  // RET Return
  ret: [{ ds: S.Q }, { o: 0xc3 }, { o: 0xc2, ops: [imm16] }],
  lret: [{ ds: S.Q }, { o: 0xcb }, { o: 0xca, ops: [imm16] }],
  // IRET Return from interrupt
  iret: [{ o: 0xcf }],
  iretd: [{ o: 0xcf }],
  iretq: [{ o: 0xcf, rex: [1, 0, 0, 0] }],

  // ## String
  // MOVS Move string/Move byte string
  movs: tpl_movs(),
  // CMPS Compare string/Compare byte string
  cmps: tpl_movs(0xa6),
  // SCAS Scan string/Scan byte string
  scas: tpl_movs(0xae),
  // LODS/LODSB Load string/Load byte string
  lods: tpl_movs(0xac),
  lodsb: [{ o: 0xac, s: S.B }],
  lodsw: [{ o: 0xad, s: S.W }],
  lodsd: [{ o: 0xad, s: S.D }],
  lodsq: [{ o: 0xad, s: S.Q }],
  // STOS Store string/Store byte string
  stos: tpl_movs(0xaa),

  // ## I/O
  // IN Read from a port
  in: [
    { mr: false },
    // E4 ib IN AL, imm8 I Valid Valid Input byte from imm8 I/O port address into AL.
    { o: 0xe4, ops: [o.al, imm8] },
    // E5 ib IN AX, imm8 I Valid Valid Input word from imm8 I/O port address into AX.
    { o: 0xe5, ops: [o.ax, imm8] },
    // E5 ib IN EAX, imm8 I Valid Valid Input dword from imm8 I/O port address into EAX.
    { o: 0xe5, ops: [o.eax, imm8] },
    // EC IN AL,DX NP Valid Valid Input byte from I/O port in DX into AL.
    { o: 0xec, ops: [o.al, o.dx], s: S.B },
    // ED IN AX,DX NP Valid Valid Input word from I/O port in DX into AX.
    { o: 0xed, ops: [o.ax, o.dx], s: S.W },
    // ED IN EAX,DX NP Valid Valid Input doubleword
    { o: 0xed, ops: [o.eax, o.dx], s: S.D },
  ],
  // OUT Write to a port
  out: [
    { mr: false },
    // E6 ib OUT imm8, AL I Valid Valid Output byte in AL to I/O port address imm8.
    { o: 0xe6, ops: [imm8, o.al] },
    // E7 ib OUT imm8, AX I Valid Valid Output word in AX to I/O port address imm8.
    { o: 0xe7, ops: [imm8, o.ax] },
    // E7 ib OUT imm8, EAX I Valid Valid Output doubleword in EAX to I/O port address imm8.
    { o: 0xe7, ops: [imm8, o.eax] },
    // EE OUT DX, AL NP Valid Valid Output byte in AL to I/O port address in DX.
    { o: 0xee, ops: [o.dx, o.al], s: S.B },
    // EF OUT DX, AX NP Valid Valid Output word in AX to I/O port address in DX.
    { o: 0xef, ops: [o.dx, o.ax], s: S.W },
    // EF OUT DX, EAX NP Valid Valid Output
    { o: 0xef, ops: [o.dx, o.eax], s: S.D },
  ],
  // INS
  ins: [
    { o: 0x6d },
    // INS/INSB Input string from port/Input byte string from port
    { o: 0x6c, s: S.B },
    // INS/INSW Input string from port/Input word string from port
    { s: S.W },
    // INS/INSD Input string from port/Input doubleword string from port
    { s: S.D },
  ],
  insb: [{ o: 0x6c }],
  insw: [{ o: 0x6d }],
  insd: [{ o: 0x6d }],
  // OUTS
  outs: [
    { o: 0x6f },
    // OUTS/OUTSB Output string to port/Output byte string to port
    { o: 0x6e, s: S.B },
    // OUTS/OUTSW Output string to port/Output word string to port
    { s: S.W },
    // OUTS/OUTSD Output string to port/Output doubleword string to port
    { s: S.D },
  ],

  // ## Enter and Leave
  // ENTER High-level procedure entry
  enter: [
    { o: 0xc8, ops: [imm16, imm8] },
    // C8 iw 00 ENTER imm16, 0 II Valid Valid Create a stack frame for a procedure.
    // C8 iw 01 ENTER imm16,1 II Valid Valid Create a stack frame with a nested pointer for a procedure.
    // C8 iw ib ENTER imm16, imm8 II Valid Valid Create a stack frame
  ],
  // LEAVE High-level procedure exit
  leave: [{ o: 0xc9 }, { s: S.W }, { s: S.D, mod: M.COMP | M.LEG }, { s: S.Q, mod: M.X64 }],

  // ## Flag Control
  // STC Set carry flag
  stc: [{ o: 0xf9 }],
  // CLC Clear the carry flag
  clc: [{ o: 0xf8 }],
  // CMC Complement the carry flag
  cmc: [{ o: 0xf5 }],
  // CLD Clear the direction flag
  cld: [{ o: 0xfc }],
  // STD Set direction flag
  std: [{ o: 0xfd }],
  // PUSHF/PUSHFD Push EFLAGS onto stack
  pushf: [{ o: 0x9c }],
  // POPF/POPFD Pop EFLAGS from stack
  popf: [{ o: 0x9d }],
  // STI Set interrupt flag
  sti: [{ o: 0xfb }],
  // CLI Clear the interrupt flag
  cli: [{ o: 0xfa }],
  clac: [{ o: 0x0f01ca }],

  // ## Segment Register
  lds: [{ o: 0xc5, mod: M.COMP | M.LEG }, { ops: [r16, m] }, { ops: [r32, m] }],
  les: [{ o: 0xc4, mod: M.COMP | M.LEG }, { ops: [r16, m] }, { ops: [r32, m] }],
  lfs: tpl_lss(0x0fb4),
  // LGS Load far pointer using GS
  lgs: tpl_lss(0x0fb5),
  // LSS Load far pointer using SS
  lss: tpl_lss(),

  // ## Miscellaneous
  // LEA Load effective address
  lea: [{ o: 0x8d }, { ops: [r16, m] }, { ops: [r32, m] }, { ops: [r64, m] }],
  // NOP No operation
  // TODO: Come back, review this.
  nop: [
    {},
    // 90 NOP NP Valid Valid One byte no-operation instruction.
    { o: 0x90 },
    // 0F 1F /0 NOP r/m16 M Valid Valid Multi-byte no-operation instruction.
    { o: 0x0f1f, or: 0, ops: [rm16] },
    // 0F 1F /0 NOP r/m32 M Valid Valid Multi-byte no-operation instruction.
    { o: 0x0f1f, or: 0, ops: [rm32] },
  ],
  // UD2 Undefined instruction
  ud2: [{ o: 0x0f0b }],
  // XLAT/XLATB Table lookup translation
  xlat: [{ o: 0xd7 }], // TODO: Review this.
  // CPUID Processor identification
  cpuid: [{ o: 0x0fa2 }],
  // MOVBE Move data after swapping data bytes
  movbe: [
    {},
    // 0F 38 F0 /r MOVBE r16, m16 RM Valid Valid Reverse byte order in m16 and move to r16.
    { o: 0x0f38f0, ops: [r16, m16], dbit: true },
    // 0F 38 F0 /r MOVBE r32, m32 RM Valid Valid Reverse byte order in m32 and move to r32.
    { o: 0x0f38f0, ops: [r32, m32], dbit: true },
    // REX.W + 0F 38 F0 /r MOVBE r64, m64 RM Valid N.E. Reverse byte order in m64 and move to r64.
    { o: 0x0f38f0, ops: [r64, m64], dbit: true },
    // 0F 38 F1 /r MOVBE m16, r16 MR Valid Valid Reverse byte order in r16 and move to m16.
    { o: 0x0f38f1, ops: [m16, r16], dbit: true },
    // 0F 38 F1 /r MOVBE m32, r32 MR Valid Valid Reverse byte order in r32 and move to m32.
    { o: 0x0f38f1, ops: [m32, r32], dbit: true },
    // REX.W + 0F 38 F1 /r MOVBE m64, r64 MR Valid N.E. Reverse byte order in r64 and move to m64.
    { o: 0x0f38f1, ops: [m64, r64], dbit: true },
  ],
  // PREFETCHW Prefetch data into cache in anticipation of write
  prefetchw: [{ o: 0x0f0d, or: 1, ops: [m] }],
  // PREFETCHWT1 Prefetch hint T1 with intent to write
  prefetchwt1: [{ o: 0x0f0d, or: 2, ops: [m] }],
  // CLFLUSH Flushes and invalidates a memory operand and its associated cache line from all levels of the processor’s cache hierarchy
  cflush: [{ o: 0x0fae, or: 7, ops: [m] }],
  // CLFLUSHOPT Flushes and invalidates a memory operand and its associated cache line from all levels of the processor’s cache hierarchy with optimized memory system throughput.
  cflushopt: [{ o: 0x0fae, or: 7, pfx: [0x66], ops: [m] }],

  // ## User Mode Extended Sate Save/Restore
  // XSAVE Save processor extended states to memory
  xsave: [{ o: 0x0fae, or: 4, ops: [m] }],
  // XSAVEC Save processor extended states with compaction to memory
  xsavec: [{ o: 0x0fc7, or: 4, ops: [m] }],
  // XSAVEOPT Save processor extended states to memory, optimized
  xsaveopt: [{ o: 0x0fae, or: 6, ops: [m] }],
  // XRSTOR Restore processor extended states from memory
  xrstor: [{ o: 0x0fae, or: 5, ops: [m] }],
  // XGETBV Reads the state of an extended control register
  xgetbv: [{ o: 0x0f01d0 }],

  // ## Random Number
  // RDRAND Retrieves a random number generated from hardware
  rdrand: [
    { o: 0x0fc7, or: 6 },
    // 0F C7 /6 RDRAND r16 M
    { ops: [r16] },
    // 0F C7 /6 RDRAND r32 M
    { ops: [r32] },
    // REX.W + 0F C7 /6 RDRAND r64 M
    { ops: [r64] },
  ],
  // RDSEED Retrieves a random number generated from hardware
  rdseed: [{ o: 0x0fc7, or: 7 }, { ops: [r16] }, { ops: [r32] }, { ops: [r64] }],

  // ## BMI1, BMI2
  // ANDN Bitwise AND of first source with inverted 2nd source operands.
  // BEXTR Contiguous bitwise extract
  // BLSI Extract lowest set bit
  // BLSMSK Set all lower bits below first set bit to 1
  // BLSR Reset lowest set bit
  // BZHI Zero high bits starting from specified bit position
  // LZCNT Count the number leading zero bits
  // MULX Unsigned multiply without affecting arithmetic flags
  // PDEP Parallel deposit of bits using a mask
  // PEXT Parallel extraction of bits using a mask
  // RORX Rotate right without affecting arithmetic flags
  // SARX Shift arithmetic right
  // SHLX Shift logic left
  // SHRX Shift logic right
  // TZCNT Count the number trailing zero bits

  // System
  syscall: [{ o: 0x0f05 }],
  sysret: [{ o: 0x0f07 }],
  sysenter: [{ o: 0x0f34 }],
  sysexit: [{ o: 0x0f35 }],

  // VEX
  vextractf128: [{ o: 0x19, vex: '256.66.0F3A.W0', ops: [[xmm, m], ymm, imm8], s: S.X }],
  vcvtph2ps: [{ o: 0x13, vex: '256.66.0F38.W0', ops: [ymm, [xmm, m]], s: 256 }],

  vfmadd132pd: [{ o: 0x98, vex: 'DDS.128.66.0F38.W1', en: 'rvm', ops: [xmm, xmm, [xmm, m]] }],
}
