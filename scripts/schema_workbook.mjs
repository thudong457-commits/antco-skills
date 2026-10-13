#!/usr/bin/env node
// Workbook thiết kế dữ liệu Antco (đối tượng + trường + lựa chọn) <-> JSON -> kế hoạch gọi Public API theo thứ tự phụ thuộc -> áp dụng.
// Node.js >= 18, không thư viện ngoài. Gọi API qua antco_client.mjs (token chỉ đi qua 1 chỗ, luôn bị che).
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readXlsx, writeXlsx } from './xlsx_lite.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CLIENT = join(HERE, 'antco_client.mjs')
const HELP = `schema_workbook.mjs - workbook thiết kế dữ liệu Antco

  template <out.xlsx>                       Workbook trống có tiêu đề cột + sheet hướng dẫn
  export   <schema.json> <out.xlsx>         JSON thiết kế -> Excel cho người dùng duyệt / sửa
  import   <in.xlsx> <out.json>             Excel -> JSON (kiểm hợp lệ)
  validate <schema.json|.xlsx>              Chỉ kiểm hợp lệ (không gọi API)
  plan     <schema.json|.xlsx> <out-dir>    Sinh plan.json + plan.md (thứ tự: đối tượng -> trường thường -> tra cứu -> công thức -> tổng hợp)
  apply    <plan.json> [--env .env] [--apply --run-id <id>]
           Không --apply: KIỂM (đọc workspace + dryRun máy chủ các bước kiểm được, không ghi gì).
           --apply: từng bước dryRun rồi ghi thật; dừng ở lỗi đầu tiên; trạng thái ở plan.state.json (chạy lại = làm tiếp).

Exit: 0 ok | 1 dữ liệu không hợp lệ / API lỗi | 2 sai cách dùng`

const MODULES = ['crm', 'hrm', 'fsm', 'scm', 'scm_assets', 'fin', 'okr', 'lms', 'mkt', 'omni']
const TYPES = ['text', 'phone', 'bool', 'textarea', 'email', 'select', 'date', 'datetime', 'url', 'multiselect', 'number', 'label', 'percent', 'file', 'rating', 'money', 'regex', 'lookup', 'autonumber', 'formula', 'rollup']
const COMPUTED = new Set(['autonumber', 'formula', 'rollup'])
const SLUG = /^[a-z][a-z0-9_]{1,49}$/
const SHEETS = {
  objects: { name: 'Doi tuong', cols: [['slug', 'Mã'], ['label', 'Tên'], ['plural', 'Tên số nhiều'], ['module', 'Phân hệ'], ['objectType', 'Loại'], ['parentRef', 'Đối tượng cha'], ['junctionRefs', 'Hai đầu trung gian'], ['nameLabel', 'Nhãn tên bản ghi'], ['nameType', 'Kiểu tên bản ghi'], ['namePrefix', 'Tiền tố số'], ['nameDigits', 'Số chữ số'], ['description', 'Mô tả']] },
  fields: { name: 'Truong', cols: [['object', 'Đối tượng'], ['slug', 'Mã'], ['label', 'Nhãn'], ['type', 'Kiểu'], ['required', 'Bắt buộc'], ['showInList', 'Hiện ở danh sách'], ['unique', 'Duy nhất'], ['lookup', 'Tra cứu tới'], ['multiple', 'Nhiều giá trị'], ['decimals', 'Số lẻ'], ['min', 'Nhỏ nhất'], ['max', 'Lớn nhất'], ['formula', 'Công thức'], ['returnType', 'Kiểu kết quả'], ['valueType', 'Kiểu giá trị'], ['rollupObject', 'Tổng hợp từ'], ['rollupLink', 'Trường liên kết ở con'], ['rollupFn', 'Hàm tổng hợp'], ['rollupField', 'Trường được tổng hợp'], ['help', 'Gợi ý'], ['sensitive', 'Nhạy cảm']] },
  options: { name: 'Lua chon', cols: [['object', 'Đối tượng'], ['field', 'Trường'], ['value', 'Giá trị'], ['label', 'Nhãn'], ['color', 'Màu'], ['isDefault', 'Mặc định']] }
}
const GUIDE = [
  ['Hướng dẫn'],
  ['Mỗi dòng sheet "Doi tuong" = 1 đối tượng tự tạo. Mã: chữ thường không dấu, số, _ (2-50 ký tự), không đổi được sau khi tạo.'],
  [`Phân hệ: ${MODULES.join(' | ')}. Loại: normal | child (cần Đối tượng cha) | junction (Hai đầu trung gian: 2 mã cách nhau dấu phẩy).`],
  ['Kiểu tên bản ghi: text (người dùng nhập) | autonumber (Tiền tố số VD KS-{yyyy}-, Số chữ số 1-10).'],
  ['Sheet "Truong": Đối tượng = mã đối tượng trong sheet "Doi tuong" hoặc ref có sẵn (VD crm:account) để thêm trường vào đối tượng có sẵn.'],
  [`Kiểu: ${TYPES.join(', ')}. Đối tượng Con tự có trường Tra cứu phụ thuộc về cha - không khai báo.`],
  ['Tra cứu tới: mã đối tượng trong workbook hoặc ref có sẵn. Tổng hợp: Tổng hợp từ = đối tượng con, Trường liên kết ở con = $parent (tự tìm), Hàm: sum | count | min | max | avg.'],
  ['Công thức: theo cú pháp công thức Antco (skill antco-fields, references/formula.md); Kiểu kết quả number | text | bool | date; Kiểu giá trị number | money | percent.'],
  ['Cột Có / Không: điền x, có, true hoặc 1. Sheet "Lua chon": các lựa chọn của trường select / multiselect, Màu dạng #2563EB.'],
  ['Sau khi sửa: node scripts/schema_workbook.mjs import <file.xlsx> schema.json rồi plan + apply (xem skill antco-schema-workbook).']
]

