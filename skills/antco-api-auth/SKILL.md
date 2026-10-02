---
name: antco-api-auth
description: "Quy tắc dùng chung khi gọi Antco Public API v1 (/api/public/v1): đọc ANTCO_BASE_URL + ANTCO_API_KEY từ biến môi trường, kiểm tra token bằng GET /whoami, header Bearer, X-Antco-Run-Id, ?dryRun=1, phong bì { success, data, meta, error }, mã lỗi, giới hạn 120 lần/60 giây, danh sách API bị cấm, không bao giờ in token. Dùng trước mọi lời gọi API Antco của các skill antco-*, khi gặp lỗi 401/403/429, hoặc khi người dùng hỏi cách tạo/cấu hình API token Antco cho agent."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco API Auth (dùng chung)

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02` - Hợp đồng API: Antco Public API v1 `1.0.0`
- Mọi skill `antco-*` dẫn về file này. Danh mục endpoint: [references/public-api-v1.md](references/public-api-v1.md). Mã lỗi: [references/errors.md](references/errors.md).

## 1. Credential (chỉ 2 biến)

| Biến | Ý nghĩa | Ví dụ (placeholder) |
|---|---|---|
| `ANTCO_BASE_URL` | Origin của công ty trên Antco (tên miền riêng từng công ty, không đường dẫn, không `/` cuối) | `https://<cong-ty>.antco.com.vn` |
| `ANTCO_API_KEY` | API token, dạng `antco_pat_` + 40 ký tự | không bao giờ ghi giá trị thật vào file được commit |

Thứ tự nạp: (1) biến môi trường của phiên / kho bí mật của agent; (2) file `.env` cục bộ **do người dùng chỉ định**, nằm trong `.gitignore` (`antco_client.mjs --env <file>` chỉ đọc đúng 2 khoá này).

Luật bắt buộc:
- **Không bao giờ** in, ghi log, ghi vào artifact, URL, lệnh shell, commit hay câu trả lời giá trị token. Nói về token chỉ bằng `token.name` / `token.prefix` mà `/whoami` trả về.
- **Không** xin người dùng dán token vào chat. Thấy token trong chat/file: không lặp lại, khuyên người dùng xoá token đó và tạo token mới.
- **Không** dò ổ đĩa, lịch sử shell, repo khác để tìm token. Biến môi trường và `.env` mâu thuẫn -> **dừng**, hỏi dùng nguồn nào.
- Không truyền token qua tham số dòng lệnh; script chỉ đọc từ môi trường.

## 2. Người dùng tạo token ở đâu

Antco: **Cài đặt > Tích hợp > API Token > "+ Tạo mới Token"** (cần quyền `settings:api_tokens:write`, mặc định chỉ Quản trị hệ thống):
- Chọn **"Chạy API dưới vai trò"** = một người dùng nội bộ đang hoạt động. Token có **đúng quyền của người đó** (vai trò chính + kiêm nhiệm + quyền tạm thời), không hơn. Khuyên chọn người có đủ quyền cấu hình cần thiết nhưng không phải tài khoản dùng chung.
- Đặt hạn dùng ngắn; **sao chép token ngay** (chỉ hiện 1 lần). Mất token = tạo token mới, xoá token cũ.
- Người chạy là Quản trị mà **chưa bật 2FA** -> mọi lời gọi bị `403 TWO_FACTOR_SETUP_REQUIRED`.

Quyền tối thiểu theo việc (người chạy API phải có):

| Việc | Quyền Antco |
|---|---|
| Khảo sát đối tượng, trường, giao diện, quy tắc | `settings:custom_fields:read` |
| Tạo / sửa đối tượng tự tạo | `settings:custom_objects:write` |
| Thêm trường, giao diện, quy tắc, hành động, biểu mẫu, danh sách liên quan | `settings:custom_fields:write` |
| Đọc / ghi bản ghi đối tượng tự tạo | `cobj:<slug>:read / write / delete` (quyền này sinh ra khi tạo đối tượng; người dùng tự cấp cho vai trò ở Cài đặt > Phân quyền - **agent không cấp được**) |
| Bộ lọc | quyền xem đối tượng; `GET /filters/targets` cần `settings:list_filters:read` |
| Báo cáo / dashboard | `settings:report_types:*`, `settings:reports:*`, `settings:dashboards:*` |

