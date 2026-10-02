#!/usr/bin/env node
// Kiểm artifact của build-antco-app (Node.js >= 18, không phụ thuộc thư viện, không gọi mạng).
// Hợp đồng: skills/build-antco-app/references/artifact-contracts.md
//
//   node validate_artifacts.mjs [--requirements f.md] [--design f.md] [--plan f.md]
//                               [--answers a.json --source f.md] [--manifest m.json --root dir] [--json]
//   node validate_artifacts.mjs hash <file...>      # in SHA-256 dạng JSON (dùng cho manifest)
//
// Exit: 0 không có lỗi | 1 có lỗi | 2 sai cách dùng
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, basename, isAbsolute, relative, sep } from 'node:path'

const VERSION = '1.0.0'
const SKILLS = new Set(['build-antco-app', 'antco-api-auth', 'antco-overview', 'antco-objects', 'antco-fields', 'antco-records', 'antco-layouts', 'antco-rules', 'antco-actions', 'antco-forms', 'antco-filters', 'antco-reports', 'antco-related-lists'])
const FIELD_TYPES = new Set(['text', 'phone', 'bool', 'textarea', 'email', 'select', 'date', 'datetime', 'url', 'multiselect', 'number', 'label', 'cascading', 'percent', 'file', 'rating', 'money', 'regex', 'lookup', 'autonumber', 'formula', 'dependent_lookup', 'rollup'])
const COMPUTED = new Set(['autonumber', 'formula', 'rollup'])
const E = {
  status: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUPERSEDED'],
  priority: ['MUST', 'SHOULD', 'COULD'],
  disposition: ['DUNG_SAN', 'CAU_HINH', 'MO_RONG', 'TAO_MOI', 'NGOAI_PHAM_VI', 'CHUA_HO_TRO', 'CHUA_RO'],
  clarity: ['CAN_LAM_RO', 'DA_RO', 'NGOAI_PHAM_VI'],
  qLevel: ['BLOCKING', 'NON_BLOCKING'],
  qState: ['MO', 'DA_TRA_LOI', 'BO_QUA'],
  objKind: ['STANDARD', 'CUSTOM', 'CHILD', 'JUNCTION'],
  objAction: ['REUSE', 'EXTEND', 'CREATE'],
  fldAction: ['CREATE', 'OVERRIDE', 'REUSE'],
  yesNo: ['CO', 'KHONG'],
  relKind: ['LOOKUP', 'CHILD_OF', 'JUNCTION'],
  cfgKind: ['LAYOUT', 'LAYOUT_RULE', 'DUPLICATE_RULE', 'SECURITY_RULE', 'STATUS_RULE', 'PATH', 'TRACKING', 'COMPOSITE', 'ACTION', 'FORM', 'RELATED_LIST', 'FILTER', 'REPORT_TYPE', 'REPORT', 'DASHBOARD', 'DEMO_DATA'],
  wState: ['DRAFT', 'READY', 'IN_PROGRESS', 'DONE', 'FAILED', 'BLOCKED', 'SKIPPED'],
  tResult: ['CHUA_CHAY', 'PASS', 'FAIL', 'BLOCKED']
}
const SLUG = /^[a-z][a-z0-9_]{1,49}$/
const REF = /^(cobj:[a-z][a-z0-9_]{1,49}|[a-z]{2,10}:[a-z][a-z0-9_]{1,60})$/
const RUN_ID = /^ar_\d{8}_[a-z0-9]{6,32}$/
const SHA = /^[a-f0-9]{64}$/

const findings = []
const err = (file, code, msg) => findings.push({ level: 'error', file, code, msg })
const warn = (file, code, msg) => findings.push({ level: 'warning', file, code, msg })
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const ids = (cell) => (!cell || cell === '-' ? [] : cell.split(',').map((s) => s.trim()).filter(Boolean))
const idOk = (id, prefix) => new RegExp(`^${prefix}-\\d{3,}$`).test(id)

function readText (p, label) {
  if (!existsSync(p)) { err(p, 'FILE_MISSING', `không thấy file ${label}`); return null }
  return readFileSync(p, 'utf8').replace(/^﻿/, '')
}

