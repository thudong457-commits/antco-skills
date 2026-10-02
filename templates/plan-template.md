# Kế hoạch triển khai - <Tên dự án>

<!-- antco-artifact:plan project=<project-slug> revision=v1 status=DRAFT design=thiet-ke-v1.md demo=yes -->

- Dự án: `<project-slug>` · Revision: `v1` · Trạng thái: `DRAFT` · Thiết kế: `thiet-ke-v1.md`
- Dữ liệu demo: **có** (<số lượng, đối tượng>) · Run id: (sinh khi bắt đầu pha triển khai)
- Cổng hẹp trong kế hoạch: <liệt kê hoặc "không có">

## 1. Việc cần làm

<!-- antco-table:work-items -->
| ID | Việc | REQ | Thiết kế | Skill | Phụ thuộc | Khoá | Trạng thái | Đọc lại |
|---|---|---|---|---|---|---|---|---|
| W-001 | Kiểm token + snapshot | - | - | antco-api-auth | - | - | DRAFT | GET /whoami |

## 2. Kiểm tra

<!-- antco-table:tests -->
| ID | REQ | Cách kiểm | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| T-001 | REQ-001 | <thao tác> | <kết quả mong đợi> | CHUA_CHAY |

## 3. Checkpoint (cập nhật ngay sau mỗi W)

<!-- antco-table:checkpoints -->
| W | Trạng thái | Thời điểm | Kết quả / mã lỗi | Ghi chú |
|---|---|---|---|---|

## 4. Việc người dùng tự làm sau bàn giao

- Cấp quyền `cobj:<slug>:read|write|delete` cho vai trò ở Cài đặt > Phân quyền.
