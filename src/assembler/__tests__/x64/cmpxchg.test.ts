import { X64 } from '../../index'
import { rbx, rcx } from '../../plugins/x86/operand/generator'

const compile = (_) => _.compile([])

describe('X64', function () {
  describe('cmpxchg', function () {
    it('cmpxchg rcx, rbx', function () {
      // 48 0f b1 d9          	cmpxchg %rbx,%rcx
      const _ = X64()
      _._('cmpxchg', [rcx, rbx])
      const bin = compile(_)

      expect([0x48, 0x0f, 0xb1, 0xd9]).toEqual(bin)
    })

    it('cmpxchg [rcx], rbx', function () {
      // 48 0f b1 19          	cmpxchg %rbx,(%rcx)
      const _ = X64()
      _._('cmpxchg', [rcx.ref(), rbx])
      const bin = compile(_)

      expect([0x48, 0x0f, 0xb1, 0x19]).toEqual(bin)
    })

    it('lock cmpxchg [rcx], rbx', function () {
      // f0 48 0f b1 19       	lock cmpxchg %rbx,(%rcx)
      const _ = X64()

      _._('lock')
      _._('cmpxchg', [rcx.ref(), rbx]).lock()
      _._('lock')
      const bin = compile(_)

      expect([0xf0, 0xf0, 0x48, 0x0f, 0xb1, 0x19, 0xf0]).toEqual(bin)
    })
  })
})
