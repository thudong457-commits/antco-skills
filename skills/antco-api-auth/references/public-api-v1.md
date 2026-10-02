# Antco Public API v1 - hợp đồng rút gọn cho agent

- **Nguồn chuẩn:** `GET {ANTCO_BASE_URL}/api/public/v1/openapi.json` (OpenAPI 3.0, cần token, trả thẳng không bọc phong bì). File này là bản viết lại gọn của hợp đồng `1.0.0` (65 endpoint, ngày 2026-10-02) để agent tra nhanh. **Khác OpenAPI thì OpenAPI thắng** - ghi chú khác biệt cho người dùng.
- Tiền tố mọi đường dẫn: `${ANTCO_BASE_URL}/api/public/v1`.

## 1. Xác thực

- Token tạo ở **Cài đặt > Tích hợp > API Token** (quyền `settings:api_tokens:write`). Chọn "Chạy API dưới vai trò" = người dùng nội bộ đang hoạt động; token có **đúng quyền người đó** (nạp lại tối đa sau 60 giây khi quyền đổi). Giá trị token hiện **1 lần**; máy chủ chỉ lưu băm.
- Định dạng `antco_pat_` + 40 ký tự. Header: `Authorization: Bearer <token>`, `Content-Type: application/json`. Biến phía agent: `ANTCO_BASE_URL`, `ANTCO_API_KEY` (file `.env` cục bộ đã gitignore).
- Công ty xác định theo tên miền: token công ty A gửi tới tên miền công ty B -> `401 INVALID_TOKEN`. Token chỉ dùng cho `/api/public/v1/*`; không nhận cookie phiên.
- Từ chối khi: sai / đã xoá (`401 INVALID_TOKEN`), vô hiệu (`401 TOKEN_INACTIVE`), hết hạn sau 23:59 giờ VN ngày hết hạn (`401 TOKEN_EXPIRED`), người chạy bị khoá / nghỉ / không nội bộ (`403 RUN_AS_USER_INACTIVE`), người chạy là quản trị chưa bật 2FA (`403 TWO_FACTOR_SETUP_REQUIRED`).

## 2. Bị cấm với token

- Đường dẫn chứa: `api-tokens`, `tokens`, `users`, `auth`, `login`, `password`, `2fa`, `roles`, `user-roles`, `user-access`, `permissions`, `role-rules`, `payments`, `billing`, `subscriptions`, `secrets`, `integrations`, `email-providers`, `workspace-configs`, `devices` -> `403 FORBIDDEN_ENDPOINT`.
- Quyền không dùng được qua token (kể cả quản trị): `settings:api_tokens`, `settings:users`, `settings:roles`, `settings:user_roles`, `settings:role_rules`, `settings:security`, `settings:general`, `settings:email`, `workflow:secrets`, `crm:call_config`, `mkt:sms:config`, `mkt:ads`, `omni:channels`, `omni:personal-channels`; thanh toán (`finance:payment_requests`, `finance:payables`) chỉ xem -> `403 FORBIDDEN`.
- Không có endpoint tạo tài khoản, đổi mật khẩu, gán vai trò / quyền, thanh toán, cấu hình bí mật.

## 3. Phong bì, lỗi, giới hạn

- Thành công (200, tạo mới 201): `{ "success": true, "data": ..., "meta": { "dryRun", "runId", "page", "limit", "total" } }` (`meta` khi cần). Lỗi: `{ "success": false, "data": null, "error": { "code", "message", "details" } }`. JSON thuần, không chuỗi JSON lồng.
- Mã lỗi: 400 `VALIDATION_ERROR` / `INVALID_BODY` / `INVALID_RUN_ID` / `NOT_SUPPORTED` / `READ_ONLY_OBJECT`; 401 `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_INACTIVE` / `TOKEN_EXPIRED`; 403 `FORBIDDEN` / `FORBIDDEN_ENDPOINT` / `RUN_AS_USER_INACTIVE` / `TWO_FACTOR_SETUP_REQUIRED`; 404 `NOT_FOUND`; 409 `CONFLICT` (trùng; mức cảnh báo có `details.duplicate` -> gửi lại với `confirmDuplicate: true`); 429 `RATE_LIMITED`; 500 `INTERNAL_ERROR`; 503 `SERVICE_UNAVAILABLE`. Chi tiết xử lý: [errors.md](errors.md).
- **120 lần gọi / 60 giây / token** (cửa sổ cố định); `X-RateLimit-Limit`, `X-RateLimit-Remaining`; vượt -> 429 + `Retry-After`. Không gửi song song.
- Phân trang danh sách: `?page=` (từ 1) + `?limit=` (mặc định 50, tối đa 200) -> `meta.page/limit/total`. `GET /records/{ref}`: `data.rows/total/page/pageSize`, `limit` <= 200 (đối tượng của trung tâm bộ lọc chung <= 100).
- Không thử lại mù lệnh ghi: sau timeout đọc lại (GET) rồi mới quyết định. Không có Idempotency-Key.

