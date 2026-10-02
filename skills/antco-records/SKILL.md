---
name: antco-records
description: "Đọc và ghi bản ghi Antco qua Public API (/records/{ref}): đọc danh sách có tìm/sắp xếp/bộ lọc/phân trang trong phạm vi dữ liệu của người chạy, xem chi tiết; tạo, sửa, xoá mềm bản ghi đối tượng tự tạo (đối tượng có sẵn chỉ đọc), xử lý cảnh báo trùng lặp; sinh DỮ LIỆU DEMO theo kịch bản nghiệp vụ gắn X-Antco-Run-Id để kiểm công thức/tổng hợp/quy tắc/báo cáo rồi dọn đúng phần lượt chạy đã tạo. Dùng khi cần xem dữ liệu, nhập bản ghi người dùng yêu cầu rõ, hoặc tạo/dọn dữ liệu demo."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Records & Demo Data

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Kịch bản demo: [references/demo-data.md](references/demo-data.md). Giá trị theo kiểu trường: [../antco-fields/references/field-types.md](../antco-fields/references/field-types.md). Điều kiện lọc: [../antco-filters/references/operators.md](../antco-filters/references/operators.md).

## Luật cứng

1. **Đối tượng có sẵn (CRM, Kho, Kế toán, Nhân sự...) chỉ đọc** qua Public API v1. Không tìm cách ghi qua đường khác.
2. **Không sửa, không xoá bản ghi nghiệp vụ có sẵn** của công ty, kể cả của đối tượng tự tạo đã có trước lượt chạy. Chỉ ghi: (a) bản ghi demo của lượt chạy, (b) bản ghi người dùng yêu cầu rõ từng cái trong chat.
3. Đọc dữ liệu thật chỉ ở mức cần cho thiết kế (đếm, vài mẫu); không chép dữ liệu khách hàng thật vào artifact.
4. Dữ liệu demo là **giả lập**: tên hư cấu, email `@example.com`, số điện thoại `09000000xx`. Không dùng tên, số điện thoại, email, mã số thuế thật.
5. Xoá luôn là xoá mềm; dọn demo chỉ qua `/runs/{runId}/demo-records` sau khi liệt kê và người dùng xác nhận.

## Quyền

| Việc | Quyền người chạy API |
|---|---|
| Đọc đối tượng tự tạo | `cobj:<slug>:read` (+ quy tắc bảo mật dữ liệu) |
| Đọc đối tượng có sẵn | quyền xem của phân hệ (VD `crm:customers:read`) + phạm vi dữ liệu; đối tượng chưa đọc chung -> `400 NOT_SUPPORTED` |
| Tạo / sửa | `cobj:<slug>:write` |
| Xoá / dọn demo | `cobj:<slug>:delete` - **cổng hẹp** |

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/records/{ref}?q=&page=&limit=&sort=&dir=&filterId=&adhoc=&view=` -> `data { rows, total, page, pageSize, labels }` |
| GET | `/api/public/v1/records/{ref}/{id}` -> `data { record { id, name, values }, labels }` |
| POST | `/api/public/v1/records/{ref}?dryRun=1` |
| PUT | `/api/public/v1/records/{ref}/{id}?dryRun=1` (chỉ trường gửi trong `values`, + `name` nếu tên kiểu Văn bản) |
| DELETE | `/api/public/v1/records/{ref}/{id}?dryRun=1` (xoá mềm, kèm con phụ thuộc) |
| GET | `/api/public/v1/runs/{runId}/items?page=&limit=` |
| DELETE | `/api/public/v1/runs/{runId}/demo-records?dryRun=1` |

## Đọc

```bash
node <scripts>/antco_client.mjs GET "/records/cobj:phieu_khao_sat?limit=5&sort=createdAt&dir=desc"
```

- `limit` <= 200 (đối tượng của trung tâm bộ lọc chung <= 100). Không quét toàn bộ dữ liệu lớn - dùng báo cáo để đếm / tổng.
- `adhoc` = JSON điều kiện chuẩn `{ "logic": "AND", "expression": null, "conditions": [...] }`, mã hoá URL. `filterId` / `adhoc` / `view` chỉ dùng với đối tượng tự tạo và đối tượng của trung tâm bộ lọc chung.
- `labels` = nhãn hiển thị của giá trị tra cứu / lựa chọn.
- Kết quả đã áp phạm vi của người chạy: thiếu bản ghi **không** có nghĩa là không tồn tại.

## Ghi (đối tượng tự tạo)

```json
POST /api/public/v1/records/cobj%3Aphieu_khao_sat?dryRun=1
{ "values": { "khach_hang": "<id tài khoản>", "dia_chi": "KCN Tân Bình, TP.HCM", "ngay_khao_sat": "2026-10-05", "ky_thuat_vien": "<id nhân sự>", "trang_thai": "moi" },
  "confirmDuplicate": false }