const die = (code, msg) => { process.stderr.write(`schema_workbook: ${msg}\n`); process.exit(code) }
const yes = (v) => ['x', 'có', 'co', 'true', '1', 'yes', 'y'].includes(String(v ?? '').trim().toLowerCase())
const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v))
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && !v.length)))

// ---------- Excel <-> JSON ----------
function sheetRows (wb, key) {
  const def = SHEETS[key]
  const rows = wb[def.name] || []
  if (!rows.length) return []
  const head = rows[0].map((h) => String(h).match(/\(([A-Za-z]+)\)\s*$/)?.[1] || String(h).trim())
  return rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== '')).map((r) => Object.fromEntries(head.map((k, i) => [k, String(r[i] ?? '').trim()])))
}

export function fromWorkbook (wb) {
  const objects = sheetRows(wb, 'objects').map((r) => clean({
    slug: r.slug, label: r.label, plural: r.plural || r.label, module: r.module, objectType: r.objectType || 'normal', parentRef: r.parentRef,
    junctionRefs: r.junctionRefs ? r.junctionRefs.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : undefined, nameLabel: r.nameLabel,
    nameType: r.nameType || 'text', nameSettings: r.nameType === 'autonumber' ? clean({ prefix: r.namePrefix, digits: num(r.nameDigits) || 4 }) : undefined, description: r.description
  }))
  const opts = sheetRows(wb, 'options')
  const fields = sheetRows(wb, 'fields').map((r) => clean({
    object: r.object, slug: r.slug, label: r.label, type: r.type, required: yes(r.required) || undefined, showInList: r.showInList === '' ? undefined : yes(r.showInList),
    unique: yes(r.unique) || undefined, help: r.help, sensitive: yes(r.sensitive) || undefined,
    settings: clean({ lookup: r.lookup, multiple: yes(r.multiple) || undefined, decimals: num(r.decimals), min: num(r.min), max: num(r.max), formula: r.formula, returnType: r.returnType,
      valueType: r.valueType, rollupObject: r.rollupObject, rollupLink: r.rollupLink || (r.rollupObject ? '$parent' : undefined), rollupFn: r.rollupFn, rollupField: r.rollupField }),
    options: opts.filter((o) => o.object === r.object && o.field === r.slug).map((o) => clean({ value: o.value, label: o.label, color: o.color, isDefault: yes(o.isDefault) || undefined }))
  }))
  return { objects, fields }
}