## 4. dryRun và lượt chạy

- Lệnh ghi có cột dryRun nhận `?dryRun=1`: máy chủ chạy **đúng hàm nghiệp vụ thật** trong 1 transaction rồi huỷ -> `data` = cái sẽ được tạo / sửa, `meta.dryRun: true`, HTTP 200; lỗi trả như khi ghi thật. Id trong kết quả dryRun là **tạm**. dryRun không ghi lượt chạy.
- Header tuỳ chọn trên lệnh ghi: `X-Antco-Run-Id` (3-80 ký tự `A-Z a-z 0-9 _ . : -`, gợi ý `ar_<yyyymmdd>_<ngẫu nhiên>`). Mỗi tài nguyên tạo / sửa thành công được ghi `{ kind, action, objectRef, id, label }`.
- `GET /runs/{runId}/items`: đúng những gì lượt đó đã tạo / sửa (chỉ mục do chính người chạy hiện tại ghi).
- `DELETE /runs/{runId}/demo-records` (gọi `?dryRun=1` trước + hỏi người dùng): xoá MỀM **chỉ bản ghi đối tượng tự tạo mà lượt đó TẠO**, con trước cha, qua service xoá thật (quyền `:delete`, quy tắc bảo mật, tính lại tổng hợp). Bỏ qua bản ghi đã xoá, người khác tạo, hoặc có con ngoài lượt. KHÔNG xoá cấu hình và KHÔNG đụng bản ghi có sẵn mà lượt chỉ sửa. Trả `{ runId, dryRun, deleted[], skipped[] }`.

## 5. Quy ước dữ liệu

- `ref`: có sẵn `<module>:<key>` (VD `crm:account`, `scm:product`, `hrm:staff`), tự tạo `cobj:<slug>`; mã hoá `:` thành `%3A` là tuỳ chọn.
- Slug đối tượng / trường: ASCII `lower_snake_case` (bỏ trống = sinh từ nhãn tiếng Việt bỏ dấu). Nhãn tiếng Việt lưu trực tiếp. Tham chiếu trường bằng slug thật đọc lại.
- **PUT thay toàn bộ**: trường, giao diện, quy tắc (giao diện / trùng lặp / bảo mật / trạng thái), lộ trình, hành động, biểu mẫu, bộ lọc, quan hệ / section loại báo cáo -> luôn GET trước, sửa, gửi đủ. **PUT chỉ khoá gửi lên**: `/objects/{ref}`, `/report-types/{id}`, `/reports/{id}`, `/dashboards/{id}`, `/related-lists/{key}`, `/records/{ref}/{id}`.
- Bản ghi: đối tượng TỰ TẠO đọc / ghi / xoá mềm; đối tượng CÓ SẴN **chỉ đọc** trong phạm vi người chạy (đối tượng chưa đọc chung -> `400 NOT_SUPPORTED`).
- Quyền `cobj:<slug>:read|write|delete` sinh ra khi tạo đối tượng; người dùng cấp theo vai trò ở Cài đặt > Phân quyền.

## 6. Danh mục endpoint

Cột "dryRun" = nhận `?dryRun=1`. Cột "Lượt" = loại mục ghi vào lượt chạy khi có `X-Antco-Run-Id`.

### Hệ thống và lượt chạy

