import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { makeBook } from './bin/book.mjs';
import { parseBin, sha256 } from './bin/format.mjs';

try {
  const { values } = parseArgs({ options: { input: { type: 'string' } } });
  const bin = values.input ? readFileSync(values.input) : makeBook({ bytes: Buffer.from('BIN structure check\n'), title: '结构检查', packageName: 'com.cnbarrier.ebook' });
  const parsed = parseBin(bin);
  console.log(JSON.stringify({ input: values.input ?? '内置外壳（检查用正文，不写文件）', bytes: bin.length, sha256: sha256(bin), entries: parsed.entries.map(({ name, offset, length, data }) => ({ name, offset, recordBytes: length, dataBytes: data.length, sha256: sha256(data) })), installer: parsed.entries.find(e => e.name === 'lua/main1.lua')?.data.toString('utf8').match(/\/data\/quickapp\/mass\/[a-zA-Z0-9_.]+/g) }, null, 2));
} catch (error) {
  console.error(`检查失败：${error.message}`);
  process.exitCode = 1;
}
