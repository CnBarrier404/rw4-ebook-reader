import { decoder } from './reader-text'

export const PAGE_BYTES = 1024
export const PAGE_ROWS = 8
const COLUMNS = 17

export function previousStart(end, format) {
  const start = Math.max(format.dataStart, end - PAGE_BYTES)
  return format.encoding === 'utf-8' ? start : start - (start - format.dataStart) % 2
}

// Forward reads start at a page boundary. Backward reads end at one.
// Keep only eight rows, including during backward decoding.
export function makePage(bytes, start, end, format, backwards = false) {
  const eof = start + bytes.length === end
  const read = decoder(bytes, format.encoding, eof)
  let i = 0
  if (backwards && start > format.dataStart) {
    if (format.encoding === 'utf-8') {
      while (i < bytes.length && (bytes[i] & 192) === 128) i++
    } else {
      const first = format.encoding === 'utf-16be' ? (bytes[0] << 8) | bytes[1] : bytes[0] | (bytes[1] << 8)
      if (first >= 0xdc00 && first <= 0xdfff) i += 2
    }
  }
  const rows = []
  let offset = start + i
  let count = 0
  const units = []
  const emit = () => {
    rows.push({ text: count ? String.fromCharCode.apply(null, units) : ' ', offset, end: start + i })
    if (rows.length > PAGE_ROWS) rows.shift()
    offset = start + i
    count = 0
    units.length = 0
  }
  while (i < bytes.length) {
    const point = read(i)
    if (!point) break
    const code = point >>> 3
    i += point & 7
    if (code === 10 || code === 13) {
      const next = code === 13 ? read(i) : 0
      if (code === 13 && !next && !eof) break
      if (next && (next >>> 3) === 10) i += next & 7
      emit()
    } else {
      if (code <= 65535) units.push(code === 9 ? 32 : code)
      else units.push(0xd800 + ((code - 65536) >> 10), 0xdc00 + ((code - 65536) & 1023))
      if (++count === COLUMNS) {
        const next = read(i)
        if (!next && !eof) break
        if (next && (next >>> 3) === 13) {
          const after = read(i + (next & 7))
          if (!after && !eof) break
          i += next & 7
          if (after && (after >>> 3) === 10) i += after & 7
        } else if (next && (next >>> 3) === 10) i += next & 7
        emit()
      }
    }
    if (!backwards && rows.length === PAGE_ROWS) break
  }
  if (count && start + i === end) emit()
  if (!rows.length) throw Error('empty page')
  return { start: rows[0].offset, end: rows[rows.length - 1].end, rows }
}