/** Marker artifact: <!-- antco-artifact:<loai> k=v ... --> */
function artifactMeta (text, file, kind) {
  const m = text.match(/<!--\s*antco-artifact:([a-z]+)((?:\s+[a-z]+=[^\s]+)*)\s*-->/)
  if (!m) { err(file, 'NO_ARTIFACT_MARKER', 'thiếu marker <!-- antco-artifact:... -->'); return {} }
  if (m[1] !== kind) err(file, 'WRONG_KIND', `marker là "${m[1]}", cần "${kind}"`)
  const meta = {}
  for (const kv of m[2].trim().split(/\s+/).filter(Boolean)) { const i = kv.indexOf('='); meta[kv.slice(0, i)] = kv.slice(i + 1) }
  if (!meta.project || !/^[a-z0-9][a-z0-9-]{1,60}$/.test(meta.project)) err(file, 'BAD_PROJECT', 'project= thiếu hoặc không phải slug a-z0-9-')
  if (!/^v\d+$/.test(meta.revision || '')) err(file, 'BAD_REVISION', 'revision= phải dạng vN')
  if (!E.status.includes(meta.status)) err(file, 'BAD_STATUS', `status= phải thuộc ${E.status.join('|')}`)
  return meta
}

/** Bảng Markdown đứng ngay sau <!-- antco-table:<id> --> (cho phép dòng trống ở giữa). */
function table (text, id, file, cols, required = true) {
  const lines = text.split(/\r?\n/)
  const at = lines.findIndex((l) => l.trim() === `<!-- antco-table:${id} -->`)
  if (at < 0) { if (required) err(file, 'TABLE_MISSING', `thiếu bảng "${id}"`); return null }
  let i = at + 1
  while (i < lines.length && lines[i].trim() === '') i++
  const rows = []
  const split = (l) => { const t = l.trim().replace(/^\|/, '').replace(/\|$/, ''); return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|')) }
  if (!lines[i]?.trim().startsWith('|')) { err(file, 'TABLE_EMPTY', `bảng "${id}" không có dòng tiêu đề`); return [] }
  const head = split(lines[i])
  if (head.length !== cols) err(file, 'TABLE_COLS', `bảng "${id}" cần ${cols} cột, đang có ${head.length}`)
  i += 2 // bỏ dòng phân cách
  for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const r = split(lines[i])
    if (r.length !== cols) { err(file, 'ROW_COLS', `bảng "${id}" dòng "${lines[i].slice(0, 60)}" có ${r.length}/${cols} cột`); continue }
    if (r.some((c) => c === '')) err(file, 'EMPTY_CELL', `bảng "${id}" có ô trống ở dòng ${r[0]} (dùng "-" hoặc "TBD")`)
    rows.push(r)
  }
  return rows
}

function uniqueIds (rows, prefix, file, tbl) {
  const seen = new Set()
  for (const r of rows) {
    if (!idOk(r[0], prefix)) err(file, 'BAD_ID', `bảng "${tbl}": ID "${r[0]}" phải dạng ${prefix}-001`)
    if (seen.has(r[0])) err(file, 'DUP_ID', `bảng "${tbl}": ID trùng ${r[0]}`)
    seen.add(r[0])
  }
  return seen
}
const enumCheck = (val, list, file, where) => { if (!list.includes(val)) err(file, 'BAD_ENUM', `${where}: "${val}" không thuộc ${list.join('|')}`) }

