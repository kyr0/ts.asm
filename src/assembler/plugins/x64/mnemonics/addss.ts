import { m, xmm } from '../../x86/atoms'
import { EXT } from '../../x86/consts'

export default [{ o: 0xf30f58, ops: [xmm, [xmm, m]], ext: [EXT.SSE2] }]