## 3. Kiểm tra token trước mọi việc (preflight)

```bash
node <scripts>/antco_client.mjs whoami
```

`<scripts>` = `antco-api-auth/scripts/` sau khi cài bằng `install.mjs`, hoặc `scripts/` của repo.

`data` gồm: `apiVersion`, `workspace { id, name, subdomain, baseUrl }`, `user { id, fullName, roleId, isSystemAdmin }`, `permissions { allAccess, count, codes[] }`, `token { id, name, prefix, expiresAt }`, `rateLimit { limit, windowSeconds }`.

| Trạng thái | Điều kiện | Việc tiếp theo |
|---|---|---|
| `VERIFIED` | HTTP 200, `success: true`, `workspace.baseUrl` cùng origin với `ANTCO_BASE_URL`, `expiresAt` chưa qua, có quyền cần cho bước sắp làm (`allAccess` hoặc mã trong `codes`) | Tiếp tục |
| `MISSING` | Thiếu biến | Hướng dẫn mục 1-2, dừng |
| `INVALID` | 401 (`INVALID_TOKEN`, `TOKEN_INACTIVE`, `TOKEN_EXPIRED`) | Người dùng tạo / kích hoạt token mới |
| `RUN_AS_BLOCKED` | 403 `RUN_AS_USER_INACTIVE` / `TWO_FACTOR_SETUP_REQUIRED` | Người dùng đổi người chạy hoặc bật 2FA |
| `WRONG_WORKSPACE` | `workspace.baseUrl` khác origin | Dừng, không gọi tiếp |
| `INSUFFICIENT_PERMISSION` | Thiếu quyền cần | Nêu đúng mã quyền thiếu; phần chỉ đọc vẫn làm được |
| `UNVERIFIED_TRANSIENT` | Lỗi mạng / 5xx / 503 | Thử lại 1 lần sau vài giây, vẫn lỗi thì báo |

Ghi vào artifact: `<!-- antco-token-preflight:VERIFIED -->` kèm tên công ty, người chạy, số quyền, thời điểm - **không kèm token**.

## 4. Request

| Header | Khi nào | Giá trị |
|---|---|---|
| `Authorization` | Mọi request | `Bearer <ANTCO_API_KEY>` |
| `Content-Type` | Có body | `application/json` |
| `X-Antco-Run-Id` | Mọi lệnh ghi trong một lượt triển khai | 3-80 ký tự `A-Z a-z 0-9 _ . : -`; quy ước bundle: `ar_<yyyymmdd>_<6+ ký tự a-z0-9>` |

- Đường dẫn: `${ANTCO_BASE_URL}/api/public/v1/...`. Token **chỉ** dùng được cho `/api/public/v1/*` (gửi tới `/api/admin/*` -> 401). Không gửi cookie.
- `ref` đối tượng (`crm:account`, `cobj:phieu_khao_sat`) đặt trong path; mã hoá `:` thành `%3A` là tuỳ chọn.
- Git Bash trên Windows tự đổi đối số bắt đầu bằng `/` thành đường dẫn ổ đĩa: với `antco_client.mjs` viết path **không có `/` đầu** (VD `objects/crm:account`) hoặc đặt `MSYS_NO_PATHCONV=1`.
- **dryRun phía máy chủ:** lệnh ghi có hỗ trợ nhận `?dryRun=1` -> chạy đúng hàm nghiệp vụ thật trong transaction rồi huỷ; trả `data` = cái **sẽ** tạo/sửa, `meta.dryRun: true`, HTTP 200; lỗi kiểm tra trả như khi ghi thật. **Id trong kết quả dryRun là tạm - không dùng tiếp.**
- **Dry-run phía client (mặc định của script):** POST/PUT/DELETE chỉ in request (đã che token); `--server-dry-run` gửi kèm `dryRun=1`; `--apply` mới ghi thật.
- `PUT` của trường, giao diện, quy tắc, hành động, biểu mẫu, bộ lọc, quan hệ / section loại báo cáo **THAY TOÀN BỘ**: luôn `GET` trước, sửa, gửi lại đủ. `PUT /objects/{ref}`, `/report-types/{id}`, `/reports/{id}`, `/dashboards/{id}`, `/related-lists/{key}`, `/records/{ref}/{id}` chỉ đổi khoá gửi lên.
- Không theo redirect; chỉ `https://` (riêng `http://localhost` cho dev).

