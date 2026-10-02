#!/usr/bin/env node
// Sinh form câu hỏi HTML (tự chứa, offline) từ yeu-cau-giai-phap-vN.md - tất định, không gọi mạng.
//   node render_questions_form.mjs <yeu-cau-giai-phap-vN.md> [--out file.html] [--template questions-form.html]
// Exit: 0 ok | 1 lỗi dữ liệu | 2 sai cách dùng
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const die = (code, msg) => { process.stderr.write(`render_questions_form: ${msg}\n`); process.exit(code) }

const argv = process.argv.slice(2)
let src; let out; let tpl
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') out = argv[++i]
  else if (argv[i] === '--template') tpl = argv[++i]
  else if (argv[i] === '-h' || argv[i] === '--help') { process.stdout.write('node render_questions_form.mjs <yeu-cau-giai-phap-vN.md> [--out f.html] [--template f.html]\n'); process.exit(0) }
  else if (!src) src = argv[i]
  else die(2, `tham số thừa: ${argv[i]}`)
}
if (!src) die(2, 'thiếu file Markdown nguồn')
if (!existsSync(src)) die(2, `không thấy ${src}`)
const candidates = [tpl, join(here, '..', 'templates', 'questions-form.html'), join(here, '..', '..', 'build-antco-app', 'templates', 'questions-form.html')].filter(Boolean)
const tplPath = candidates.find((p) => existsSync(p))
if (!tplPath) die(2, 'không thấy templates/questions-form.html (dùng --template)')

const raw = readFileSync(src)
const text = raw.toString('utf8').replace(/^\uFEFF/, '')
const marker = text.match(/<!--\s*antco-artifact:requirements((?:\s+[a-z]+=[^\s]+)*)\s*-->/)
if (!marker) die(1, 'thiếu marker <!-- antco-artifact:requirements ... -->')
const meta = Object.fromEntries(marker[1].trim().split(/\s+/).filter(Boolean).map((kv) => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]))
if (!meta.project || !/^v\d+$/.test(meta.revision || '')) die(1, 'marker cần project= và revision=vN')

function table (id, cols) {
  const lines = text.split(/\r?\n/)
  const at = lines.findIndex((l) => l.trim() === `<!-- antco-table:${id} -->`)
  if (at < 0) return []
  let i = at + 1
  while (i < lines.length && lines[i].trim() === '') i++
  i += 2
  const rows = []
  for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const r = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
    if (r.length !== cols) die(1, `bảng ${id}: dòng sai số cột: ${lines[i].slice(0, 60)}`)
    rows.push(r)
  }
  return rows
}
const ids = (c) => (!c || c === '-' ? [] : c.split(',').map((s) => s.trim()).filter(Boolean))
const plain = (s) => s.replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]*)\*\*/g, '$1')

const requirements = table('requirements', 7).map((r) => ({ id: r[0], text: plain(r[1]), disposition: r[4], clarity: r[5] }))
const questions = table('questions', 7).map((r) => ({
  id: r[0], req_ids: ids(r[1]), text: plain(r[2]),
  options: r[3] === '-' ? [] : r[3].split(' / ').map((s) => plain(s.trim())).filter(Boolean),
  level: r[4], state: r[5], answer: plain(r[6])
}))
if (!requirements.length) die(1, 'bảng requirements rỗng hoặc thiếu')
const title = (text.match(/^#\s+(.+)$/m) || [])[1] || meta.project

const data = { project_slug: meta.project, title: plain(title), source_file: basename(src), source_revision: meta.revision, source_sha256: createHash('sha256').update(raw).digest('hex'), requirements, questions }
// Thoát ký tự để JSON nằm an toàn trong <script type="application/json">
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
const template = readFileSync(tplPath, 'utf8')
if (!template.includes('__ANTCO_FORM_DATA__')) die(2, 'template thiếu chỗ __ANTCO_FORM_DATA__')
const html = template.replace('__ANTCO_FORM_DATA__', () => json)
const target = out || resolve(dirname(src), basename(src).replace(/\.md$/i, '') + '.html')
writeFileSync(target, html)
process.stdout.write(JSON.stringify({ written: target, questions_open: questions.filter((q) => q.state === 'MO').length, source_sha256: data.source_sha256 }, null, 2) + '\n')