// ---------- requirements ----------
function checkRequirements (p) {
  const text = readText(p, 'yêu cầu'); if (text === null) return null
  const meta = artifactMeta(text, p, 'requirements')
  const reqs = table(text, 'requirements', p, 7) || []
  const qs = table(text, 'questions', p, 7, false) || []
  table(text, 'survey', p, 4, false)
  const reqIds = uniqueIds(reqs, 'REQ', p, 'requirements')
  uniqueIds(qs, 'Q', p, 'questions')
  const req = new Map()
  for (const r of reqs) {
    enumCheck(r[3], E.priority, p, `${r[0]} Ưu tiên`)
    enumCheck(r[4], E.disposition, p, `${r[0]} Hướng xử lý`)
    enumCheck(r[5], E.clarity, p, `${r[0]} Trạng thái làm rõ`)
    req.set(r[0], { disposition: r[4], clarity: r[5] })
  }
  const openFor = new Set()
  let openBlocking = 0
  for (const q of qs) {
    const refs = ids(q[1])
    if (!refs.length) err(p, 'Q_NO_REQ', `${q[0]} không gắn REQ nào`)
    for (const r of refs) if (!reqIds.has(r)) err(p, 'Q_UNKNOWN_REQ', `${q[0]} trỏ tới ${r} không có trong bảng requirements`)
    enumCheck(q[4], E.qLevel, p, `${q[0]} Mức`)
    enumCheck(q[5], E.qState, p, `${q[0]} Trạng thái`)
    if (q[5] === 'MO') { refs.forEach((r) => openFor.add(r)); if (q[4] === 'BLOCKING') openBlocking++ }
    if (q[5] === 'DA_TRA_LOI' && q[6] === '-') warn(p, 'Q_NO_ANSWER_TEXT', `${q[0]} đã trả lời nhưng cột Trả lời trống`)
  }
  for (const [id, r] of req) {
    if (r.clarity === 'CAN_LAM_RO' && !openFor.has(id)) err(p, 'REQ_NO_QUESTION', `${id} cần làm rõ nhưng không có câu hỏi đang mở`)
    if (r.clarity === 'DA_RO' && r.disposition === 'CHUA_RO') err(p, 'REQ_DISPOSITION', `${id} đã rõ nhưng hướng xử lý còn CHUA_RO`)
  }
  if (meta.status && meta.status !== 'DRAFT') {
    if (!/<!--\s*antco-token-preflight:VERIFIED\s*-->/.test(text)) err(p, 'NO_PREFLIGHT', 'status khác DRAFT cần <!-- antco-token-preflight:VERIFIED -->')
    if (['PENDING_APPROVAL', 'APPROVED'].includes(meta.status)) {
      for (const [id, r] of req) {
        if (r.clarity === 'CAN_LAM_RO') err(p, 'GATE1_UNCLEAR', `${id} còn CAN_LAM_RO - chưa thể trình cổng 1`)
        if (r.disposition === 'CHUA_RO') err(p, 'GATE1_UNCLEAR', `${id} hướng xử lý CHUA_RO - chưa thể trình cổng 1`)
      }
      if (openBlocking) err(p, 'GATE1_OPEN_BLOCKING', `còn ${openBlocking} câu BLOCKING đang mở`)
    }
  }
  if (meta.status === 'APPROVED' && !/<!--\s*antco-gate:1:APPROVED\b[^>]*-->/.test(text)) err(p, 'GATE1_MARKER', 'status APPROVED cần <!-- antco-gate:1:APPROVED -->')
  if (/antco-gate:2:APPROVED/.test(text)) warn(p, 'WRONG_GATE', 'marker cổng 2 nằm trong file yêu cầu - cổng 2 ghi ở kế hoạch')
  return { meta, req, qIds: new Set(qs.map((q) => q[0])), qReq: new Map(qs.map((q) => [q[0], ids(q[1])])), text }
}

