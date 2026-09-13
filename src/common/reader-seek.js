// The caller supplies a small probe beginning up to four bytes before target.
// Move backwards to a code point boundary, including UTF-16 surrogate pairs.
export function seekStart(bytes, probeStart, target, format) {
  let i = target - probeStart
  if (format.encoding === 'utf-8') {
    while (i > 0 && (bytes[i] & 192) === 128) i--
    // Keep CRLF together when the target lands on LF.
    if (bytes[i] === 10 && i > 0 && bytes[i - 1] === 13) i--
  } else {
    const unit = (at) => format.encoding === 'utf-16be' ?
      (bytes[at] << 8) | bytes[at + 1] : bytes[at] | (bytes[at + 1] << 8)
    if (unit(i) >= 0xdc00 && unit(i) <= 0xdfff && i >= 2) i -= 2
    if (unit(i) === 10 && i >= 2 && unit(i - 2) === 13) i -= 2
  }
  return probeStart + i
}