```

- Khoá trong `values` = slug trường thật. Không gửi trường tính (đánh số, công thức, tổng hợp). Tên bản ghi kiểu Văn bản gửi ở `name`.
- Máy chủ kiểm như khi người dùng nhập tay: bắt buộc, lựa chọn, Composite ID, quy tắc trùng lặp, số bản ghi tối đa của danh sách liên quan, chuyển trạng thái; tính công thức + tổng hợp.
- `409 CONFLICT` có `details.duplicate` (mức cảnh báo): chỉ gửi lại với `confirmDuplicate: true` khi người dùng đồng ý; với demo -> đổi dữ liệu cho khỏi trùng.
- Chuyển trạng thái bị chặn: đi đúng đường chuyển, mỗi lần một bước, nhập trường bắt buộc của đường đó.
- Đối tượng Trung gian tắt "Cho phép tạo trực tiếp": gửi `via` = slug trường liên kết và `values[via]`.

## Dữ liệu demo (quy trình)

1. Chỉ làm khi **kế hoạch đã duyệt có mục demo** (đối tượng, số lượng, kịch bản).
2. Lập bảng demo theo [references/demo-data.md](references/demo-data.md): cha trước, con sau; phủ đủ trạng thái, lựa chọn, khoảng ngày.
3. Tham chiếu tới đối tượng có sẵn (khách hàng, nhân sự) dùng **bản ghi có sẵn người dùng chỉ định** (chỉ đọc id, không sửa). Không tạo được bản ghi có sẵn qua API.
4. Tạo **từng bản ghi** (`POST /records/{ref}`, không có API hàng loạt), `--run-id <run_id>`, tuần tự, tôn trọng 120 lần / 60 giây. Ghi id trả về vào checkpoint.
5. Kiểm: công thức, tổng hợp ở cha, đánh số, quy tắc, bộ lọc, báo cáo ra số khớp tính tay.
6. Bàn giao: hỏi **giữ** hay **dọn**. Dọn: `GET /runs/{runId}/items` -> `DELETE /runs/{runId}/demo-records?dryRun=1` -> liệt kê cho người dùng -> xác nhận -> gọi thật -> đọc lại (`items[].cleanedAt` có giá trị). Máy chủ chỉ xoá bản ghi đối tượng tự tạo **do lượt đó tạo**, con trước cha; bỏ qua (`skipped`) bản ghi người khác tạo hoặc có con ngoài lượt - báo lại danh sách bỏ qua.

## Bẫy

- Gửi `label` của lựa chọn thay cho `value` -> 400.
- Ngày giờ thiếu múi giờ -> lệch ngày trong báo cáo (Antco tính theo GMT+7).
- Bản ghi con cần id cha thật (id trả về từ lệnh tạo thật, **không** phải id của dryRun).
- Timeout khi tạo: không gửi lại ngay; `GET /runs/{runId}/items` hoặc tìm theo dữ liệu duy nhất để biết đã tạo chưa.
- Người chạy chưa có `cobj:<slug>:write` (đối tượng vừa tạo) -> `403`; người dùng cấp quyền rồi chờ tối đa 60 giây.