export function toWorkbook (schema) {
  const head = (key) => SHEETS[key].cols.map(([k, l]) => `${l} (${k})`)
  const flat = (o) => ({ ...o, ...(o.settings || {}), junctionRefs: (o.junctionRefs || []).join(', '), namePrefix: o.nameSettings?.prefix, nameDigits: o.nameSettings?.digits })
  const cell = (v) => (v === true ? 'x' : v === false || v === undefined || v === null ? '' : v)
  const rowsOf = (key, list) => [head(key), ...list.map((o) => SHEETS[key].cols.map(([k]) => cell(flat(o)[k])))]
  const options = (schema.fields || []).flatMap((f) => (f.options || []).map((o) => ({ object: f.object, field: f.slug, ...o })))
  return writeXlsx([
    { name: SHEETS.objects.name, rows: rowsOf('objects', schema.objects || []), widths: [22, 26, 26, 10, 10, 22, 30, 20, 14, 14, 10, 40] },
    { name: SHEETS.fields.name, rows: rowsOf('fields', schema.fields || []), widths: [22, 22, 26, 12, 9, 9, 9, 20, 9, 7, 8, 8, 30, 10, 10, 20, 16, 10, 16, 30, 9] },
    { name: SHEETS.options.name, rows: rowsOf('options', options), widths: [22, 22, 18, 24, 10, 9] },
    { name: 'Huong dan', rows: GUIDE, widths: [150] }
  ])
}