// ---------- design ----------
function checkDesign (p, R) {
  const text = readText(p, 'thiết kế'); if (text === null) return null
  const meta = artifactMeta(text, p, 'design')
  const objs = table(text, 'objects', p, 8) || []
  const flds = table(text, 'fields', p, 9) || []
  const rels = table(text, 'relations', p, 6, false) || []
  const cfgs = table(text, 'config', p, 6) || []
  const objIds = uniqueIds(objs, 'OBJ', p, 'objects')
  const fldIds = uniqueIds(flds, 'FLD', p, 'fields')
  uniqueIds(rels, 'REL', p, 'relations')
  uniqueIds(cfgs, 'CFG', p, 'config')
  const covered = new Set()
  const cover = (cell, where) => ids(cell).forEach((r) => { covered.add(r); if (R && !R.req.has(r)) err(p, 'UNKNOWN_REQ', `${where} trỏ tới ${r} không có trong file yêu cầu`) })
  const objKind = new Map()
  const refs = new Set()
  for (const o of objs) {
    enumCheck(o[3], E.objKind, p, `${o[0]} Loại`)
    enumCheck(o[4], E.objAction, p, `${o[0]} Hành động`)
    if (!REF.test(o[2])) err(p, 'BAD_REF', `${o[0]} ref "${o[2]}" phải dạng module:key hoặc cobj:<slug>`)
    if (o[3] !== 'STANDARD' && !o[2].startsWith('cobj:')) err(p, 'BAD_REF', `${o[0]} đối tượng tự tạo phải có ref cobj:<slug>`)
    if (o[3] === 'STANDARD' && o[2].startsWith('cobj:')) err(p, 'BAD_REF', `${o[0]} STANDARD không dùng ref cobj:`)
    if (o[4] === 'CREATE' && o[3] === 'STANDARD') err(p, 'CREATE_STANDARD', `${o[0]} không tạo được đối tượng có sẵn`)
    if (refs.has(o[2])) err(p, 'DUP_REF', `ref ${o[2]} xuất hiện 2 lần`)
    refs.add(o[2]); objKind.set(o[0], o[3]); cover(o[7], o[0])
  }
  const slugByObj = new Map()
  for (const f of flds) {
    if (!objIds.has(f[1])) err(p, 'UNKNOWN_OBJ', `${f[0]} trỏ tới ${f[1]} không có trong objects`)
    if (!SLUG.test(f[3])) err(p, 'BAD_SLUG', `${f[0]} slug "${f[3]}" phải ^[a-z][a-z0-9_]{1,49}$`)
    if (!FIELD_TYPES.has(f[4])) err(p, 'BAD_TYPE', `${f[0]} kiểu "${f[4]}" không thuộc 23 kiểu Antco`)
    if (f[4] === 'cascading') err(p, 'TYPE_SOON', `${f[0]} kiểu cascading đang "Sắp có" - chọn kiểu khác`)
    if (f[4] === 'dependent_lookup' && objKind.get(f[1]) === 'STANDARD') err(p, 'TYPE_CUSTOM_ONLY', `${f[0]} dependent_lookup chỉ dùng cho đối tượng tự tạo`)
    enumCheck(f[5], E.fldAction, p, `${f[0]} Hành động`)
    enumCheck(f[6], E.yesNo, p, `${f[0]} Bắt buộc`)
    if (COMPUTED.has(f[4]) && f[6] === 'CO') err(p, 'COMPUTED_REQUIRED', `${f[0]} kiểu tính (${f[4]}) không đặt bắt buộc`)
    if (f[5] === 'OVERRIDE' && objKind.get(f[1]) !== 'STANDARD') warn(p, 'OVERRIDE_CUSTOM', `${f[0]} OVERRIDE chỉ có nghĩa với đối tượng có sẵn`)
    const k = `${f[1]}/${f[3]}`
    if (slugByObj.has(k)) err(p, 'DUP_SLUG', `${f[0]} trùng slug ${f[3]} trong ${f[1]}`)
    slugByObj.set(k, f[0]); cover(f[8], f[0])
  }
  for (const r of rels) {
    for (const o of [r[1], r[2]]) if (!objIds.has(o)) err(p, 'UNKNOWN_OBJ', `${r[0]} trỏ tới ${o} không có trong objects`)
    enumCheck(r[3], E.relKind, p, `${r[0]} Loại`)
    for (const f of ids(r[4])) if (!fldIds.has(f)) err(p, 'UNKNOWN_FLD', `${r[0]} trỏ tới ${f} không có trong fields`)
  }
  const cfgKind = new Map()
  for (const c of cfgs) {
    enumCheck(c[1], E.cfgKind, p, `${c[0]} Loại`)
    if (c[2] !== '-' && !objIds.has(c[2])) err(p, 'UNKNOWN_OBJ', `${c[0]} trỏ tới ${c[2]} không có trong objects`)
    if (!SKILLS.has(c[5])) err(p, 'BAD_SKILL', `${c[0]} skill "${c[5]}" không có trong bundle`)
    cfgKind.set(c[0], c[1]); cover(c[4], c[0])
  }
  if (R) {
    for (const [id, r] of R.req) {
      if (['NGOAI_PHAM_VI', 'CHUA_HO_TRO'].includes(r.disposition) || r.clarity === 'NGOAI_PHAM_VI') continue
      if (!covered.has(id)) err(p, 'REQ_NOT_COVERED', `${id} chưa được thiết kế nào phủ`)
    }
    if (R.meta.status !== 'APPROVED') warn(p, 'REQ_NOT_APPROVED', 'file yêu cầu chưa APPROVED (cổng 1)')
  }
  if (meta.requirements && R && R.file && basename(R.file) !== meta.requirements) warn(p, 'REQ_FILE_MISMATCH', `marker trỏ ${meta.requirements} nhưng đang kiểm với ${basename(R.file)}`)
  return { meta, ids: new Set([...objIds, ...fldIds, ...rels.map((r) => r[0]), ...cfgs.map((c) => c[0])]), cfgKind }
}

