#!/usr/bin/env node
// Antco Public API v1 - client tối giản cho agent (Node.js >= 18, không phụ thuộc thư viện).
// - Đọc ANTCO_BASE_URL + ANTCO_API_KEY từ biến môi trường (hoặc --env <file .env> do người dùng chỉ định).
// - GET chạy thật. POST/PUT/PATCH/DELETE mặc định chỉ IN request (đã che token); thêm --apply mới gửi.
// - --server-dry-run: gửi thật kèm dryRun=1 (máy chủ chỉ kiểm, không ghi) - không cần --apply.
// - Không theo redirect, chỉ https (http chỉ cho localhost/127.0.0.1), không bao giờ in token.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'

const VERSION = '1.0.0'
const API_PREFIX = '/api/public/v1'
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const EXIT = { OK: 0, USAGE: 2, CONFIG: 3, API: 4, NETWORK: 5 }

const HELP = `antco_client.mjs ${VERSION}

Cách dùng:
  node antco_client.mjs <METHOD> <path> [tuỳ chọn]
  node antco_client.mjs whoami

  <path>  bắt đầu bằng "/" và tương đối với ${API_PREFIX} (VD /whoami, /objects/crm%3Aaccount).
          Có thể ghi đủ "${API_PREFIX}/..." - script không nhân đôi tiền tố.

Tuỳ chọn:
  --body <file.json>         Body JSON từ file
  --data '<json>'            Body JSON trực tiếp
  --query k=v                Thêm tham số truy vấn (lặp lại được)
  --apply                    Cho phép gửi thật lệnh ghi (POST/PUT/PATCH/DELETE)
  --server-dry-run           Gửi kèm dryRun=1 (máy chủ chỉ kiểm hợp lệ) - không cần --apply
  --run-id <id>              Header X-Antco-Run-Id (3-80 ký tự A-Z a-z 0-9 _ . : -; quy ước ar_yyyymmdd_xxxxxx)
  --env <path>               Đọc ANTCO_BASE_URL / ANTCO_API_KEY từ file .env này (chỉ 2 khoá đó)
  --timeout <giây>           Mặc định 30
  --out <file>               Ghi body response ra file JSON
  --quiet                    Chỉ in body response
  -h, --help                 Trợ giúp

Exit: 0 ok | 2 sai cách dùng | 3 thiếu/sai cấu hình | 4 API lỗi | 5 lỗi mạng/timeout/redirect`

function fail (code, msg) {
  process.stderr.write(`antco_client: ${msg}\n`)
  process.exit(code)
}

function parseArgs (argv) {
  const o = { query: [], apply: false, serverDryRun: false, quiet: false, timeout: 30 }
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => { if (i + 1 >= argv.length) fail(EXIT.USAGE, `thiếu giá trị cho ${a}`); return argv[++i] }
    if (a === '-h' || a === '--help') { process.stdout.write(HELP + '\n'); process.exit(0) }
    else if (a === '--body') o.bodyFile = next()
    else if (a === '--data') o.data = next()
    else if (a === '--query') o.query.push(next())
    else if (a === '--apply') o.apply = true
    else if (a === '--server-dry-run') o.serverDryRun = true
    else if (a === '--run-id') o.runId = next()
    else if (a === '--env') o.envFile = next()
    else if (a === '--timeout') o.timeout = Number(next())
    else if (a === '--out') o.out = next()
    else if (a === '--quiet') o.quiet = true
    else if (a.startsWith('--')) fail(EXIT.USAGE, `tuỳ chọn lạ ${a}`)
    else pos.push(a)
  }
  if (pos.length === 1 && pos[0].toLowerCase() === 'whoami') { o.method = 'GET'; o.path = '/whoami' }
  else if (pos.length === 2) { o.method = pos[0].toUpperCase(); o.path = pos[1] }
  else fail(EXIT.USAGE, 'cần <METHOD> <path> (xem --help)')
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(o.method)) fail(EXIT.USAGE, `phương thức không hỗ trợ: ${o.method}`)
  if (!(o.timeout > 0 && o.timeout <= 300)) fail(EXIT.USAGE, '--timeout phải trong 1..300 giây')
  return o
}

