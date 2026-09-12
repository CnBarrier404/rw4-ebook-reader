// Fixed resource bounds, independent of book length. Offsets are file bytes.
export const READ_BYTES = 4096
export const ROW_HEIGHT = 40
export const CHARS_PER_ROW = 17
export const BEFORE_ROWS = 24
export const AFTER_ROWS = 64

export function asBytes(buffer) {
  // Some runtimes return ArrayBuffer rather than the documented Uint8Array.
  return typeof buffer.length === 'number' ? buffer : new Uint8Array(buffer)
}

export function detectFormat(bytes) {
  if (bytes[0] === 255 && bytes[1] === 254) return { encoding: 'utf-16le', dataStart: 2 }
  if (bytes[0] === 254 && bytes[1] === 255) return { encoding: 'utf-16be', dataStart: 2 }
  return { encoding: 'utf-8', dataStart: bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? 3 : 0 }
}

export function windowStart(anchor, format) {
  const start = Math.max(format.dataStart, anchor - 1024)
  return format.encoding === 'utf-8' ? start : start - (start - format.dataStart) % 2
}

export function restoreOffset(value, meta) {
  try {
    const mark = JSON.parse(value)
    const sameFormat = mark.version === 2 ? mark.encoding === meta.encoding && mark.dataStart === meta.dataStart :
      mark.version === 1 && meta.encoding === 'utf-16le' && meta.dataStart === 2
    if (sameFormat && mark.length === meta.length &&
        mark.modified === meta.lastModifiedTime && Number.isFinite(mark.offset) &&
        mark.offset >= meta.dataStart && mark.offset < meta.length && mark.offset % 1 === 0 &&
        (meta.encoding === 'utf-8' || (mark.offset - meta.dataStart) % 2 === 0)) return mark.offset
  } catch (error) { /* Missing or damaged progress starts at the beginning. */ }
  return meta.dataStart
}

function encodingError() {
  const error = Error('编码不支持或文件损坏，请转为 UTF-8')
  error.code = 'TEXT_ENCODING'
  return error
}

// Decode a single code point, retaining byte positions. No whole-file string,
// TextDecoder, encoding tables, or Node dependency on the watch.
function decoder(bytes, encoding, eof) {
  const unit = encoding === 'utf-16be' ?
    (i) => (bytes[i] << 8) | bytes[i + 1] : (i) => bytes[i] | (bytes[i + 1] << 8)
  const incomplete = () => { if (eof) throw encodingError(); return null }
  return (i) => {
    if (i >= bytes.length) return null
    let code = bytes[i]
    let width = 1
    if (encoding === 'utf-8') {
      if (code >= 128) {
        width = code >= 194 && code <= 223 ? 2 : code >= 224 && code <= 239 ? 3 : code >= 240 && code <= 244 ? 4 : 0
        if (!width) throw encodingError()
        if (i + width > bytes.length) return incomplete()
        code &= (1 << (7 - width)) - 1
        for (let j = 1; j < width; j++) {
          if ((bytes[i + j] & 192) !== 128) throw encodingError()
          code = (code << 6) | (bytes[i + j] & 63)
        }
        if (code < (width === 2 ? 128 : width === 3 ? 2048 : 65536) ||
            code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw encodingError()
      }
    } else {
      if (i + 2 > bytes.length) return incomplete()
      code = unit(i)
      width = 2
      if (code >= 0xd800 && code <= 0xdbff) {
        if (i + 4 > bytes.length) return incomplete()
        const low = unit(i + 2)
        if (low < 0xdc00 || low > 0xdfff) throw encodingError()
        code = 0x10000 + (code - 0xd800) * 1024 + low - 0xdc00
        width = 4
      } else if (code >= 0xdc00 && code <= 0xdfff) throw encodingError()
    }
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) throw encodingError()
    return { code, width }
  }
}

export function makeWindow(bytes, start, anchor, size, format = { encoding: 'utf-16le', dataStart: 2 }) {
  const eof = start + bytes.length === size
  const read = decoder(bytes, format.encoding, eof)
  const rows = []
  let i = 0
  // Only a backward read may start inside a code point; never hide bad input
  // at the actual beginning of a file.
  if (start > format.dataStart) {
    if (format.encoding === 'utf-8') {
      while (i < bytes.length && (bytes[i] & 192) === 128) i++
    } else {
      const first = format.encoding === 'utf-16be' ? (bytes[0] << 8) | bytes[1] : bytes[0] | (bytes[1] << 8)
      if (first >= 0xdc00 && first <= 0xdfff) i += 2
    }
  }
  let text = ''
  let count = 0
  let offset = start + i
  let anchorIndex = -1
  const emit = (end) => {
    if (offset === anchor) anchorIndex = rows.length
    rows.push({ text: text || ' ', offset, end })
    if (end <= anchor && rows.length > BEFORE_ROWS) rows.shift()
    text = ''
    count = 0
    offset = end
  }
  while (i < bytes.length) {
    if (start + i === anchor && text) emit(anchor)
    const point = read(i)
    if (!point) break
    const { code, width } = point
    if (code === 13 || code === 10) {
      const next = code === 13 ? read(i + width) : null
      if (code === 13 && !next && !eof) break
      i += width
      if (next && next.code === 10) i += next.width
      emit(start + i)
    } else {
      text += code === 9 ? ' ' : code <= 65535 ? String.fromCharCode(code) :
        String.fromCharCode(0xd800 + ((code - 65536) >> 10), 0xdc00 + ((code - 65536) & 1023))
      i += width
      count++
      if (count === CHARS_PER_ROW) {
        // Consume a following newline with the full row, not as a blank row.
        const next = read(i)
        if (!next && !eof) break
        if (next && next.code === 13) {
          const after = read(i + next.width)
          if (!after && !eof) break
          i += next.width
          if (after && after.code === 10) i += after.width
        } else if (next && next.code === 10) i += next.width
        emit(start + i)
      }
    }
    if (anchorIndex >= 0 && rows.length - anchorIndex >= AFTER_ROWS) break
  }
  if (text && start + i === size) emit(size)
  if (!rows.length) return { rows: [], index: 0 }
  const index = rows.findIndex((row) => row.offset === anchor)
  if (index < 0) throw Error('阅读位置无效')
  return { rows, index }
}