// ---------- plan ----------
function checkPlan (p, R, D) {
  const text = readText(p, 'kế hoạch'); if (text === null) return null
  const meta = artifactMeta(text, p, 'plan')
  const ws = table(text, 'work-items', p, 9) || []
  const ts = table(text, 'tests', p, 5) || []
  const cps = table(text, 'checkpoints', p, 5, false) || []
  const wIds = uniqueIds(ws, 'W', p, 'work-items')
  uniqueIds(ts, 'T', p, 'tests')
  if (!['yes', 'no'].includes(meta.demo)) err(p, 'DEMO_FLAG', 'marker kế hoạch cần demo=yes|no')
  const gate2 = /<!--\s*antco-gate:2:APPROVED\b[^>]*-->/.test(text)
  const deps = new Map()
  const lock = new Map()
  let started = false
  for (const w of ws) {
    const d = ids(w[5])
    for (const x of d) if (!wIds.has(x)) err(p, 'UNKNOWN_DEP', `${w[0]} phụ thuộc ${x} không tồn tại`)
    if (d.includes(w[0])) err(p, 'SELF_DEP', `${w[0]} phụ thuộc chính nó`)
    deps.set(w[0], d.filter((x) => wIds.has(x)))
    if (!SKILLS.has(w[4])) err(p, 'BAD_SKILL', `${w[0]} skill "${w[4]}" không có trong bundle`)
    enumCheck(w[7], E.wState, p, `${w[0]} Trạng thái`)
    if (['IN_PROGRESS', 'DONE'].includes(w[7])) started = true
    if (w[7] === 'READY' && w.some((c) => /\bTBD\b/.test(c))) err(p, 'READY_TBD', `${w[0]} READY nhưng còn TBD`)
    for (const r of ids(w[2])) if (R && !R.req.has(r)) err(p, 'UNKNOWN_REQ', `${w[0]} trỏ tới ${r} không có trong file yêu cầu`)
    for (const d2 of ids(w[3])) {
      if (D && !D.ids.has(d2)) err(p, 'UNKNOWN_DESIGN', `${w[0]} trỏ tới ${d2} không có trong thiết kế`)
      if (D && meta.demo === 'no' && D.cfgKind.get(d2) === 'DEMO_DATA') err(p, 'DEMO_DISABLED', `${w[0]} tạo demo nhưng kế hoạch demo=no`)
    }
    if (w[6] !== '-') lock.set(w[0], w[6])
  }
  // chu trình
  const state = new Map()
  const cyc = []
  const dfs = (n, path) => {
    state.set(n, 1)
    for (const m of deps.get(n) || []) {
      if (state.get(m) === 1) cyc.push([...path, n, m].slice([...path, n].indexOf(m)).join(' -> '))
      else if (!state.get(m)) dfs(m, [...path, n])
    }
    state.set(n, 2)
  }
  for (const n of deps.keys()) if (!state.get(n)) dfs(n, [])
  for (const c of cyc) err(p, 'DEP_CYCLE', `chu trình phụ thuộc: ${c}`)
  // xung đột khoá: cùng khoá (hoặc tiền tố) mà không có đường phụ thuộc
  if (!cyc.length) {
    const reach = new Map()
    const anc = (n) => { if (reach.has(n)) return reach.get(n); const s = new Set(); reach.set(n, s); for (const m of deps.get(n) || []) { s.add(m); anc(m).forEach((x) => s.add(x)) } return s }
    const keys = [...lock.entries()]
    const overlap = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/')
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const [w1, k1] = keys[i]; const [w2, k2] = keys[j]
        if (overlap(k1, k2) && !anc(w1).has(w2) && !anc(w2).has(w1)) err(p, 'LOCK_CONFLICT', `${w1} và ${w2} cùng khoá "${k1}"/"${k2}" nhưng không phụ thuộc nhau`)
      }
    }
  }
  if (R) {
    const coveredW = new Set(ws.flatMap((w) => ids(w[2])))
    for (const [id, r] of R.req) {
      if (['NGOAI_PHAM_VI', 'CHUA_HO_TRO'].includes(r.disposition) || r.clarity === 'NGOAI_PHAM_VI') continue
      if (!coveredW.has(id)) err(p, 'REQ_NO_WORK', `${id} không có W nào thực hiện`)
    }
  }
  for (const t of ts) {
    for (const r of ids(t[1])) if (R && !R.req.has(r)) err(p, 'UNKNOWN_REQ', `${t[0]} trỏ tới ${r} không có trong file yêu cầu`)
    enumCheck(t[4], E.tResult, p, `${t[0]} Kết quả`)
  }
  if ((meta.status === 'APPROVED' || started) && !gate2) err(p, 'GATE2_MARKER', 'kế hoạch đã duyệt/đang chạy cần <!-- antco-gate:2:APPROVED -->')
  if (started) {
    const run = text.match(/<!--\s*antco-run-id:([^\s]+)\s*-->/)
    if (!run) err(p, 'NO_RUN_ID', 'đã có W chạy nhưng thiếu <!-- antco-run-id:ar_... -->')
    else if (!RUN_ID.test(run[1])) err(p, 'BAD_RUN_ID', `run-id "${run[1]}" sai định dạng ar_yyyymmdd_xxxxxx`)
  }
  const cpState = new Map(cps.map((c) => [c[0], c[1]]))
  for (const c of cps) {
    if (!wIds.has(c[0])) err(p, 'CP_UNKNOWN_W', `checkpoint ${c[0]} không có trong work-items`)
    enumCheck(c[1], E.wState, p, `checkpoint ${c[0]} Trạng thái`)
  }
  for (const w of ws) {
    if (w[7] === 'DONE' && cpState.get(w[0]) !== 'DONE') err(p, 'CP_MISMATCH', `${w[0]} DONE nhưng checkpoint chưa DONE`)
    if (cpState.get(w[0]) === 'DONE' && w[7] !== 'DONE') err(p, 'CP_MISMATCH', `checkpoint ${w[0]} DONE nhưng work-item là ${w[7]}`)
    if (w[7] === 'DONE') for (const d of deps.get(w[0]) || []) { const st = ws.find((x) => x[0] === d)?.[7]; if (st && !['DONE', 'SKIPPED'].includes(st)) err(p, 'DONE_BEFORE_DEP', `${w[0]} DONE trong khi phụ thuộc ${d} là ${st}`) }
  }
  return { meta, wIds }
}

