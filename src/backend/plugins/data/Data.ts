import { Expression, IPushable } from '../../expression'
import { SIZE, Tnumber, number64 } from '../../operand'
import { UInt64 } from '../../util'
import CodeBuffer from '../../CodeBuffer'
import formatOctet from './formatOctet'
import formatOctets from './formatOctets'

export type TOctets = number[]

export class Data extends Expression {
  static numbersToOctets(numbers: Tnumber[], size: SIZE, littleEndian = true): TOctets {
    if (size === SIZE.Q) return Data.quadsToOctets(numbers, littleEndian)

    let num = numbers as number[]
    let octets = new Array(numbers.length * size)
    if (littleEndian)
      for (let i = 0; i < numbers.length; i++)
        for (let j = 0; j < size; j++) octets[i * size + j] = (num[i] >> (j * 8)) & 0xff
    else
      for (let i = 0; i < numbers.length; i++)
        for (let j = 0; j < size; j++) octets[i * size + j] = (num[i] >> ((size - j - 1) * 8)) & 0xff
    return octets
  }

  static wordsToOctets(words: number[], littleEndian = true): TOctets {
    return Data.numbersToOctets(words, 2, littleEndian)
  }

  static doublesToOctets(doubles: number[], littleEndian = true): TOctets {
    return Data.numbersToOctets(doubles, 4, littleEndian)
  }

  static quadsToOctets(quads: Tnumber[], littleEndian = true): TOctets {
    if (!(quads instanceof Array)) throw TypeError('Quads must be and array of number or [number, number].')
    if (!quads.length) return []

    let doubles = new Array(quads.length * 2)

    if (typeof quads[0] === 'number') {
      // number[]
      let qnumbers = quads as number[]
      for (let i = 0; i < qnumbers.length; i++) {
        let hi = UInt64.hi(qnumbers[i])
        let lo = UInt64.lo(qnumbers[i])
        if (littleEndian) {
          doubles[i * 2 + 0] = lo
          doubles[i * 2 + 1] = hi
        } else {
          doubles[i * 2 + 0] = hi
          doubles[i * 2 + 1] = lo
        }
      }
    } else if (quads[0] instanceof Array) {
      // number64[]
      let numbers64 = quads as number64[]
      for (let i = 0; i < numbers64.length; i++) {
        let [lo, hi] = numbers64[i]
        if (littleEndian) {
          doubles[i * 2 + 0] = lo
          doubles[i * 2 + 1] = hi
        } else {
          doubles[i * 2 + 0] = hi
          doubles[i * 2 + 1] = lo
        }
      }
    } else throw TypeError('Quads must be and array of number[] or [number, number][].')

    return Data.doublesToOctets(doubles, littleEndian)
  }

  octets: TOctets

  constructor(octets: TOctets = []) {
    super()
    this.octets = octets
    this.length = octets.length
  }

  write(buf: CodeBuffer) {
    buf.pushArray(this.octets)
  }

  bytes(): number {
    return this.octets.length
  }

  toString(margin = '    ', comment = true) {
    const datastr = formatOctets(this.octets)
    const expression = margin + 'db ' + datastr
    let cmt = ''

    if (comment) {
      const spaces = new Array(1 + Math.max(0, Expression.commentColls - expression.length)).join(' ')
      cmt = `${spaces}; ${this.formatOffset()} ${this.bytes()} bytes`
    }

    return expression + cmt
  }
}

export default Data
