import { readFileSync } from 'node:fs';
import { encodeBin } from './format.mjs';

const assets = new URL('../assets/', import.meta.url);
export const MAX_TEXT_BYTES = 4 * 1024 * 1024;

export function decodeText(bytes, encoding = 'auto') {
  if (!bytes.length || bytes.length > MAX_TEXT_BYTES) throw Error('TXT 必须非空且不超过 4 MiB（工具暂定上限）');
  if (!['auto', 'utf-8', 'utf-16le', 'utf-16be', 'gb18030', 'gbk'].includes(encoding)) throw Error('不支持的文本编码');
  if (encoding === 'auto') {
    encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  }
  let text;
  try { text = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw Error('TXT 解码失败；GBK/GB18030 文件请指定 --encoding gb18030'); }
  if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) throw Error('TXT 为空白或包含非文本控制字符');
  return text;
}

export function validatePackage(pkg) {
  if (pkg.length > 128 || !/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(pkg)) throw Error('包名格式无效');
  return pkg;
}

export function validateTitle(title) {
  // Restrict characters also interpreted by the device shell. Unicode book
  // titles and spaces are supported; paths and shell substitutions are not.
  if (!title.trim() || title !== title.trim() || /[\u0000-\u001f\u007f<>:"/\\|?*'$`;&(){}\[\]!]/u.test(title) || title === '.' || title === '..' || Buffer.byteLength(title + '.txt') > 240) throw Error('书名无效：请使用不含路径、引号或命令符号的书名（文件名最多 240 UTF-8 字节）');
  return title;
}

export function makeBook({ bytes, title, packageName, encoding = 'auto' }) {
  validateTitle(title);
  validatePackage(packageName);
  const text = decodeText(bytes, encoding);
  const data = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const prefix = readFileSync(new URL('header-preview.bin', assets));
  let script = readFileSync(new URL('../installer.lua', import.meta.url), 'utf8');
  const substitutions = { __PACKAGE__: packageName, __FILENAME__: title + '.txt', __SIZE__: String(data.length) };
  script = script.replace(/__PACKAGE__|__FILENAME__|__SIZE__/g, token => substitutions[token]);
  const entries = [{ name: 'lua/main1.lua', data: Buffer.from(script) }, { name: 'lua/dic', data }];
  for (const name of ['install', 'error', 'runing', 'success', 'title']) entries.push({ name: `lua/${name}.rle`, data: readFileSync(new URL(`${name}.rle`, assets)) });
  return encodeBin(prefix.subarray(0, 0x110), prefix.subarray(0x1c0), entries);
}
