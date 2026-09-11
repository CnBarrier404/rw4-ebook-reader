import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { makeBook } from './bin/book.mjs';
import { sha256 } from './bin/format.mjs';

try {
  const { values } = parseArgs({ options: {
    input: { type: 'string' }, output: { type: 'string' }, package: { type: 'string' },
    title: { type: 'string' }, encoding: { type: 'string', default: 'auto' },
    force: { type: 'boolean', default: false }, help: { type: 'boolean' }
  } });
  if (values.help) {
    console.log('npm run pack-book -- --input <书籍.txt> --output <表盘.bin> [--package com.example.reader] [--title 书名] [--encoding auto|utf-8|utf-16le|utf-16be|gb18030|gbk] [--force]\n默认包名来自 src/manifest.json；自动识别 UTF BOM，无 BOM 按 UTF-8 严格解码。输出已有文件时需 --force。');
  } else {
    if (!values.input || !values.output) throw Error('必须指定 --input 和 --output；使用 --help 查看用法');
    if (extname(values.input).toLowerCase() !== '.txt') throw Error('仅支持 .txt 输入');
    if (extname(values.output).toLowerCase() !== '.bin') throw Error('输出必须为 .bin');
    const input = resolve(values.input), output = resolve(values.output);
    if (input.toLowerCase() === output.toLowerCase()) throw Error('输入输出不能相同');
    const packageName = values.package ?? JSON.parse(readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8')).package;
    const title = values.title ?? basename(input, extname(input));
    const result = makeBook({ bytes: readFileSync(input), title, packageName, encoding: values.encoding });
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, result, { flag: values.force ? 'w' : 'wx' });
    console.log(`已生成：${output}\n目标：/data/quickapp/mass/${packageName}/${title}.txt\n大小：${result.length} 字节\nSHA-256：${sha256(result)}\n已验证 BIN 结构；手机工具接收与实机导入仍需验证。`);
  }
} catch (error) {
  console.error(`打包失败：${error.message}`);
  process.exitCode = 1;
}
