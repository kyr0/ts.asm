import { asm } from '../dist'
import { Buffer } from 'buffer'

describe('asm.ts - jmp', () => {
  it.only('can define a bootsector using macro assembly and instruction pointer', () => {
    const machineCode = asm()
      .code()
      .label('hang') // declare label
      .jmp('hang') // jump to iself; initinite loop
      .macro((asm) => {
        // pad until 510 bytes are reached
        for (let i = 0; i < 510 - asm.$; i++) {
          asm.code().db(0x0)
        }
      })
      // this data is put at the end, packed in the data section
      .data()
      // internal big endian to little endian conversion
      .dw(0xaa55)
      .assemble()

    expect(machineCode.slice(0, 2).toString('hex')).toEqual(Buffer.from([0xeb, 0xfe]).toString('hex'))
    expect(machineCode.slice(510, 512).toString('hex')).toEqual(Buffer.from([0x55, 0xaa]).toString('hex'))
    expect(machineCode.byteLength).toEqual(512)
  })
})