// ---------- Kiểm hợp lệ ----------
export function validate (schema) {
  const errors = []; const warnings = []
  const objs = schema.objects || []; const fields = schema.fields || []
  const own = new Set(objs.map((o) => o.slug))
  const ref = (v) => (!v ? v : String(v).includes(':') ? String(v) : `cobj:${v}`)
  const checkRef = (where, v) => {
    if (!v) return
    if (String(v).includes(':')) warnings.push(`${where}: "${v}" phải có sẵn trong workspace (apply sẽ kiểm)`)
    else if (!own.has(v)) errors.push(`${where}: "${v}" không có trong sheet đối tượng (đối tượng có sẵn ghi dạng <module>:<khoá>, VD crm:account)`)
  }
  const seen = new Set()
  for (const [i, o] of objs.entries()) {
    const w = `Đối tượng dòng ${i + 2} (${o.slug || '?'})`
    if (!SLUG.test(o.slug || '')) errors.push(`${w}: mã phải chữ thường không dấu, số, _ (2-50 ký tự, bắt đầu bằng chữ)`)
    if (seen.has(o.slug)) errors.push(`${w}: mã bị lặp`); seen.add(o.slug)
    if (!o.label) errors.push(`${w}: thiếu Tên`)
    if (!MODULES.includes(o.module)) errors.push(`${w}: Phân hệ phải là ${MODULES.join(' | ')}`)
    if (!['normal', 'child', 'junction'].includes(o.objectType)) errors.push(`${w}: Loại phải normal | child | junction`)
    if (o.objectType === 'child') { if (!o.parentRef) errors.push(`${w}: đối tượng Con cần Đối tượng cha`); checkRef(w, o.parentRef) }
    if (o.objectType === 'junction') {
      if ((o.junctionRefs || []).length !== 2 || ref(o.junctionRefs[0]) === ref(o.junctionRefs[1])) errors.push(`${w}: Trung gian cần đúng 2 đầu khác nhau`)
      for (const j of o.junctionRefs || []) checkRef(w, j)
    }
    if (!['text', 'autonumber'].includes(o.nameType)) errors.push(`${w}: Kiểu tên bản ghi phải text | autonumber`)
    if (o.nameType === 'autonumber' && !(o.nameSettings?.digits >= 1 && o.nameSettings.digits <= 10)) errors.push(`${w}: Số chữ số 1-10`)
  }
  const fseen = new Set()
  for (const [i, f] of fields.entries()) {
    const w = `Trường dòng ${i + 2} (${f.object || '?'}.${f.slug || '?'})`
    checkRef(w, f.object)
    if (!SLUG.test(f.slug || '')) errors.push(`${w}: mã phải chữ thường không dấu, số, _`)
    const k = `${ref(f.object)}.${f.slug}`
    if (fseen.has(k)) errors.push(`${w}: mã trường bị lặp trong đối tượng`); fseen.add(k)
    if (!f.label) errors.push(`${w}: thiếu Nhãn`)
    if (!TYPES.includes(f.type)) errors.push(`${w}: Kiểu "${f.type}" không hợp lệ (${TYPES.join(', ')})`)
    const s = f.settings || {}
    if (['select', 'multiselect'].includes(f.type)) {
      const vals = (f.options || []).map((o) => o.value)
      if (!vals.length) errors.push(`${w}: cần ít nhất 1 lựa chọn (sheet Lua chon)`)
      if (new Set(vals).size !== vals.length) errors.push(`${w}: Giá trị lựa chọn bị lặp`)
      if ((f.options || []).some((o) => !o.value || !o.label)) errors.push(`${w}: lựa chọn thiếu Giá trị / Nhãn`)
      if ((f.options || []).some((o) => o.color && !/^#[0-9A-Fa-f]{6}$/.test(o.color))) errors.push(`${w}: Màu dạng #RRGGBB`)
    } else if ((f.options || []).length) errors.push(`${w}: chỉ trường select / multiselect có lựa chọn`)
    if (f.type === 'lookup') { if (!s.lookup) errors.push(`${w}: Tra cứu cần "Tra cứu tới"`); checkRef(w, s.lookup) }
    if (f.type === 'formula' && !s.formula) errors.push(`${w}: Công thức trống`)
    if (f.type === 'rollup') {
      if (!s.rollupObject) errors.push(`${w}: Tổng hợp cần "Tổng hợp từ"`); checkRef(w, s.rollupObject)
      if (!['sum', 'count', 'min', 'max', 'avg'].includes(s.rollupFn)) errors.push(`${w}: Hàm tổng hợp sum | count | min | max | avg`)
      if (s.rollupFn !== 'count' && !s.rollupField) errors.push(`${w}: cần "Trường được tổng hợp" (trừ count)`)
    }
    if (COMPUTED.has(f.type) && (f.required || f.unique)) warnings.push(`${w}: trường tính toán - máy chủ bỏ Bắt buộc / Duy nhất`)
    if (f.sensitive && ['formula', 'rollup'].includes(f.type)) errors.push(`${w}: trường nhạy cảm không dùng công thức / tổng hợp`)
  }
  return { errors, warnings }
}

// ---------- Kế hoạch ----------
const RANK = (t) => (t === 'lookup' ? 1 : t === 'formula' ? 2 : t === 'rollup' ? 3 : 0)
export function buildPlan (schema) {
  const ref = (v) => (!v ? v : String(v).includes(':') ? String(v) : `cobj:${v}`)
  const own = new Set((schema.objects || []).map((o) => `cobj:${o.slug}`))
  const deps = (o) => [o.parentRef, ...(o.junctionRefs || [])].map(ref).filter((r) => r && own.has(r))
  const pending = [...(schema.objects || [])]; const ordered = []; const placed = new Set()
  while (pending.length) {
    const i = pending.findIndex((o) => deps(o).every((d) => placed.has(d)))
    if (i < 0) die(1, `vòng phụ thuộc cha / trung gian: ${pending.map((o) => o.slug).join(', ')}`)
    const [o] = pending.splice(i, 1); ordered.push(o); placed.add(`cobj:${o.slug}`)
  }
  const steps = []
  for (const o of ordered) {
    steps.push({ kind: 'object', key: `cobj:${o.slug}`, method: 'POST', path: '/objects', needs: deps(o),
      body: clean({ ...o, parentRef: ref(o.parentRef), junctionRefs: o.junctionRefs?.map(ref) }) })
  }
  const fields = [...(schema.fields || [])].map((f, i) => ({ f, i })).sort((a, b) => RANK(a.f.type) - RANK(b.f.type) || a.i - b.i).map((x) => x.f)
  for (const f of fields) {
    const oref = ref(f.object); const s = f.settings || {}
    const settings = clean({ ...s, lookup: ref(s.lookup), rollupObject: ref(s.rollupObject), required: f.required, unique: f.unique, help: f.help, sensitive: f.sensitive })
    const needs = [oref, settings.lookup, settings.rollupObject].filter((r) => r && own.has(r))
    steps.push({ kind: 'field', key: `${oref}.${f.slug}`, method: 'POST', path: `/objects/${encodeURIComponent(oref)}/fields`, needs: [...new Set(needs)],
      body: clean({ label: f.label, slug: f.slug, type: f.type, options: f.options, settings, showInList: f.showInList ?? true }) })
  }
  return steps.map((s, i) => ({ n: i + 1, ...s }))
}

function planMd (steps) {
  const lines = ['# Kế hoạch tạo dữ liệu', '', `${steps.length} bước - chạy theo thứ tự; bước có "Phụ thuộc" chỉ kiểm được trên máy chủ sau khi bước trước đã ghi thật.`, '',
    '| # | Loại | Khoá | Kiểu / phân hệ | Phụ thuộc |', '|---|---|---|---|---|']
  for (const s of steps) lines.push(`| ${s.n} | ${s.kind === 'object' ? 'Đối tượng' : 'Trường'} | \`${s.key}\` | ${s.kind === 'object' ? `${s.body.objectType} / ${s.body.module}` : s.body.type} | ${s.needs.join(', ') || '-'} |`)
  return lines.join('\n') + '\n'
}

// ---------- Gọi API qua antco_client.mjs ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function api (o, method, path, { body, mode, runId } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'antco-sw-'))
  try {
    const args = [CLIENT, method, path, '--quiet']
    if (o.env) args.push('--env', o.env)
    if (body !== undefined) { const f = join(dir, 'body.json'); writeFileSync(f, JSON.stringify(body)); args.push('--body', f) }
    if (mode === 'dry') args.push('--server-dry-run')
    if (mode === 'apply') args.push('--apply', '--run-id', runId)
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } })
      if (r.status === 2 || r.status === 3) die(2, (r.stderr || r.stdout).trim())
      if (r.status === 5) return { ok: false, network: true, error: { code: 'NETWORK', message: (r.stderr || '').trim() } }
      let json = null
      try { json = JSON.parse(r.stdout) } catch { return { ok: false, error: { code: 'BAD_OUTPUT', message: (r.stdout || r.stderr).slice(0, 300) } } }
      if (json?.error?.code === 'RATE_LIMITED') { process.stderr.write('  (giới hạn tần suất - chờ 60 giây)\n'); await sleep(61000); continue }
      await sleep(550) // <= 120 lần / phút
      return { ok: r.status === 0 && json?.success !== false, data: json?.data, error: json?.error }
    }
    return { ok: false, error: { code: 'RATE_LIMITED', message: 'vẫn vượt giới hạn tần suất' } }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

