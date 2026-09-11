import { createHash } from 'node:crypto';

const TABLE = 0x110;
const pointerFields = [0xe4, 0xec, 0xf4, 0xfc, 0x108];
export const sha256 = data => createHash('sha256').update(data).digest('hex');

// This codec deliberately supports only the resource layout observed in the
// supplied Watch 4 installer samples, not arbitrary Xiaomi watchfaces.
export function parseBin(bin) {
  if (bin.length < TABLE || bin.readUInt32LE(0) !== 0x1234a55a) throw Error('无效的 BIN 文件头');
  const count = bin.readUInt32LE(0xd8);
  if (!count || count > 1000 || bin.readUInt32LE(0xdc) !== TABLE) throw Error('不支持的资源表');
  const tableEnd = TABLE + count * 16;
  const preview = bin.readUInt32LE(0xac);
  if (preview < tableEnd + 16 || preview + 12 > bin.length) throw Error('无效的预览位置');
  if (bin.readUInt32LE(0x20) !== preview || pointerFields.some(p => bin.readUInt32LE(p) !== tableEnd)) throw Error('不支持的头部指针');
  const first = bin.readUInt32LE(TABLE + 8);
  if (first !== preview + 12 + bin.readUInt32LE(preview + 8) || first > bin.length) throw Error('无效的预览长度');
  const entries = [];
  let cursor = first;
  for (let i = 0; i < count; i++) {
    const row = TABLE + i * 16;
    const offset = bin.readUInt32LE(row + 8);
    const length = bin.readUInt32LE(row + 12);
    if (bin.readUInt32LE(row) !== (0x05000000 + i) || bin.readUInt32LE(row + 4) !== 0 || offset !== cursor || length < 21 || offset + length > bin.length) throw Error(`无效的资源记录 ${i}`);
    const size = bin.readUIntLE(offset, 3);
    const nameLength = bin[offset + 3];
    if (!nameLength || length !== 20 + nameLength + size || bin.subarray(offset + 4, offset + 20).some(v => v !== 0)) throw Error(`无效的资源长度 ${i}`);
    const name = bin.subarray(offset + 20, offset + 20 + nameLength).toString('utf8');
    if (!/^lua\/[a-zA-Z0-9_.-]+$/.test(name) || entries.some(e => e.name === name)) throw Error('无效或重复的资源名');
    entries.push({ name, offset, length, data: bin.subarray(offset + 20 + nameLength, offset + length) });
    cursor += length;
  }
  if (cursor !== bin.length) throw Error('BIN 尾部有未索引数据');
  return { header: bin.subarray(0, TABLE), preview: bin.subarray(preview, first), entries };
}

export function encodeBin(header, preview, entries) {
  const head = Buffer.from(header);
  const tableEnd = TABLE + entries.length * 16;
  const previewOffset = tableEnd + 16;
  head.writeUInt32LE(entries.length, 0xd8);
  head.writeUInt32LE(previewOffset, 0x20);
  head.writeUInt32LE(previewOffset, 0xac);
  for (const field of pointerFields) head.writeUInt32LE(tableEnd, field);
  const table = Buffer.alloc((entries.length + 1) * 16);
  table.writeUInt32LE(0x05000000, entries.length * 16);
  const records = [];
  let offset = previewOffset + preview.length;
  for (const [i, { name, data }] of entries.entries()) {
    const filename = Buffer.from(name);
    if (filename.length > 255 || data.length > 0xffffff) throw Error('资源超出 BIN 字段容量');
    const record = Buffer.alloc(20);
    record.writeUIntLE(data.length, 0, 3);
    record[3] = filename.length;
    const length = 20 + filename.length + data.length;
    table.writeUInt32LE(0x05000000 + i, i * 16);
    table.writeUInt32LE(offset, i * 16 + 8);
    table.writeUInt32LE(length, i * 16 + 12);
    records.push(record, filename, data);
    offset += length;
  }
  const result = Buffer.concat([head, table, preview, ...records]);
  parseBin(result);
  return result;
}
