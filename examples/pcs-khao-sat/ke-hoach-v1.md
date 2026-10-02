# Kế hoạch triển khai - Khảo sát hiện trường và phương án kỹ thuật PCS (ví dụ)

<!-- antco-artifact:plan project=pcs-khao-sat revision=v1 status=APPROVED design=thiet-ke-v1.md demo=yes -->
<!-- antco-gate:2:APPROVED at=2026-10-02T11:20:00+07:00 by=chat:"duyệt thiet-ke-v1 và ke-hoach-v1" -->
<!-- antco-run-id:ar_20261002_k3x9qa -->

- Dự án: `pcs-khao-sat` · Revision: `v1` · Trạng thái: `APPROVED` · Thiết kế: `thiet-ke-v1.md`
- Dữ liệu demo: **có** (8 phiếu, 20 khu vực, 10 phương án; tham chiếu 3 khách hàng có sẵn người dùng chỉ định) · Run id: `ar_20261002_k3x9qa`
- Cổng hẹp trong kế hoạch: không có (không bật quy tắc bảo mật, không có biểu mẫu công khai, không đổi giao diện đối tượng có sẵn).

## 1. Việc cần làm

<!-- antco-table:work-items -->
| ID | Việc | REQ | Thiết kế | Skill | Phụ thuộc | Khoá | Trạng thái | Đọc lại |
|---|---|---|---|---|---|---|---|---|
| W-001 | Kiểm token, kiểm trôi cấu hình | - | - | antco-api-auth | - | - | DONE | GET /whoami, GET /objects?kind=custom |
| W-002 | Tạo đối tượng Phiếu khảo sát | REQ-001 | OBJ-003 | antco-objects | W-001 | cobj:phieu_khao_sat | DONE | GET /objects/cobj:phieu_khao_sat |
| W-003 | Tạo đối tượng Phương án kỹ thuật | REQ-003 | OBJ-005 | antco-objects | W-001 | cobj:phuong_an_ky_thuat | DONE | GET /objects/cobj:phuong_an_ky_thuat |
| W-004 | Trường của Phiếu khảo sát | REQ-001 | FLD-001, FLD-002, FLD-003, FLD-004, FLD-005, FLD-006 | antco-fields | W-002 | cobj:phieu_khao_sat/fields | DONE | GET /objects/cobj:phieu_khao_sat/fields |
| W-005 | Tạo đối tượng Con Khu vực khảo sát | REQ-002 | OBJ-004, FLD-008 | antco-objects | W-002 | cobj:khu_vuc_khao_sat | DONE | GET /objects/cobj:khu_vuc_khao_sat |
| W-006 | Trường của Khu vực khảo sát | REQ-002 | FLD-009, FLD-010, FLD-011, FLD-012 | antco-fields | W-005 | cobj:khu_vuc_khao_sat/fields | DONE | GET /objects/cobj:khu_vuc_khao_sat/fields |
| W-007 | Trường Tổng hợp Số khu vực | REQ-002 | FLD-007 | antco-fields | W-004, W-006 | cobj:phieu_khao_sat/fields | DONE | GET fields + giá trị trên phiếu demo |
| W-008 | Trường của Phương án kỹ thuật | REQ-003, REQ-004 | FLD-013, FLD-014, FLD-015, FLD-016, FLD-017, FLD-018 | antco-fields | W-002, W-003 | cobj:phuong_an_ky_thuat/fields | DONE | GET /objects/cobj:phuong_an_ky_thuat/fields |
| W-009 | Quy tắc chuyển trạng thái Phương án | REQ-004 | CFG-004 | antco-rules | W-008 | cobj:phuong_an_ky_thuat/status-rules | DONE | GET status-rules |
| W-010 | Hành động Gửi duyệt / Duyệt / Từ chối | REQ-004 | CFG-005 | antco-actions | W-009 | cobj:phuong_an_ky_thuat/actions | DONE | GET actions |
| W-011 | Lộ trình Phiếu khảo sát | REQ-001 | CFG-003 | antco-rules | W-004 | cobj:phieu_khao_sat/path | DONE | GET /objects/cobj:phieu_khao_sat |
| W-012 | Danh sách liên quan của Phiếu | REQ-002, REQ-003 | CFG-006 | antco-related-lists | W-006, W-008 | cobj:phieu_khao_sat/related-lists | DONE | GET related-lists |
| W-013 | Giao diện Tạo Phiếu | REQ-001 | CFG-001 | antco-layouts | W-007 | cobj:phieu_khao_sat/layouts | DONE | GET layouts/{id} |
| W-014 | Giao diện Xem/Sửa Phiếu | REQ-001, REQ-002, REQ-003 | CFG-002 | antco-layouts | W-013, W-011, W-012 | cobj:phieu_khao_sat/layouts | DONE | GET layouts/{id} |
| W-015 | Bộ lọc Phiếu của tôi đang mở | REQ-006 | CFG-007 | antco-filters | W-004 | filters | DONE | GET /filters/{id} |
| W-016 | Loại báo cáo + báo cáo Phiếu | REQ-005 | CFG-008, CFG-009 | antco-reports | W-007 | reports | DONE | GET /reports/{id} |
| W-017 | Loại báo cáo + báo cáo Phương án | REQ-005 | CFG-010, CFG-011 | antco-reports | W-008, W-016 | reports | DONE | GET /reports/{id} |
| W-018 | Bảng điều khiển Điều hành khảo sát | REQ-005 | CFG-012 | antco-reports | W-017 | dashboards | DONE | POST /dashboards/{id}/data |
| W-019 | Dữ liệu demo gắn run id | REQ-005 | CFG-013 | antco-records | W-010, W-014, W-015, W-018 | demo | DONE | GET /runs/ar_20261002_k3x9qa/items |
| W-020 | Kiểm tra theo tests + bàn giao | - | - | build-antco-app | W-019 | - | DONE | ban-giao-v1.md |