| Method | Đường dẫn | Quyền người chạy | dryRun | Lượt |
|---|---|---|---|---|
| GET | `/whoami` | token hợp lệ | - | - |
| GET | `/openapi.json` | token hợp lệ | - | - |
| GET | `/meta/field-types` | `settings:custom_fields:read` | - | - |
| GET | `/runs/{runId}/items` | người chạy (chỉ mục do chính người đó ghi) | - | - |
| DELETE | `/runs/{runId}/demo-records` | `cobj:<slug>:delete` từng đối tượng | có | - |

### Đối tượng, trường, giao diện, quy tắc

| Method | Đường dẫn | Quyền | dryRun | Lượt |
|---|---|---|---|---|
| GET | `/objects` | `settings:custom_fields:read` | - | - |
| GET | `/objects/{ref}` | `settings:custom_fields:read` | - | - |
| POST | `/objects` | `settings:custom_objects:write` | có | object |
| PUT | `/objects/{ref}` (chỉ đối tượng tự tạo; khoá gửi lên) | `settings:custom_objects:write` | có | object |
| GET | `/objects/{ref}/fields` | `settings:custom_fields:read` | - | - |
| POST | `/objects/{ref}/fields` | `settings:custom_fields:write` | có | field |
| PUT | `/objects/{ref}/fields/{id}` (thay toàn bộ, không đổi kiểu) | `settings:custom_fields:write` | có | field |
| GET | `/objects/{ref}/layouts` (phân trang) | `settings:custom_fields:read` | - | - |
| GET | `/objects/{ref}/layouts/{id}` (`standard` = giao diện tiêu chuẩn) | `settings:custom_fields:read` | - | - |
| POST | `/objects/{ref}/layouts` | `settings:custom_fields:write` | có | layout |
| PUT | `/objects/{ref}/layouts/{id}` (thay toàn bộ) | `settings:custom_fields:write` | có | layout |
| GET / POST | `/objects/{ref}/layout-rules` | read / write | POST có | layout_rule |
| PUT | `/objects/{ref}/layout-rules/{id}` (thay toàn bộ) | write | có | layout_rule |
| GET / POST | `/objects/{ref}/duplicate-rules` | read / write | POST có | duplicate_rule |
| PUT | `/objects/{ref}/duplicate-rules/{id}` (thay toàn bộ) | write | có | duplicate_rule |
| GET / POST | `/objects/{ref}/security-rules` (chỉ đối tượng tự tạo) | read / write | POST có | security_rule |
| PUT | `/objects/{ref}/security-rules/{id}` (thay toàn bộ) | write | có | security_rule |
| GET / POST | `/objects/{ref}/status-rules` | read / write | POST có | status_rule |
| PUT | `/objects/{ref}/status-rules/{id}` (thay toàn bộ) | write | có | status_rule |
| GET / PUT | `/objects/{ref}/path` | read / write | PUT có | path |
| GET / POST | `/objects/{ref}/actions` (chỉ đối tượng tự tạo) | read / write | POST có | action |
| PUT | `/objects/{ref}/actions/{id}` (thay toàn bộ, không đổi `actionType`) | write | có | action |
| GET / POST | `/objects/{ref}/forms` (chỉ đối tượng tự tạo) | read / write | POST có | form |
| PUT | `/objects/{ref}/forms/{id}` (thay toàn bộ) | write | có | form |
| GET | `/objects/{ref}/related-lists` | read | - | - |
| PUT | `/objects/{ref}/related-lists/{key}` (khoá gửi lên) | write | có | related_list |
| PUT | `/objects/{ref}/related-lists/order` | write | có | related_list |

(read / write = `settings:custom_fields:read` / `settings:custom_fields:write`)

### Bản ghi và bộ lọc

