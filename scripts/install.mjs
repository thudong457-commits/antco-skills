#!/usr/bin/env node
// Cài / cập nhật / gỡ bộ Antco skills (Node.js >= 18, không phụ thuộc thư viện).
//   node scripts/install.mjs --target claude-user            # ~/.claude/skills
//   node scripts/install.mjs --target claude-project [--project <thư mục dự án>]   # <dự án>/.claude/skills
//   node scripts/install.mjs --target codex-user             # $CODEX_HOME/skills hoặc ~/.codex/skills
//   node scripts/install.mjs --target agents-project [--project <dir>]             # <dự án>/.agents/skills
//   node scripts/install.mjs --target <đường dẫn thư mục skills bất kỳ>
//   thêm --dry-run để xem trước, --uninstall để gỡ (chỉ gỡ đúng các skill của bộ này)
// Cập nhật = chạy lại: thư mục cùng tên được THAY TOÀN BỘ (không trộn file cũ).
import { readdirSync, existsSync, rmSync, cpSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, dirname, parse } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = readFileSync(join(root, 'VERSION'), 'utf8').trim()
const SHARED_SCRIPTS = ['antco_client.mjs', 'validate_artifacts.mjs', 'render_questions_form.mjs']
const die = (m) => { process.stderr.write(`install: ${m}\n`); process.exit(2) }

const argv = process.argv.slice(2)
const opt = { dryRun: false, uninstall: false, project: process.cwd() }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--target') opt.target = argv[++i]
  else if (a === '--project') opt.project = argv[++i]
  else if (a === '--dry-run') opt.dryRun = true
  else if (a === '--uninstall') opt.uninstall = true
  else if (a === '-h' || a === '--help') { process.stdout.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n') + '\n'); process.exit(0) }
  else die(`tham số lạ: ${a}`)
}
if (!opt.target) die('thiếu --target (claude-user | claude-project | codex-user | agents-project | <thư mục>)')

const presets = {
  'claude-user': () => join(homedir(), '.claude', 'skills'),
  'claude-project': () => join(resolve(opt.project), '.claude', 'skills'),
  'codex-user': () => join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'skills'),
  'agents-project': () => join(resolve(opt.project), '.agents', 'skills')
}
const target = resolve(presets[opt.target] ? presets[opt.target]() : opt.target)
if (target === parse(target).root || target === resolve(homedir())) die('thư mục đích quá rộng (gốc ổ đĩa / thư mục home)')
if (target.startsWith(join(root, 'skills'))) die('thư mục đích nằm trong chính repo')

const skills = readdirSync(join(root, 'skills')).filter((n) => existsSync(join(root, 'skills', n, 'SKILL.md')))
const log = (m) => process.stdout.write((opt.dryRun ? '[dry-run] ' : '') + m + '\n')

if (opt.uninstall) {
  for (const n of skills) {
    const d = join(target, n)
    if (existsSync(d) && statSync(d).isDirectory()) { log(`gỡ ${d}`); if (!opt.dryRun) rmSync(d, { recursive: true, force: true }) }
  }
  log('xong. Không đụng tới skill khác trong thư mục.')
  process.exit(0)
}

if (!opt.dryRun) mkdirSync(target, { recursive: true })
for (const n of skills) {
  const dst = join(target, n)
  if (existsSync(dst)) { log(`thay ${dst}`); if (!opt.dryRun) rmSync(dst, { recursive: true, force: true }) } else log(`cài ${dst}`)
  if (!opt.dryRun) cpSync(join(root, 'skills', n), dst, { recursive: true })
}
const scriptsDst = join(target, 'antco-api-auth', 'scripts')
const tplDst = join(target, 'build-antco-app', 'templates')
log(`chép script dùng chung -> ${scriptsDst}`)
log(`chép mẫu -> ${tplDst}`)
if (!opt.dryRun) {
  mkdirSync(scriptsDst, { recursive: true })
  for (const f of SHARED_SCRIPTS) cpSync(join(root, 'scripts', f), join(scriptsDst, f))
  cpSync(join(root, 'templates'), tplDst, { recursive: true })
  writeFileSync(join(target, 'antco-api-auth', 'ANTCO_SKILLS_VERSION'), version + '\n')
}
log(`Antco skills ${version}: ${skills.length} skill -> ${target}`)
log('Khởi động lại agent (Claude Code / Codex) để nạp skill mới.')
