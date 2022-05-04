import { immu8 } from '../atoms'
import { ITableX86 } from '../table'

const table: ITableX86 = {
  cpuid: [{ o: 0x0fa2 }],

  // INT Software interrupt
  int: [
    {},
    // CC INT 3 NP Valid Valid Interrupt 3—trap to debugger.
    { o: 0xcc, ops: [3] },
    // CD ib INT imm8 I Valid Valid Interrupt vector specified by immediate byte.
    { o: 0xcd, ops: [immu8] },
  ],
}

export default table
