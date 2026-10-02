---
name: antco-objects
description: "Đọc và tạo đối tượng Antco qua Public API: liệt kê đối tượng có sẵn (crm:account, hrm:staff...) và tự tạo (cobj:<slug>) theo phân hệ, xem chi tiết (trường, giao diện, danh sách liên quan, hành động, biểu mẫu), tạo đối tượng tự tạo loại Thường / Con / Trung gian với tên bản ghi văn bản hoặc đánh số tự động, sửa thông tin (tên, mô tả, ẩn nút tạo, đang hoạt động, cho phép báo cáo). Dùng khi cần một loại dữ liệu nghiệp vụ mới trên Antco; thêm trường dùng antco-fields."
license: MIT
metadata:
  author: Antco
  version: "1.0.0"
---

# Antco Objects

- **Phiên bản:** `1.0.0` - **Ngày phát hành:** `2026-10-02`
- Xác thực, phong bì, lỗi: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Endpoint: [../antco-api-auth/references/public-api-v1.md](../antco-api-auth/references/public-api-v1.md).

## Khi nào dùng

- Cần một loại dữ liệu mới (phiếu, hạng mục, phương án...) mà đối tượng có sẵn không đáp ứng.
- Khảo sát đối tượng hiện có trước khi thiết kế (chỉ đọc).
- Đổi tên / mô tả / ẩn nút tạo / bật tắt / cho phép báo cáo của **đối tượng tự tạo**.

Không làm được qua Public API v1 (-> `CHUA_HO_TRO`, người dùng làm ở Cài đặt > Dữ liệu > Đối tượng): xoá đối tượng, sửa thông tin đối tượng có sẵn, Composite ID, theo dõi lịch sử, cấu hình AI.

## Quyền (người chạy API)

| Việc | Quyền |
|---|---|
| Đọc | `settings:custom_fields:read` |
| Tạo / sửa đối tượng tự tạo | `settings:custom_objects:write` |

## Endpoint

| Method | Đường dẫn |
|---|---|
| GET | `/api/public/v1/objects` -> `data.modules[].objects[]` (`ref`, `label`, `kind`, `objectType`, `customFieldCount`) |
| GET | `/api/public/v1/objects/{ref}` -> `object`, `customFields`, `overrides`, `settings`, `path`, `layouts`, `relatedLists`, `actions`, `forms` |
| POST | `/api/public/v1/objects?dryRun=1` |
| PUT | `/api/public/v1/objects/{ref}?dryRun=1` (chỉ đối tượng tự tạo; khoá không gửi giữ nguyên) |

## Quy trình

1. **Đọc trước:** `GET /objects` - tìm đối tượng tương tự theo nhãn trong mọi phân hệ. Có sẵn đáp ứng -> đề xuất **tái dùng** (liên kết bằng trường tra cứu), không tạo danh mục trùng.
2. **Ảnh chụp** (khi sẽ sửa đối tượng tự tạo đã có): lưu `GET /objects/{ref}` + `GET /objects/{ref}/layouts` vào `snapshots/pre-apply-<ts>/` (tên file thay `:` bằng `__`).
3. **Dry-run:** `POST /objects?dryRun=1` -> sửa đến khi `success: true`. Id trong kết quả dryRun là tạm.
4. **Ghi thật** (kế hoạch đã duyệt): cùng payload, `--apply --run-id <run_id>`.
5. **Đọc lại:** `GET /objects/{ref}` - so `label`, `plural`, `objectType`, `module`, tên bản ghi; với Con / Trung gian lấy **slug trường tra cứu phụ thuộc** máy chủ tự sinh (cần cho Tổng hợp, danh sách liên quan, bản ghi con).

### Tạo đối tượng Thường, tên bản ghi đánh số tự động

```json
POST /api/public/v1/objects?dryRun=1
{
  "label": "Phiếu khảo sát",
  "plural": "Phiếu khảo sát",
  "slug": "phieu_khao_sat",
  "module": "fsm",
  "objectType": "normal",
  "description": "Khảo sát hiện trường trước khi lập phương án kỹ thuật",
  "nameLabel": "Mã phiếu",
  "nameType": "autonumber",
  "nameSettings": { "prefix": "KS-{yyyy}-", "suffix": "", "digits": 4, "startAt": 1, "step": 1 }
}
```