// ---------- answers ----------
function checkAnswers (p, src, R) {
  const text = readText(p, 'câu trả lời'); if (text === null) return
  let a
  try { a = JSON.parse(text) } catch (e) { err(p, 'BAD_JSON', e.message); return }
  const allowed = new Set(['schema_version', 'project_slug', 'source_file', 'source_revision', 'source_sha256', 'submission_id', 'submitted_at', 'answers'])
  for (const k of Object.keys(a)) if (!allowed.has(k)) err(p, 'EXTRA_KEY', `khoá lạ "${k}" (không nhận trường ngoài schema)`)
  if (a.schema_version !== 1) err(p, 'SCHEMA_VERSION', 'schema_version phải là 1')
  if (!/^s[0-9a-z]{6,}-[0-9a-z]{4,}$/.test(a.submission_id || '')) err(p, 'BAD_SUBMISSION', 'submission_id sai định dạng')
  if (Number.isNaN(Date.parse(a.submitted_at))) err(p, 'BAD_DATE', 'submitted_at không phải thời điểm ISO 8601')
  if (!Array.isArray(a.answers)) { err(p, 'NO_ANSWERS', 'answers phải là mảng'); return }
  if (src) {
    if (existsSync(src)) {
      if (a.source_sha256 !== sha256(src)) err(p, 'SOURCE_HASH', 'source_sha256 không khớp file nguồn - câu trả lời cho bản khác')
      if (a.source_file !== basename(src)) err(p, 'SOURCE_FILE', `source_file "${a.source_file}" khác ${basename(src)}`)
    }
    if (R) {
      if (R.meta.project && a.project_slug !== R.meta.project) err(p, 'PROJECT', `project_slug "${a.project_slug}" khác ${R.meta.project}`)
      if (R.meta.revision && a.source_revision !== R.meta.revision) err(p, 'REVISION', `source_revision "${a.source_revision}" khác ${R.meta.revision}`)
    }
  } else warn(p, 'NO_SOURCE', 'không truyền --source nên không kiểm hash')
  const seen = new Set()
  for (const x of a.answers) {
    const keys = Object.keys(x || {})
    for (const k of keys) if (!['question_id', 'request_ids', 'choice', 'answer'].includes(k)) err(p, 'EXTRA_KEY', `answers[] có khoá lạ "${k}"`)
    if (!idOk(x.question_id, 'Q')) { err(p, 'BAD_QID', `question_id "${x.question_id}" sai`); continue }
    if (seen.has(x.question_id)) err(p, 'DUP_QID', `${x.question_id} trả lời 2 lần`)
    seen.add(x.question_id)
    if (R && !R.qIds.has(x.question_id)) err(p, 'UNKNOWN_Q', `${x.question_id} không có trong file nguồn`)
    if (R && R.qReq.has(x.question_id)) {
      const want = R.qReq.get(x.question_id).slice().sort().join(',')
      const got = (x.request_ids || []).slice().sort().join(',')
      if (want !== got) err(p, 'Q_REQ_MISMATCH', `${x.question_id} request_ids [${got}] khác bảng [${want}]`)
    }
    for (const k of ['choice', 'answer']) if (x[k] !== undefined && (typeof x[k] !== 'string' || x[k].length > 5000)) err(p, 'BAD_ANSWER', `${x.question_id}.${k} phải là chuỗi <= 5000 ký tự`)
  }
}

