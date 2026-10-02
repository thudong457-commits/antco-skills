#!/usr/bin/env node
// Quét bí mật trước khi commit / phát hành (Node.js >= 18, không phụ thuộc thư viện).
//   node scripts/secret_scan.mjs            # file đã theo dõi + file mới chưa bị .gitignore
//   node scripts/secret_scan.mjs --staged   # nội dung đang stage (dùng trong pre-commit)
//   node scripts/secret_scan.mjs --dir <thư mục>   # quét cây thư mục (không cần git)
// Không bao giờ in nguyên giá trị bí mật - chỉ vị trí + 4 ký tự đầu.
// Exit: 0 sạch | 1 phát hiện | 2 lỗi chạy
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

// Các tiền tố được ghép chuỗi để chính file này không tự khớp mẫu.
const RULES = [
  { id: 'ANTCO_TOKEN', re: new RegExp('antco' + '_pat_' + '[A-Za-z0-9_-]{8,}', 'g') },
  { id: 'ANTCO_KEY_ASSIGN', re: /ANTCO_API_KEY\s*[=:]\s*["']?(?!["']?\s*$)(?!<)(?!\$\{?)([^\s"'#]{8,})/g },
  { id: 'PRIVATE_KEY', re: new RegExp('-----BEGIN [A-Z ]*' + 'PRIVATE KEY-----', 'g') },
  { id: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: 'GITHUB_TOKEN', re: new RegExp('\\b(gh' + '[pousr]_[A-Za-z0-9]{30,}|github' + '_pat_[A-Za-z0-9_]{30,})', 'g') },
  { id: 'OPENAI_KEY', re: new RegExp('\\bs' + 'k-(proj-)?[A-Za-z0-9_-]{32,}', 'g') },
  { id: 'ANTHROPIC_KEY', re: new RegExp('\\bs' + 'k-ant-[A-Za-z0-9_-]{20,}', 'g') },
  { id: 'AWS_KEY', re: new RegExp('\\bAK' + 'IA[0-9A-Z]{16}\\b', 'g') },
  { id: 'GOOGLE_KEY', re: new RegExp('\\bAI' + 'za[0-9A-Za-z_-]{35}\\b', 'g') },
  { id: 'SLACK_TOKEN', re: new RegExp('\\bxo' + 'x[abprs]-[A-Za-z0-9-]{10,}', 'g') },
  { id: 'BEARER_LITERAL', re: /Authorization\s*:\s*Bearer\s+(?!<|\$|\*{3}|\.\.\.)[A-Za-z0-9._-]{20,}/g },
  { id: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g, allow: (m) => /@(example\.(com|org|net|vn)|[a-z0-9-]+\.example|users\.noreply\.github\.com)$/i.test(m) }
]
const BLOCKED_FILES = [
  { id: 'ENV_FILE', test: (f) => /(^|\/)\.env(\.[^/]*)?$/.test(f) && !/(^|\/)\.env\.example$/.test(f) },
  { id: 'KEY_FILE', test: (f) => /\.(pem|key|p12|pfx)$/i.test(f) },
  { id: 'CLIENT_SECRET', test: (f) => /(^|\/)client_secret[^/]*\.json$/i.test(f) || /service-account[^/]*\.json$/i.test(f) },
  { id: 'ANSWERS_FILE', test: (f) => /(^|\/)answers\/answers-[^/]+\.json$/.test(f) && !/(^|\/)examples\//.test(f) }
]
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'outputs'])
const MAX_BYTES = 2 * 1024 * 1024

function git (args) { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) }

function listFiles (mode, dir) {
  if (mode === 'dir') {
    const out = []
    const walk = (d) => { for (const n of readdirSync(d)) { if (SKIP_DIRS.has(n)) continue; const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else out.push(relative(dir, p).split('\\').join('/')) } }
    walk(dir)
    return out.map((f) => ({ file: f, read: () => readFileSync(join(dir, f)) }))
  }
  if (mode === 'staged') {
    return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean)
      .map((f) => ({ file: f, read: () => execFileSync('git', ['show', `:${f}`], { maxBuffer: 64 * 1024 * 1024 }) }))
  }
  return git(['ls-files', '-co', '--exclude-standard', '-z']).split('\0').filter(Boolean)
    .map((f) => ({ file: f, read: () => readFileSync(f) }))
}

const mask = (s) => s.slice(0, 4) + '***'

function main () {
  const argv = process.argv.slice(2)
  let mode = 'tree'; let dir = process.cwd()
  if (argv[0] === '--staged') mode = 'staged'
  else if (argv[0] === '--dir') { mode = 'dir'; dir = argv[1] || '.' }
  else if (argv.length) { process.stderr.write('dùng: secret_scan.mjs [--staged | --dir <thư mục>]\n'); process.exit(2) }
  let files
  try { files = listFiles(mode, dir) } catch (e) { process.stderr.write(`secret_scan: không liệt kê được file (${e.message.split('\n')[0]})\n`); process.exit(2) }
  const hits = []
  for (const { file, read } of files) {
    for (const b of BLOCKED_FILES) if (b.test(file)) hits.push({ file, line: 0, rule: b.id, sample: basename(file) })
    let buf
    try { buf = read() } catch { continue }
    if (buf.length > MAX_BYTES || buf.includes(0)) continue // bỏ file nhị phân / quá lớn
    const lines = buf.toString('utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      for (const r of RULES) {
        r.re.lastIndex = 0
        let m
        while ((m = r.re.exec(line))) {
          if (r.allow && r.allow(m[0])) continue
          hits.push({ file, line: i + 1, rule: r.id, sample: mask(m[0]) })
        }
      }
    })
  }
  if (!hits.length) { process.stdout.write(`secret_scan: sạch (${files.length} file, chế độ ${mode})\n`); process.exit(0) }
  for (const h of hits) process.stdout.write(`CHẶN [${h.rule}] ${h.file}${h.line ? ':' + h.line : ''} ${h.sample}\n`)
  process.stdout.write(`secret_scan: ${hits.length} phát hiện. Gỡ bí mật khỏi file (đưa vào .env đã gitignore), đổi (rotate) token nếu đã lộ, rồi chạy lại.\n`)
  process.exit(1)
}
main()
