export function asBytes(buffer) {
  // Some runtimes return ArrayBuffer rather than the documented Uint8Array.
  return typeof buffer.length === 'number' ? buffer : new Uint8Array(buffer)
}

export function detectFormat(bytes) {
  if (bytes[0] === 255 && bytes[1] === 254) return { encoding: 'utf-16le', dataStart: 2 }
  if (bytes[0] === 254 && bytes[1] === 255) return { encoding: 'utf-16be', dataStart: 2 }
  return { encoding: 'utf-8', dataStart: bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? 3 : 0 }
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
// Return (code << 3) | width (width is 1..4), or 0 for no complete point.
// The largest Unicode value fits safely in a signed 32-bit packed integer.
export function decoder(bytes, encoding, eof) {
  const unit = encoding === 'utf-16be' ?
    (i) => (bytes[i] << 8) | bytes[i + 1] : (i) => bytes[i] | (bytes[i + 1] << 8)
  const incomplete = () => { if (eof) throw encodingError(); return 0 }
  return (i) => {
    if (i >= bytes.length) return 0
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
    return (code << 3) | width
  }
}