// ---------- manifest ----------
function checkManifest (p, root, P) {
  const text = readText(p, 'manifest'); if (text === null) return
  let m
  try { m = JSON.parse(text) } catch (e) { err(p, 'BAD_JSON', e.message); return }
  if (m.schema_version !== 1) err(p, 'SCHEMA_VERSION', 'schema_version phải là 1')
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(m.project_slug || '')) err(p, 'BAD_PROJECT', 'project_slug sai')
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(m.tenant || '') || /[/@]/.test(m.tenant || '')) err(p, 'BAD_TENANT', 'tenant phải là host (không giao thức, không đường dẫn)')
  if (m.run_id !== null && !RUN_ID.test(m.run_id || '')) err(p, 'BAD_RUN_ID', 'run_id phải dạng ar_yyyymmdd_xxxxxx hoặc null')
  if (!Array.isArray(m.artifacts) || !m.artifacts.length) err(p, 'NO_ARTIFACTS', 'artifacts phải là mảng không rỗng')
  const base = root ? resolve(root) : resolve(p, '..')
  const files = new Set()
  for (const a of m.artifacts || []) {
    if (!a.file || isAbsolute(a.file) || a.file.split(/[\\/]/).includes('..')) { err(p, 'BAD_PATH', `đường dẫn artifact không hợp lệ: ${a.file}`); continue }
    if (!['source', 'reader', 'answers', 'snapshot', 'payload'].includes(a.role)) err(p, 'BAD_ROLE', `${a.file}: role "${a.role}" không hợp lệ`)
    if (!SHA.test(a.sha256 || '')) err(p, 'BAD_SHA', `${a.file}: sha256 phải 64 ký tự hex`)
    const full = resolve(base, a.file)
    if (!relative(base, full) || relative(base, full).startsWith('..' + sep)) { err(p, 'BAD_PATH', `${a.file} nằm ngoài thư mục dự án`); continue }
    if (!existsSync(full) || !statSync(full).isFile()) err(p, 'FILE_MISSING', `${a.file} không tồn tại trong ${base}`)
    else if (SHA.test(a.sha256 || '') && sha256(full) !== a.sha256) err(p, 'HASH_MISMATCH', `${a.file}: sha256 không khớp nội dung hiện tại`)
    if (a.role === 'reader' && !a.source) err(p, 'READER_NO_SOURCE', `${a.file}: bản đọc cần "source"`)
    files.add(a.file)
  }
  for (const a of m.artifacts || []) if (a.source && !files.has(a.source)) err(p, 'SOURCE_NOT_LISTED', `${a.file}: source ${a.source} không có trong artifacts`)
  for (const r of m.resources || []) {
    if (!idOk(r.w_id, 'W')) err(p, 'BAD_WID', `resource w_id "${r.w_id}" sai`)
    else if (P && !P.wIds.has(r.w_id)) err(p, 'UNKNOWN_WID', `resource ${r.w_id} không có trong kế hoạch`)
    if (!['created', 'updated', 'reused'].includes(r.action)) err(p, 'BAD_ACTION', `resource ${r.w_id}: action "${r.action}" không hợp lệ`)
  }
  const d = m.demo_records
  if (d && (!Number.isInteger(d.count) || d.count < 0 || !Array.isArray(d.objects) || typeof d.cleaned !== 'boolean')) err(p, 'BAD_DEMO', 'demo_records cần {count:int>=0, objects:[], cleaned:boolean}')
  if (d && d.count > 0 && !m.run_id) err(p, 'DEMO_NO_RUN', 'có bản ghi demo thì phải có run_id')
  if (!m.validator || !['PASS', 'FAIL'].includes(m.validator.result)) err(p, 'BAD_VALIDATOR', 'validator.result phải PASS|FAIL')
  const secretish = /antco_pat_[A-Za-z0-9_-]{8,}|"(api[_-]?key|token|password|secret)"\s*:/i
  if (secretish.test(text)) err(p, 'SECRET_IN_MANIFEST', 'manifest có dấu hiệu chứa token/khoá - xoá ngay')
}

