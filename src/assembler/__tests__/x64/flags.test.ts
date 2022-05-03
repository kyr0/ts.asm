import { X64 } from '../../index'

const compile = (_) => _.compile([])

describe('Flag Control', function () {
  it('stc', function () {
    // f9                   	stc
    const _ = X64()
    _._('stc')
    const bin = compile(_)
    expect(bin).toEqual([0xf9])
  })

  it('clc', function () {
    // f8                   	clc
    const _ = X64()
    _._('clc')
    const bin = compile(_)
    expect(bin).toEqual([0xf8])
  })

  it('cmc', function () {
    // f5                   	cmc
    const _ = X64()
    _._('cmc')
    const bin = compile(_)
    expect(bin).toEqual([0xf5])
  })

  it('cld', function () {
    // fc                   	cld
    const _ = X64()
    _._('cld')
    const bin = compile(_)
    expect(bin).toEqual([0xfc])
  })

  it('std', function () {
    // fd                   	std
    const _ = X64()
    _._('std')
    const bin = compile(_)
    expect(bin).toEqual([0xfd])
  })

  it('pushf', function () {
    // 9c                   	pushfq
    const _ = X64()
    _._('pushf')
    const bin = compile(_)
    expect(bin).toEqual([0x9c])
  })

  it('popf', function () {
    // 9d                   	popfq
    const _ = X64()
    _._('popf')
    const bin = compile(_)
    expect(bin).toEqual([0x9d])
  })

  it('sti', function () {
    // fb                   	sti
    const _ = X64()
    _._('sti')
    const bin = compile(_)
    expect(bin).toEqual([0xfb])
  })

  it('cli', function () {
    // fa                   	cli
    const _ = X64()
    _._('cli')
    const bin = compile(_)
    expect(bin).toEqual([0xfa])
  })
})