/** Đọc đúng 2 khoá từ file .env người dùng chỉ định; bỏ qua mọi khoá khác. */
function loadEnvFile (file) {
  if (!existsSync(file)) fail(EXIT.CONFIG, `không thấy file env: ${file}`)
  const out = {}
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?(ANTCO_BASE_URL|ANTCO_API_KEY)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

function resolveConfig (o) {
  const fromFile = o.envFile ? loadEnvFile(o.envFile) : {}
  const base = process.env.ANTCO_BASE_URL || ''
  const key = process.env.ANTCO_API_KEY || ''
  for (const k of ['ANTCO_BASE_URL', 'ANTCO_API_KEY']) {
    const envV = process.env[k]; const fileV = fromFile[k]
    if (envV && fileV && envV !== fileV) fail(EXIT.CONFIG, `${k} trong biến môi trường khác với file ${o.envFile} - chọn một nguồn rồi chạy lại`)
  }
  const baseUrl = (fromFile.ANTCO_BASE_URL || base).trim()
  const apiKey = (fromFile.ANTCO_API_KEY || key).trim()
  if (!baseUrl) fail(EXIT.CONFIG, 'thiếu ANTCO_BASE_URL (origin workspace, VD https://<cong-ty>.example.com)')
  if (!apiKey) fail(EXIT.CONFIG, 'thiếu ANTCO_API_KEY (Antco: Cài đặt > Tích hợp > API Token)')
  if (/\s/.test(apiKey)) fail(EXIT.CONFIG, 'ANTCO_API_KEY chứa khoảng trắng - kiểm tra lại cách sao chép')
  let u
  try { u = new URL(baseUrl) } catch { fail(EXIT.CONFIG, 'ANTCO_BASE_URL không phải URL hợp lệ') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) fail(EXIT.CONFIG, 'ANTCO_BASE_URL phải dùng https://')
  if (u.username || u.password) fail(EXIT.CONFIG, 'ANTCO_BASE_URL không được chứa thông tin đăng nhập')
  return { origin: u.origin, apiKey }
}

function buildUrl (origin, path, query, dryRun) {
  // Git Bash (MSYS) tự đổi "/objects" thành "C:/Program Files/Git/objects": báo cách tránh thay vì gọi sai.
  if (/^[A-Za-z]:[\\/]/.test(path)) fail(EXIT.USAGE, 'path bị Git Bash đổi thành đường dẫn ổ đĩa - viết không có "/" đầu (VD objects/crm:account) hoặc đặt MSYS_NO_PATHCONV=1')
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) fail(EXIT.USAGE, 'path không nhận URL tuyệt đối')
  if (!path.startsWith('/')) path = '/' + path
  if (path.startsWith('//')) fail(EXIT.USAGE, 'path phải bắt đầu bằng một dấu "/" (không nhận URL tuyệt đối)')
  if (/^\/[a-z]+:/i.test(path) || path.includes('\\')) fail(EXIT.USAGE, 'path không hợp lệ')
  const full = path.startsWith(API_PREFIX + '/') || path === API_PREFIX ? path : API_PREFIX + path
  const url = new URL(full, origin)
  if (url.origin !== origin) fail(EXIT.USAGE, 'path dẫn ra ngoài workspace')
  if (!url.pathname.startsWith(API_PREFIX + '/')) fail(EXIT.USAGE, `chỉ gọi được ${API_PREFIX}/*`)
  for (const q of query) {
    const i = q.indexOf('=')
    if (i <= 0) fail(EXIT.USAGE, `--query cần dạng k=v: ${q}`)
    url.searchParams.append(q.slice(0, i), q.slice(i + 1))
  }
  if (dryRun) url.searchParams.set('dryRun', '1')
  return url
}

function readBody (o) {
  if (o.bodyFile && o.data) fail(EXIT.USAGE, 'chỉ dùng một trong --body / --data')
  let text = null
  if (o.bodyFile) {
    if (!existsSync(o.bodyFile)) fail(EXIT.USAGE, `không thấy file body: ${o.bodyFile}`)
    text = readFileSync(o.bodyFile, 'utf8')
  } else if (o.data) text = o.data
  if (text === null) return null
  try { return JSON.parse(text) } catch (e) { fail(EXIT.USAGE, `body không phải JSON hợp lệ: ${e.message}`) }
}