async function resolveParentLink (o, step, existing) {
  const s = step.body.settings || {}
  if (step.body.type !== 'rollup' || s.rollupLink !== '$parent') return step.body
  const r = await api(o, 'GET', `/objects/${encodeURIComponent(s.rollupObject)}/fields`)
  const parent = step.key.split('.')[0]
  const link = (r.data?.customFields || []).find((f) => f.type === 'dependent_lookup' && (f.settings?.lookup === parent || f.lookup === parent))
  if (!link) { existing.missingLink = true; return null }
  return { ...step.body, settings: { ...s, rollupLink: link.slug } }
}

async function apply (planFile, o) {
  const steps = JSON.parse(readFileSync(planFile, 'utf8'))
  const stateFile = planFile.replace(/\.json$/, '') + '.state.json'
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { done: {} }
  const who = await api(o, 'GET', '/whoami')
  if (!who.ok) die(1, `token / workspace lỗi: ${who.error?.code} ${who.error?.message}`)
  console.log(`Workspace: ${who.data.workspace?.name} - người chạy: ${who.data.user?.fullName}${o.apply ? ` - GHI THẬT, run id ${o.runId}` : ' - CHỈ KIỂM'}`)
  const exists = new Map()
  const objectExists = async (r) => { if (!exists.has(r)) exists.set(r, (await api(o, 'GET', `/objects/${encodeURIComponent(r)}`)).ok); return exists.get(r) }
  let failed = 0
  for (const s of steps) {
    const tag = `#${s.n} ${s.kind === 'object' ? 'đối tượng' : 'trường'} ${s.key}`
    if (state.done[s.n]) { console.log(`  = ${tag}: đã làm (${state.done[s.n].id || ''})`); continue }
    if (s.kind === 'object' && await objectExists(s.key)) { console.log(`  ! ${tag}: ĐÃ CÓ trong workspace - bỏ qua (kiểm lại thiết kế)`); if (o.apply) state.done[s.n] = { id: s.key, existed: true }; continue }
    const ext = [s.body.parentRef, ...(s.body.junctionRefs || []), s.kind === 'field' ? s.key.split('.')[0] : null, s.body.settings?.lookup, s.body.settings?.rollupObject].filter((r) => r && !s.needs.includes(r))
    for (const r of [...new Set(ext)]) if (!(await objectExists(r))) { console.log(`  ✗ ${tag}: không có đối tượng ${r} trong workspace`); failed++ }
    const waiting = s.needs.filter((r) => !exists.get(r) && !Object.values(state.done).some((d) => d.id === r))
    if (!o.apply && waiting.length) { console.log(`  ~ ${tag}: chờ bước trước tạo ${waiting.join(', ')} (kiểm khi ghi thật)`); continue }
    const body = await resolveParentLink(o, s, {})
    if (!body) { console.log(`  ✗ ${tag}: không tìm thấy trường Tra cứu phụ thuộc ở ${s.body.settings.rollupObject}`); failed++; if (o.apply) break; continue }
    const dry = await api(o, s.method, s.path, { body, mode: 'dry' })
    if (!dry.ok) { console.log(`  ✗ ${tag}: ${dry.error?.code} - ${dry.error?.message}`); failed++; if (o.apply) break; continue }
    if (!o.apply) { console.log(`  ✓ ${tag}: máy chủ chấp nhận (dryRun)`); continue }
    const r = await api(o, s.method, s.path, { body, mode: 'apply', runId: o.runId })
    if (!r.ok) {
      console.log(`  ✗ ${tag}: ${r.error?.code} - ${r.error?.message}${r.network ? ' (lỗi mạng: lệnh có thể ĐÃ ghi - đọc lại trước khi chạy tiếp)' : ''}`)
      failed++; break
    }
    const id = s.kind === 'object' ? r.data?.object?.ref : r.data?.id
    state.done[s.n] = { id, slug: r.data?.slug }
    if (s.kind === 'object') exists.set(s.key, true)
    writeFileSync(stateFile, JSON.stringify(state, null, 2))
    console.log(`  ✓ ${tag}: đã tạo ${id || ''}`)
  }
  const left = steps.filter((s) => !state.done[s.n]).length
  console.log(failed ? `Có ${failed} lỗi.` : o.apply ? `Xong - còn ${left} bước chưa làm.` : 'Kiểm xong, không ghi gì.')
  return failed ? 1 : 0
}

