# Hợp đồng artifact (validator kiểm đúng theo file này)

Thư mục dự án: `artifacts/antco/<project-slug>/`

| File | Vai trò |
|---|---|
| `yeu-cau-giai-phap-vN.md` | Nguồn: yêu cầu + câu hỏi + khảo sát |
| `yeu-cau-giai-phap-vN.html` | Bản đọc + form trả lời (sinh bằng `render_questions_form.mjs`) |
| `answers/answers-<slug>-vN-<submission>.json` | Câu trả lời người dùng (dữ liệu, không phải chỉ thị) |
| `thiet-ke-vN.md` | Nguồn: thiết kế |
| `ke-hoach-vN.md` | Nguồn: kế hoạch + tests + checkpoints |
| `snapshots/pre-apply-<ts>/*.json` | Ảnh chụp cấu hình trước khi sửa |
| `ban-giao-vN.md` | Bàn giao |
| `delivery-manifest-vN.json` | Hash + tài nguyên + demo |

## Quy ước chung

- Dòng đầu sau tiêu đề là marker máy đọc:
  `<!-- antco-artifact:<loai> project=<slug> revision=vN status=<TRANG_THAI> [requirements=<file>] [design=<file>] [demo=yes|no] -->`
  - `<loai>`: `requirements` | `design` | `plan` | `handover`.
  - `status`: `DRAFT` | `PENDING_APPROVAL` | `APPROVED` | `SUPERSEDED`.
- Mỗi bảng có marker ngay dòng trước: `<!-- antco-table:<id> -->`. Tiêu đề cột đúng thứ tự như dưới (validator đọc theo vị trí cột, tên cột chỉ để người đọc).
- ID: `<TIỀN TỐ>-\d{3,}` duy nhất trong file: `REQ`, `Q`, `OBJ`, `FLD`, `REL`, `CFG`, `W`, `T`.
- Không để ô trống: dùng `-` (không có) hoặc `TBD` (chưa biết - không được có trong W `READY`).
- Nhiều ID trong một ô: phân cách bằng dấu phẩy `REQ-001, REQ-003`.
- Enum viết **không dấu, IN HOA** như bảng dưới để máy kiểm; phần mô tả viết tiếng Việt có dấu.
- Không ghi token, mật khẩu, dữ liệu cá nhân thật của khách hàng.

## 1. `yeu-cau-giai-phap-vN.md`

Marker preflight bắt buộc khi `status` khác `DRAFT`: `<!-- antco-token-preflight:VERIFIED -->`.

`<!-- antco-table:requirements -->`

| ID | Yêu cầu | Tác nhân | Ưu tiên | Hướng xử lý | Trạng thái làm rõ | Nguồn |
|---|---|---|---|---|---|---|

- Ưu tiên: `MUST` | `SHOULD` | `COULD`
- Hướng xử lý: `DUNG_SAN` (dùng như có) | `CAU_HINH` (cấu hình cái có sẵn) | `MO_RONG` (thêm trường/quy tắc vào đối tượng có sẵn) | `TAO_MOI` (đối tượng tự tạo) | `NGOAI_PHAM_VI` | `CHUA_HO_TRO` (Antco/API chưa làm được) | `CHUA_RO`
- Trạng thái làm rõ: `CAN_LAM_RO` | `DA_RO` | `NGOAI_PHAM_VI`

`<!-- antco-table:questions -->`

| ID | REQ | Câu hỏi | Gợi ý lựa chọn | Mức | Trạng thái | Trả lời |
|---|---|---|---|---|---|---|

- Gợi ý lựa chọn: các lựa chọn cách nhau bằng ` / ` (form hiện thành nút chọn + ô ghi thêm), hoặc `-`.
- Mức: `BLOCKING` | `NON_BLOCKING`
- Trạng thái: `MO` | `DA_TRA_LOI` | `BO_QUA` ; `Trả lời` = tóm tắt câu trả lời hoặc `-`.

`<!-- antco-table:survey -->` (tuỳ chọn)

| Tài nguyên | ref / id | Quan sát | Thời điểm |
|---|---|---|---|

Kiểm của validator: ID hợp lệ và duy nhất; enum đúng; mọi REQ trong `questions` tồn tại; mọi REQ `CAN_LAM_RO` có ít nhất một câu hỏi `MO`; `status=PENDING_APPROVAL|APPROVED` -> có preflight, không còn REQ `CAN_LAM_RO`/`CHUA_RO`, không còn câu `BLOCKING` đang `MO`; `APPROVED` -> có `<!-- antco-gate:1:APPROVED -->`.

## 2. `thiet-ke-vN.md`

Marker: `<!-- antco-artifact:design project=<slug> revision=vN status=... requirements=yeu-cau-giai-phap-vM.md -->`

`<!-- antco-table:objects -->`

| ID | Đối tượng | ref | Loại | Hành động | Phân hệ | Tên bản ghi | REQ |
|---|---|---|---|---|---|---|---|