## 5. Phong bì

```json
{ "success": true, "data": { }, "meta": { "dryRun": true, "runId": "ar_20261002_k3x9qa", "page": 1, "limit": 50, "total": 120 } }
{ "success": false, "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Vui lòng nhập tên trường", "details": { } } }
```

- Thành công = HTTP 2xx **và** `success: true` (tạo mới: 201; dryRun: 200). `meta` chỉ có khi cần.
- `GET /openapi.json` trả thẳng OpenAPI (không bọc phong bì).
- Phân trang danh sách: `?page=` (từ 1) + `?limit=` (mặc định 50, tối đa 200) -> `meta.page/limit/total`. Riêng `GET /records/{ref}`: `data.rows`, `data.total`, `data.page`, `data.pageSize`.
- Lệnh ghi trả bản rút gọn -> **luôn đọc lại** bằng GET trước khi đánh dấu xong.

## 6. Giới hạn, thử lại, timeout

- **120 lần gọi / 60 giây / token**. Header `X-RateLimit-Limit`, `X-RateLimit-Remaining`. Vượt -> `429` + `Retry-After` (giây). **Không gửi song song.** Khi `Remaining` thấp, chậm lại.
- **Không có Idempotency-Key.** Lệnh ghi bị timeout / mất kết nối: **không gửi lại ngay** - đọc lại (GET theo slug/tên, hoặc `GET /runs/{runId}/items`) để biết đã ghi chưa, rồi mới quyết định.
- GET lỗi mạng / 5xx / 503: thử lại tối đa 1 lần.
- `409 CONFLICT`: trùng (slug, quy tắc trùng lặp, Composite ID). Đọc lại trạng thái, không tự ghi đè.

## 7. API bị cấm và nguồn hợp đồng

- Token **không bao giờ** dùng được cho: tài khoản, mật khẩu, 2FA, vai trò, phân quyền, token, thanh toán, bí mật, tích hợp, cấu hình email, thiết bị (`403 FORBIDDEN_ENDPOINT` / `FORBIDDEN`). Không thử vượt qua; việc đó người dùng tự làm trong Antco.
- Nguồn hợp đồng: `GET /api/public/v1/openapi.json`. Khác bảng trong skill -> **OpenAPI thắng**, ghi chú cho người dùng.
- **Cấm** đọc mã nguồn, bundle JS, log nội bộ Antco hoặc gọi `/api/admin/*` để đoán API. Không có endpoint -> ghi `CHUA_HO_TRO`, đề xuất cách làm tay trong Antco.

## 8. Tự kiểm trước mỗi lệnh ghi

- [ ] Preflight `VERIFIED` trong phiên, đúng công ty, có quyền cần.
- [ ] Có `X-Antco-Run-Id` của lượt chạy.
- [ ] Đã `--server-dry-run` payload này và không còn lỗi.
- [ ] Với PUT thay toàn bộ: payload dựng từ bản GET mới nhất.
- [ ] Không có token / mật khẩu / dữ liệu cá nhân thật trong payload hay tên file.
- [ ] Biết cách đọc lại và cách khắc phục (Public API gần như không có xoá cấu hình: khắc phục bằng sửa tiếp hoặc `isActive: false`).