| Method | Đường dẫn | Quyền | dryRun | Lượt |
|---|---|---|---|---|
| GET | `/records/{ref}?q=&page=&limit=&sort=&dir=&filterId=&adhoc=&view=` | `cobj:<slug>:read` hoặc quyền xem của phân hệ | - | - |
| GET | `/records/{ref}/{id}` | như trên | - | - |
| POST | `/records/{ref}` (chỉ đối tượng tự tạo) | `cobj:<slug>:write` | có | record |
| PUT | `/records/{ref}/{id}` (chỉ trường gửi lên) | `cobj:<slug>:write` | có | record |
| DELETE | `/records/{ref}/{id}` (xoá mềm) | `cobj:<slug>:delete` | có | record |
| GET | `/filters/targets` | `settings:list_filters:read` | - | - |
| GET | `/filters?module=&object=` | quyền xem đối tượng | - | - |
| POST | `/filters?module=&object=` | quyền xem đối tượng | có | filter |
| PUT | `/filters/{id}?module=&object=` (thay toàn bộ, kể cả chia sẻ) | + người tạo / được chia sẻ Sửa | có | filter |
| DELETE | `/filters/{id}?module=&object=` (xoá mềm) | + là người tạo | có | filter |

### Báo cáo và bảng điều khiển

| Method | Đường dẫn | Quyền | dryRun | Lượt |
|---|---|---|---|---|
| GET | `/report-types`, `/report-types/{id}` (id hoặc slug) | `settings:report_types:read` | - | - |
| POST | `/report-types` | `settings:report_types:write` | có | report_type |
| PUT | `/report-types/{id}` (khoá gửi lên) | `settings:report_types:write` | có | report_type |
| PUT | `/report-types/{id}/relations` (thay toàn bộ, tối đa 7) | `settings:report_types:write` | có | report_type |
| PUT | `/report-types/{id}/sections` (thay toàn bộ) | `settings:report_types:write` | có | report_type |
| GET | `/reports`, `/reports/{id}` | `settings:reports:read` | - | - |
| POST | `/reports` | `settings:reports:write` | có | report |
| PUT | `/reports/{id}` (khoá gửi lên) | `settings:reports:write` | có | report |
| POST | `/reports/run` (`reportId`, hoặc `reportTypeId` + `config` chưa lưu) | `settings:reports:read` (+ `:write` khi config chưa lưu) | - | - |
| GET | `/dashboards`, `/dashboards/{id}` | `settings:dashboards:read` | - | - |
| POST | `/dashboards` | `settings:dashboards:write` | có | dashboard |
| PUT | `/dashboards/{id}` (khoá gửi lên) | `settings:dashboards:write` | có | dashboard |
| POST | `/dashboards/{id}/data` | `settings:dashboards:read` | - | - |

## 7. Body chính (tóm tắt - ví dụ đầy đủ ở skill chuyên trách)