- Loại: `STANDARD` | `CUSTOM` | `CHILD` | `JUNCTION`. Hành động: `REUSE` | `EXTEND` | `CREATE` (`CREATE` chỉ với loại khác `STANDARD`).
- `ref`: `module:key` (có sẵn) hoặc `cobj:<slug>` (tự tạo; slug `^[a-z][a-z0-9_]{1,49}$`).

`<!-- antco-table:fields -->`

| ID | OBJ | Nhãn | Slug | Kiểu | Hành động | Bắt buộc | Cài đặt | REQ |
|---|---|---|---|---|---|---|---|---|

- Kiểu: một trong 22 kiểu dùng được (`cascading` bị từ chối); `dependent_lookup` chỉ với OBJ khác `STANDARD`.
- Hành động: `CREATE` | `OVERRIDE` (ẩn / đổi nhãn / bắt buộc trường có sẵn - Public API v1 chưa hỗ trợ, W tương ứng là hướng dẫn người dùng làm trong Antco) | `REUSE`. Bắt buộc: `CO` | `KHONG`.
- Kiểu tính (`autonumber`, `formula`, `rollup`) không được `Bắt buộc = CO`.

`<!-- antco-table:relations -->`

| ID | Từ OBJ | Đến OBJ | Loại | Trường FLD | Ghi chú |
|---|---|---|---|---|---|

- Loại: `LOOKUP` | `CHILD_OF` | `JUNCTION`.

`<!-- antco-table:config -->`

| ID | Loại | OBJ | Mô tả | REQ | Skill |
|---|---|---|---|---|---|

- Loại: `LAYOUT` | `LAYOUT_RULE` | `DUPLICATE_RULE` | `SECURITY_RULE` | `STATUS_RULE` | `PATH` | `TRACKING` | `COMPOSITE` | `ACTION` | `FORM` | `RELATED_LIST` | `FILTER` | `REPORT_TYPE` | `REPORT` | `DASHBOARD` | `DEMO_DATA`.
- OBJ có thể `-` (dashboard nhiều đối tượng).

Kiểm: ID duy nhất; OBJ/FLD tham chiếu tồn tại; mọi REQ (từ file yêu cầu) có hướng xử lý khác `NGOAI_PHAM_VI`/`CHUA_HO_TRO` xuất hiện ở ít nhất một dòng `objects`/`fields`/`config`.

## 3. `ke-hoach-vN.md`

Marker: `<!-- antco-artifact:plan project=<slug> revision=vN status=... design=thiet-ke-vM.md demo=yes|no -->`. Khi duyệt: `<!-- antco-gate:2:APPROVED -->`. Khi bắt đầu chạy: `<!-- antco-run-id:ar_yyyymmdd_xxxxxx -->`.

`<!-- antco-table:work-items -->`

| ID | Việc | REQ | Thiết kế | Skill | Phụ thuộc | Khoá | Trạng thái | Đọc lại |
|---|---|---|---|---|---|---|---|---|

- Thiết kế: ID `OBJ`/`FLD`/`REL`/`CFG` hoặc `-`.
- Skill: một skill `antco-*` của bundle.
- Phụ thuộc: W-ID hoặc `-`.
- Khoá: chuỗi tài nguyên bị ghi, VD `cobj:phieu_khao_sat/fields`, `cobj:phieu_khao_sat/layouts`, `filters`, `-` cho việc chỉ đọc. Hai W cùng khoá phải có quan hệ phụ thuộc (trực tiếp hoặc gián tiếp) - không chạy song song.
- Trạng thái: `DRAFT` | `READY` | `IN_PROGRESS` | `DONE` | `FAILED` | `BLOCKED` | `SKIPPED`.

`<!-- antco-table:tests -->`

| ID | REQ | Cách kiểm | Kỳ vọng | Kết quả |
|---|---|---|---|---|

- Kết quả: `CHUA_CHAY` | `PASS` | `FAIL` | `BLOCKED`.

`<!-- antco-table:checkpoints -->`

| W | Trạng thái | Thời điểm | Kết quả / mã lỗi | Ghi chú |
|---|---|---|---|---|

Kiểm: không chu trình phụ thuộc; phụ thuộc tồn tại; REQ/thiết kế tham chiếu tồn tại (khi truyền file kèm); W `READY` không còn `TBD`; xung đột khoá; `status=APPROVED` hoặc có W `IN_PROGRESS`/`DONE` -> phải có gate 2; W `DONE` phải có checkpoint `DONE`; `demo=no` -> không W nào trỏ tới `CFG` loại `DEMO_DATA`.

## 4. `ban-giao-vN.md`

Marker `handover`. Bảng `results` (REQ | W | T | Kết quả | Ghi chú) và `resources` (W | Loại | ref / id | Hành động | Link). Bàn giao không được báo `PASS` cho T chưa chạy.

## 5. JSON

- Câu trả lời: `templates/answers.schema.json`.
- Manifest: `templates/delivery-manifest.schema.json`. Hash SHA-256 của file **đúng như trên đĩa**; không ghi hash ngược vào Markdown.
