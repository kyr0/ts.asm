export const noop = () => {}
import * as fastExtend from 'fast-extend'

export const extend = fastExtend.default

export const repeat = (str: string, length: number) => {
  while (str.length < length) str += str

  if (str.length > length) str = str.substr(0, length)

  return str
}

export class UInt64 {
  static hi(a: number, lo: number = UInt64.lo(a)): number {
    let hi = a - lo
    hi /= 4294967296
    return hi
  }

  static lo(a: number): number {
    let lo = a | 0
    if (lo < 0) lo += 4294967296
    return lo
  }

  static joinToNumber(hi: number, lo: number): number {
    // if ((lo !== lo|0) && (lo !== (lo|0) + 4294967296))  throw new Error ("lo out of range: "+lo);
    // if ((hi !== hi|0) && hi >= 1048576)                 throw new Error ("hi out of range: "+hi);

    if (lo < 0) lo += 4294967296
    return hi * 4294967296 + lo
  }

  static toNumber(num64: [number, number]): number {
    let [lo, hi] = num64
    if (lo < 0) lo += 4294967296
    return hi * 4294967296 + lo
  }

  static toNumber64(num: number): [number, number] {
    let lo = num | 0
    if (lo < 0) lo += 4294967296

    let hi = num - lo
    hi /= 4294967296

    return [lo, hi]
  }
}