### Tạo đối tượng Con

```json
{ "label": "Khu vực khảo sát", "plural": "Khu vực khảo sát", "slug": "khu_vuc_khao_sat", "module": "fsm",
  "objectType": "child", "parentRef": "cobj:phieu_khao_sat",
  "nameLabel": "Mã khu vực", "nameType": "autonumber", "nameSettings": { "prefix": "KV-", "digits": 6 } }
```

Cha có thể là đối tượng tự tạo hoặc đối tượng có sẵn được hỗ trợ làm cha (máy chủ từ chối nếu không). Máy chủ tự tạo trường **Tra cứu phụ thuộc** về cha (xoá cha xoá con, cha có danh sách liên quan).

### Tạo đối tượng Trung gian

```json
{ "label": "Vật tư của phương án", "plural": "Vật tư của phương án", "slug": "phuong_an_vat_tu", "module": "fsm",
  "objectType": "junction", "junctionRefs": ["cobj:phuong_an_ky_thuat", "<ref vật tư đọc từ GET /objects>"],
  "nameLabel": "Mã dòng", "nameType": "autonumber", "nameSettings": { "prefix": "VT-", "digits": 6 }, "allowDirectCreate": false }
```

`allowDirectCreate: false` -> bản ghi chỉ tạo từ trang của một trong 2 đối tượng (API: gửi `via` = mã trường liên kết + `values[via]`).

### Sửa thông tin đối tượng tự tạo

```json
PUT /api/public/v1/objects/cobj%3Aphieu_khao_sat?dryRun=1
{ "label": "Phiếu khảo sát hiện trường", "description": "...", "hideCreateButton": false, "isActive": true, "allowReports": true }
```

## Quy tắc hợp lệ

- `slug`: chữ thường không dấu, số, `_`; bắt đầu bằng chữ; 2-50 ký tự; không trùng từ khoá hệ thống. Bỏ trống = máy chủ sinh từ `label`. **Không đổi được sau khi tạo.** Slug của đối tượng đã xoá vẫn bị giữ chỗ -> chọn slug khác.
- `module`: `crm | hrm | fsm | scm | scm_assets | fin | okr | lms | mkt | omni` (menu trái phân hệ đó, nhóm "Tùy chỉnh"). Không rõ đặt ở đâu -> hỏi người dùng.
- `objectType`: `normal` | `child` (bắt buộc `parentRef`) | `junction` (bắt buộc `junctionRefs` gồm 2 ref khác nhau).
- `nameType`: `text` (người dùng nhập, bắt buộc) | `autonumber` (`nameSettings { prefix <= 30, suffix <= 30, digits 1-10, startAt >= 1, step 1-1000 }`). Con / Trung gian / chứng từ nên dùng `autonumber`.
- Nhãn tiếng Việt có dấu, lưu trực tiếp.

## Bẫy thường gặp

- Tạo đối tượng trùng chức năng đối tượng có sẵn (VD "Khách hàng" riêng) -> phá liên kết dữ liệu giữa các phân hệ.
- Tạo Con trước khi cha tồn tại -> lỗi.
- Quyền `cobj:<slug>:read|write|delete` sinh ra khi tạo nhưng **chỉ vai trò Toàn quyền có ngay**; quyền của người chạy API được nạp lại tối đa sau 60 giây. Nếu người chạy không phải Toàn quyền, ghi/đọc bản ghi đối tượng mới sẽ `403` cho tới khi người dùng cấp quyền ở Cài đặt > Phân quyền - ghi rõ trong kế hoạch.
- Không có xoá: tạo nhầm thì đặt `isActive: false` và báo người dùng xoá tay nếu muốn.

## Báo kết quả

`ref`, nhãn, loại, phân hệ, tên bản ghi, (Con / Trung gian) slug trường tra cứu phụ thuộc, link cấu hình `/settings/objects/<ref>`, trang bản ghi `/o/<slug>`.