// ---------- CLI ----------
function load (file) {
  if (!existsSync(file)) die(2, `không thấy ${file}`)
  return /\.xlsx$/i.test(file) ? fromWorkbook(readXlsx(readFileSync(file))) : normalizeJson(JSON.parse(readFileSync(file, 'utf8')))
}
// JSON viết tay: nhận cả dạng phẳng như cột workbook (namePrefix / nameDigits, lookup / formula... ở cấp trường) -> dạng chuẩn nameSettings / settings
function normalizeJson (s) {
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))
  const SK = ['lookup', 'multiple', 'decimals', 'min', 'max', 'formula', 'returnType', 'valueType', 'rollupObject', 'rollupLink', 'rollupFn', 'rollupField']
  return {
    ...s,
    objects: (s.objects || []).map(({ namePrefix, nameDigits, ...o }) => o.nameType === 'autonumber' && !o.nameSettings && (namePrefix !== undefined || nameDigits !== undefined)
      ? { ...o, nameSettings: clean({ prefix: namePrefix, digits: num(nameDigits) || 4 }) } : o),
    fields: (s.fields || []).map((f) => { const flat = pick(f, SK); if (!Object.keys(flat).length) return f; const rest = { ...f }; for (const k of SK) delete rest[k]; return { ...rest, settings: { ...flat, ...(f.settings || {}) } } })
  }
}
function report (schema) {
  const { errors, warnings } = validate(schema)
  for (const w of warnings) console.log(`  cảnh báo: ${w}`)
  for (const e of errors) console.log(`  LỖI: ${e}`)
  console.log(`${(schema.objects || []).length} đối tượng, ${(schema.fields || []).length} trường - ${errors.length} lỗi, ${warnings.length} cảnh báo`)
  return errors.length === 0
}