## 2. Kiểm tra

<!-- antco-table:tests -->
| ID | REQ | Cách kiểm | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| T-001 | REQ-001 | Tạo phiếu demo, đọc lại tên bản ghi | Mã dạng KS-2026-0001, liên tiếp | PASS |
| T-002 | REQ-002 | Phiếu KS-2026-0001 có 3 khu vực demo | Số khu vực = 3 | PASS |
| T-003 | REQ-003 | Phiếu KS-2026-0002 có 2 phương án | Danh sách liên quan hiện 2 dòng | PASS |
| T-004 | REQ-004 | PATCH phương án Nháp -> Đã duyệt | Bị chặn: đường chuyển không hợp lệ | PASS |
| T-005 | REQ-004 | Chuyển Chờ duyệt -> Từ chối không nhập lý do | Bị chặn: thiếu Lý do từ chối | PASS |
| T-006 | REQ-006 | Đếm bộ lọc Phiếu của tôi theo KTV demo | Khớp đếm tay | PASS |
| T-007 | REQ-005 | Chạy báo cáo giá trị phương án, so tổng | Khớp tổng tính tay từ dữ liệu demo | PASS |

## 3. Checkpoint

<!-- antco-table:checkpoints -->
| W | Trạng thái | Thời điểm | Kết quả / mã lỗi | Ghi chú |
|---|---|---|---|---|
| W-001 | DONE | 2026-10-02T11:25:00+07:00 | VERIFIED, không trôi | - |
| W-002 | DONE | 2026-10-02T11:27:00+07:00 | cobj:phieu_khao_sat | đọc lại khớp |
| W-003 | DONE | 2026-10-02T11:28:00+07:00 | cobj:phuong_an_ky_thuat | đọc lại khớp |
| W-004 | DONE | 2026-10-02T11:33:00+07:00 | 6 trường | mã thật tiền tố cf_ |
| W-005 | DONE | 2026-10-02T11:35:00+07:00 | cobj:khu_vuc_khao_sat | trường tra cứu phụ thuộc do máy chủ tạo |
| W-006 | DONE | 2026-10-02T11:38:00+07:00 | 4 trường | - |
| W-007 | DONE | 2026-10-02T11:40:00+07:00 | rollup COUNT | - |
| W-008 | DONE | 2026-10-02T11:46:00+07:00 | 6 trường | - |
| W-009 | DONE | 2026-10-02T11:49:00+07:00 | 1 quy tắc, 5 đường chuyển | - |
| W-010 | DONE | 2026-10-02T11:53:00+07:00 | 3 hành động | - |
| W-011 | DONE | 2026-10-02T11:55:00+07:00 | lộ trình 2 bước | - |
| W-012 | DONE | 2026-10-02T11:57:00+07:00 | 2 danh sách hiện | - |
| W-013 | DONE | 2026-10-02T12:02:00+07:00 | giao diện Tạo | 0 cảnh báo |
| W-014 | DONE | 2026-10-02T12:10:00+07:00 | giao diện Xem/Sửa | 0 cảnh báo |
| W-015 | DONE | 2026-10-02T12:12:00+07:00 | bộ lọc | - |
| W-016 | DONE | 2026-10-02T12:18:00+07:00 | 1 loại + 1 báo cáo | - |
| W-017 | DONE | 2026-10-02T12:24:00+07:00 | 1 loại + 1 báo cáo | - |
| W-018 | DONE | 2026-10-02T12:30:00+07:00 | 3 thẻ có dữ liệu | - |
| W-019 | DONE | 2026-10-02T12:41:00+07:00 | 38 bản ghi demo | nhãn ar_20261002_k3x9qa |
| W-020 | DONE | 2026-10-02T12:55:00+07:00 | 7/7 PASS | - |

## 4. Việc người dùng tự làm sau bàn giao

- Cấp quyền 3 đối tượng tự tạo cho vai trò Kỹ thuật viên và Trưởng nhóm kỹ thuật (Cài đặt > Phân quyền).