// ---------- main ----------
function main () {
  const argv = process.argv.slice(2)
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(`validate_artifacts.mjs ${VERSION}\n  --requirements f.md --design f.md --plan f.md --answers a.json --source f.md --manifest m.json --root dir --json\n  hash <file...>\n`)
    process.exit(argv.length ? 0 : 2)
  }
  if (argv[0] === 'hash') {
    const out = argv.slice(1).map((f) => ({ file: f, sha256: existsSync(f) ? sha256(f) : null }))
    process.stdout.write(JSON.stringify(out, null, 2) + '\n')
    process.exit(out.every((x) => x.sha256) ? 0 : 1)
  }
  const o = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--json') { o.json = true; continue }
    if (!['--requirements', '--design', '--plan', '--answers', '--source', '--manifest', '--root'].includes(k) || i + 1 >= argv.length) { process.stderr.write(`tham số không hợp lệ: ${k}\n`); process.exit(2) }
    o[k.slice(2)] = argv[++i]
  }
  const reqFile = o.requirements || (o.answers ? o.source : undefined)
  const R = reqFile ? checkRequirements(reqFile) : null
  if (R) R.file = reqFile
  const D = o.design ? checkDesign(o.design, R) : null
  const P = o.plan ? checkPlan(o.plan, R, D) : null
  if (o.answers) checkAnswers(o.answers, o.source, R)
  if (o.manifest) checkManifest(o.manifest, o.root, P)
  const errors = findings.filter((f) => f.level === 'error').length
  const result = { validator: 'antco-validate-artifacts', version: VERSION, result: errors ? 'FAIL' : 'PASS', errors, warnings: findings.length - errors, findings }
  if (o.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  else {
    for (const f of findings) process.stdout.write(`${f.level === 'error' ? 'LỖI ' : 'CẢNH BÁO'} [${f.code}] ${f.file}: ${f.msg}\n`)
    process.stdout.write(`${result.result}: ${errors} lỗi, ${result.warnings} cảnh báo\n`)
  }
  process.exit(errors ? 1 : 0)
}
main()