async function main () {
  const [cmd, a, b, ...rest] = process.argv.slice(2)
  if (!cmd || cmd === '-h' || cmd === '--help') { console.log(HELP); return 0 }
  if (cmd === 'template') { if (!a) die(2, 'cần <out.xlsx>'); writeFileSync(a, toWorkbook({ objects: [], fields: [] })); console.log(`Đã tạo ${a}`); return 0 }
  if (cmd === 'export') { if (!b) die(2, 'cần <schema.json> <out.xlsx>'); const s = load(a); report(s); writeFileSync(b, toWorkbook(s)); console.log(`Đã ghi ${b}`); return 0 }
  if (cmd === 'import') { if (!b) die(2, 'cần <in.xlsx> <out.json>'); const s = load(a); const ok = report(s); writeFileSync(b, JSON.stringify(s, null, 2) + '\n'); console.log(`Đã ghi ${b}`); return ok ? 0 : 1 }
  if (cmd === 'validate') { if (!a) die(2, 'cần file'); return report(load(a)) ? 0 : 1 }
  if (cmd === 'plan') {
    if (!b) die(2, 'cần <schema> <out-dir>')
    const s = load(a)
    if (!report(s)) return 1
    const steps = buildPlan(s)
    mkdirSync(b, { recursive: true })
    writeFileSync(join(b, 'plan.json'), JSON.stringify(steps, null, 2) + '\n'); writeFileSync(join(b, 'plan.md'), planMd(steps))
    console.log(`Đã ghi ${join(b, 'plan.json')} + plan.md (${steps.length} bước)`)
    return 0
  }
  if (cmd === 'apply') {
    const args = [b, ...rest].filter((x) => x !== undefined)
    const o = { env: null, apply: false, runId: null }
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--env') o.env = resolve(args[++i])
      else if (args[i] === '--apply') o.apply = true
      else if (args[i] === '--run-id') o.runId = args[++i]
      else die(2, `tuỳ chọn lạ ${args[i]}`)
    }
    if (!a) die(2, 'cần <plan.json>')
    if (o.apply && !/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,79}$/.test(o.runId || '')) die(2, '--apply cần --run-id (VD ar_20261013_ab12cd)')
    return apply(a, o)
  }
  die(2, `lệnh lạ ${cmd} (xem --help)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => die(1, e?.message || e))
