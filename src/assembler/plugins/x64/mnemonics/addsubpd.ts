import { m, xmm } from '../../x86/atoms'
import { EXT } from '../../x86/consts'

export default [{ o: 0x660fd0, ops: [xmm, [xmm, m]], ext: [EXT.SSE3] }]
