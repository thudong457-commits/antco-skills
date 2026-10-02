#!/usr/bin/env node
// Kiểm cấu trúc bộ skill trước khi phát hành (Node.js >= 18, không phụ thuộc thư viện).
// - frontmatter: name = tên thư mục, mô tả 80..1024 ký tự, metadata.version = VERSION
// - dòng "Phiên bản" khớp version; SKILL.md <= 400 dòng
// - mọi liên kết Markdown tương đối trong skills/ và README trỏ tới file có thật
// - CHANGELOG có mục của VERSION
// Exit: 0 đạt | 1 có lỗi
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = readFileSync(join(root, 'VERSION'), 'utf8').trim()
const errors = []
const e = (f, m) => errors.push(`${f}: ${m}`)

function frontmatter (text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!m) return null
  const out = { metadata: {} }
  let inMeta = false
  for (const line of m[1].split(/\r?\n/)) {
    if (/^metadata:\s*$/.test(line)) { inMeta = true; continue }
    const kv = line.match(/^(\s*)([A-Za-z_-]+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[3].trim()
    if (v.startsWith('"') && v.endsWith('"')) v = JSON.parse(v)
    if (kv[1] && inMeta) out.metadata[kv[2]] = v
    else { inMeta = false; out[kv[2]] = v }
  }
  return out
}

function walk (d, acc = []) {
  for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p) }
  return acc
}

function checkLinks (file) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1]
    if (/^(https?:|mailto:|#)/.test(href)) continue
    const target = resolve(dirname(file), decodeURIComponent(href.split('#')[0]))
    if (!existsSync(target)) e(file.slice(root.length + 1), `liên kết hỏng: ${href}`)
  }
}

const skillsDir = join(root, 'skills')
const names = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory())
for (const n of names) {
  const f = join(skillsDir, n, 'SKILL.md')
  const rel = `skills/${n}/SKILL.md`
  if (!existsSync(f)) { e(rel, 'thiếu SKILL.md'); continue }
  const text = readFileSync(f, 'utf8')
  const fm = frontmatter(text)
  if (!fm) { e(rel, 'thiếu frontmatter'); continue }
  if (fm.name !== n) e(rel, `name "${fm.name}" khác tên thư mục`)
  if (!/^[a-z0-9-]{1,64}$/.test(fm.name || '')) e(rel, 'name phải a-z0-9- <= 64')
  const dl = (fm.description || '').length
  if (dl < 80 || dl > 1024) e(rel, `description dài ${dl} (cần 80..1024)`)
  if (fm.metadata.version !== version) e(rel, `metadata.version ${fm.metadata.version} khác VERSION ${version}`)
  if (!text.includes(`**Phiên bản:** \`${version}\``)) e(rel, 'thiếu dòng "Phiên bản" khớp VERSION')
  const lines = text.split(/\r?\n/).length
  if (lines > 400) e(rel, `${lines} dòng (> 400) - tách sang references/`)
}
for (const f of walk(skillsDir).filter((p) => p.endsWith('.md'))) checkLinks(f)
for (const f of ['README.md']) if (existsSync(join(root, f))) checkLinks(join(root, f))
for (const f of walk(skillsDir).filter((p) => p.endsWith('.json'))) { try { JSON.parse(readFileSync(f, 'utf8')) } catch (x) { e(f.slice(root.length + 1), `JSON lỗi: ${x.message}`) } }
const cl = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
if (!cl.includes(`## [${version}]`)) e('CHANGELOG.md', `thiếu mục ## [${version}]`)

if (errors.length) { for (const x of errors) process.stdout.write(`LỖI ${x}\n`); process.stdout.write(`check_bundle: FAIL (${errors.length} lỗi)\n`); process.exit(1) }
process.stdout.write(`check_bundle: PASS (${names.length} skill, version ${version})\n`)