| Endpoint | Khoá body |
|---|---|
| `POST /objects` | `label`, `plural`, `slug`, `module` (`crm\|hrm\|fsm\|scm\|scm_assets\|fin\|okr\|lms\|mkt\|omni`), `objectType` (`normal\|child\|junction`), `parentRef` (child), `junctionRefs[2]` (junction), `description`, `nameLabel`, `nameType` (`text\|autonumber`), `nameSettings { prefix, suffix, digits, startAt, step }` |
| `PUT /objects/{ref}` | `label`, `plural`, `description`, `hideCreateButton`, `isActive`, `allowReports`, ... (khoá gửi lên) |
| `POST/PUT .../fields` | `label`, `type`, `slug` (POST), `options[{ value, label, color?, isDefault?, active? }]`, `settings{...}`, `section`, `showInList`, `isActive` (PUT) |
| `POST/PUT .../layouts` | `name`, `screens` (`all\|create\|edit`), `isActive`, `assign[]`, `config { v: 2, page, rows[] }`, `platforms { web, mobile }`, `allowSelect`, `copyFrom` (POST) |
| `.../layout-rules` | `name`, `description`, `isActive`, `layoutIds[]`, `priority`, `condition`, `actions[{ target: field\|section, key, action, value? }]` |
| `.../duplicate-rules` | `name`, `description`, `isActive`, `logic`, `conditions[{ field, match }]`, `blankAsDuplicate`, `onCreate`, `onUpdate` (`block\|warn\|allow`), `message` |
| `.../security-rules` | `name`, `description`, `isActive`, `filter`, `people[{ type, ids }]`, `canEdit`, `canDelete` |
| `.../status-rules` | `name`, `description`, `fieldKey`, `isActive`, `transitions[{ from ("" = khi tạo), to, requiredFields[] }]` |
| `PUT .../path` | `fieldKey`, `isActive`, `steps[{ value, guidance, keyFields[] (<= 5) }]` |
| `.../actions` | `actionType` (`update\|create\|clone\|delete\|chain`), `name`, `slug`, `icon`, `display` (`center\|right\|left\|fullscreen`), `isActive`, `title` (chain), `config` theo loại |
| `.../forms` | `name`, `slug` (3-60, `a-z0-9-`), `description`, `isActive`, `layoutId`, `settings` |
| `PUT .../related-lists/{key}` | `label`, `visibility` (`hidden\|visible\|has_data`), `columns[{ key, visible, pinned }]`, `minRecords`, `maxRecords` |
| `POST/PUT /records/{ref}` | `name` (tên kiểu Văn bản), `values { <slug>: giá trị }`, `confirmDuplicate`, `via` (Trung gian) |
| `POST/PUT /filters` | `name`, `description`, `logic`, `expression`, `conditions[]`, `sorts[{ field, dir }]`, `pageSize` (20\|50\|100), `columns[]`, `layout`, `shares[{ targetType, targetId, permission, mode }]` |
| `POST /report-types` | `name`, `description`, `category`, `slug`, `status` (`deployed\|draft`), `mainObjectRef` |
| `PUT /report-types/{id}/relations` | `relations[{ alias, from ("main" \| alias), field, objectRef, join }]` (<= 7) |
| `PUT /report-types/{id}/sections` | `sections[{ id, name, fields[{ alias, key }] }]` |
| `POST /reports` | `name`, `description`, `slug`, `folderId`, `reportTypeId`, `config { rowGroups, colGroups, columns, formulas, filter, scopeMode, linkedFilters, limit }`, `shares` |
| `POST /reports/run` | `reportId` + `page`, `pageSize` - hoặc `reportTypeId` + `config` |
| `POST /dashboards` | `name`, `description`, `slug`, `layout { cols, palette, filter, widgets[] }`, `shares` |
| `POST /dashboards/{id}/data` | `filter`, `widgetIds?` |

## 8. Không có trong v1 (ghi `CHUA_HO_TRO`, hướng dẫn người dùng làm trong Antco)

- Xoá đối tượng, trường, giao diện, quy tắc, hành động, biểu mẫu (chỉ tắt bằng `isActive: false` qua PUT).
- Ghi đè trường có sẵn (ẩn / đổi nhãn / bắt buộc), Composite ID, theo dõi lịch sử trường, cấu hình AI của đối tượng, sửa thông tin đối tượng có sẵn.
- Ghi bản ghi đối tượng có sẵn (CRM, Kho, Kế toán, Nhân sự...) - **chỉ đọc**.
- Thư mục báo cáo, tải tệp / ảnh, danh sách nhân sự / phòng ban / vị trí / vai trò (id cho chia sẻ / gán: hỏi người dùng hoặc lấy từ bản ghi đọc được).
- Tạo hàng loạt bản ghi (gọi `POST /records/{ref}` từng bản ghi, tôn trọng 120 lần/phút).
- Mọi thứ ở mục 2 (bị cấm với token).

## 9. Ghi chú đối chiếu (người bảo trì bundle)

Đã đối chiếu toàn bộ đường dẫn / body / quyền / mã lỗi với hợp đồng 1.0.0 ngày 2026-10-02. Vài ví dụ trong tài liệu hợp đồng khác hành vi kiểm hợp lệ của máy chủ; bundle dùng dạng đúng sau (cần Antco sửa lại ví dụ trong tài liệu):

- Giao diện: `screens` là `all | create | edit` (ví dụ ghi `both`); `assign` là mảng `[{ type: user|department|position|role, ids[], screens[] }]`, `[]` = mọi người (ví dụ ghi `{ mode: "all" }`); `config` phải có `"v": 2` và `rows` là Layout Row (ví dụ đặt Section thẳng trong `rows` và thiếu `v` -> máy chủ dựng khung trống).
- Hành động chuỗi: `title` ở cấp ngoài cùng của body (mô tả ghi trong `config`).
