import { X64 } from '../../index'

describe('Enter and Leave', function () {
  describe('enter', function () {
    it('enter 1, 2', function () {
      // c8 01 00 02          	enterq $0x1,$0x2
      const _ = X64()
      _._('enter', [1, 2])
      const bin = _.compile([])
      expect(bin).toEqual([0xc8, 1, 0, 2])
    })

    it('enter -1, -2', function () {
      // c8 ff ff fe          	enterq $0xffff,$0xfe
      const _ = X64()
      _._('enter', [-1, -2])
      const bin = _.compile([])
      expect(bin).toEqual([0xc8, 0xff, 0xff, 0xfe])
    })
  })

  describe('leave', function () {
    it('leaveq', function () {
      // c9                   	leaveq
      const _ = X64()
      _._('leave', [], 64)
      const bin = _.compile([])
      expect(bin).toEqual([0xc9])
    })

    it('leavew', function () {
      // 66 c9                	leavew
      const _ = X64()
      _._('leave', [], 16)
      const bin = _.compile([])
      expect(bin).toEqual([0x66, 0xc9])
    })
  })
})
