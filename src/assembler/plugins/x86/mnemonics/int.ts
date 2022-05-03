import { immu8 } from '../atoms'

// INT Software interrupt
export default [
  {},
  // CC INT 3 NP Valid Valid Interrupt 3—trap to debugger.
  { o: 0xcc, ops: [3] },
  // CD ib INT imm8 I Valid Valid Interrupt vector specified by immediate byte.
  { o: 0xcd, ops: [immu8] },
]