/** Che token ở mọi chỗ có thể xuất hiện (response lạ, thông báo lỗi). */
function redact (s, apiKey) {
  let out = String(s)
  if (apiKey && apiKey.length >= 6) out = out.split(apiKey).join('***')
  return out.replace(/antco_pat_[A-Za-z0-9_-]{6,}/g, 'antco_pat_***')
}

const RUN_ID = /^[A-Za-z0-9_.:-]{3,80}$/

async function main () {
  const o = parseArgs(process.argv.slice(2))
  const isWrite = WRITE_METHODS.has(o.method)
  if (o.runId && !RUN_ID.test(o.runId)) fail(EXIT.USAGE, 'run-id phải 3-80 ký tự A-Z a-z 0-9 _ . : - (quy ước: ar_<yyyymmdd>_<ngẫu nhiên>)')
  const body = readBody(o)
  if (body !== null && o.method === 'GET') fail(EXIT.USAGE, 'GET không nhận body')
  const cfg = resolveConfig(o)
  const url = buildUrl(cfg.origin, o.path, o.query, o.serverDryRun)

  const headers = { Accept: 'application/json', 'User-Agent': `antco-skills-client/${VERSION}` }
  if (body !== null) headers['Content-Type'] = 'application/json'
  if (o.runId) headers['X-Antco-Run-Id'] = o.runId

  if (isWrite && !o.apply && !o.serverDryRun) {
    const plan = { mode: 'client-dry-run', note: 'Chưa gửi. Thêm --server-dry-run để máy chủ kiểm, hoặc --apply để ghi thật.', method: o.method, url: url.toString(), headers: { ...headers, Authorization: 'Bearer ***' }, body }
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n')
    return EXIT.OK
  }

  headers.Authorization = `Bearer ${cfg.apiKey}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), o.timeout * 1000)
  let res
  try {
    res = await fetch(url, { method: o.method, headers, body: body === null ? undefined : JSON.stringify(body), redirect: 'manual', signal: ctrl.signal })
  } catch (e) {
    clearTimeout(timer)
    const why = e.name === 'AbortError' ? `timeout sau ${o.timeout}s` : redact(e.message, cfg.apiKey)
    const hint = isWrite ? ' Lệnh ghi có thể ĐÃ được thực hiện: đọc lại (GET, hoặc GET /runs/<run-id>/items) trước khi gửi lại.' : ''
    fail(EXIT.NETWORK, `lỗi mạng: ${why}.${hint}`)
  }
  clearTimeout(timer)
  if (res.status >= 300 && res.status < 400) fail(EXIT.NETWORK, `máy chủ chuyển hướng (HTTP ${res.status}) - không theo để tránh lộ token; kiểm tra ANTCO_BASE_URL`)

  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* không phải JSON */ }
  // Phong bì Antco: { success, data, meta?, error? }. /openapi.json trả thẳng tài liệu (không có success).
  const ok = res.ok && (json === null || json.success !== false)
  const safeBody = json !== null ? JSON.parse(redact(JSON.stringify(json), cfg.apiKey)) : redact(text.slice(0, 2000), cfg.apiKey)

  if (o.out) writeFileSync(o.out, JSON.stringify(safeBody, null, 2) + '\n')
  if (o.quiet) process.stdout.write(JSON.stringify(safeBody, null, 2) + '\n')
  else {
    const summary = { status: res.status, success: ok, method: o.method, path: url.pathname + url.search }
    if (json?.error?.code) summary.errorCode = json.error.code
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining !== null) summary.rateLimitRemaining = Number(remaining)
    if (o.runId) summary.runId = o.runId
    if (res.status === 429) summary.retryAfterSeconds = Number(res.headers.get('retry-after')) || null
    process.stdout.write(JSON.stringify({ ...summary, body: safeBody }, null, 2) + '\n')
  }
  return ok ? EXIT.OK : EXIT.API
}

main().then((code) => process.exit(code), (e) => fail(EXIT.NETWORK, `lỗi không mong đợi: ${e?.message || e}`))
