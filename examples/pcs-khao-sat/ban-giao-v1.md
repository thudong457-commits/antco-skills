# Bàn giao - Khảo sát hiện trường và phương án kỹ thuật PCS (ví dụ)

<!-- antco-artifact:handover project=pcs-khao-sat revision=v1 status=APPROVED -->

- Workspace: `pcs.example.com` · Run id: `ar_20261002_k3x9qa` · Kế hoạch: `ke-hoach-v1.md` · Manifest: `delivery-manifest-v1.json`
- Ví dụ tổng hợp: id tài nguyên dưới đây là giả lập.

## 1. Kết quả theo yêu cầu

<!-- antco-table:results -->
| REQ | W | T | Kết quả | Ghi chú |
|---|---|---|---|---|
| REQ-001 | W-002, W-004, W-011, W-013, W-014 | T-001 | PASS | Mã KS-2026-0001 trở đi |
| REQ-002 | W-005, W-006, W-007, W-012 | T-002 | PASS | Số khu vực tự đếm |
| REQ-003 | W-003, W-008, W-012 | T-003 | PASS | Nhiều phương án mỗi phiếu |
| REQ-004 | W-009, W-010 | T-004, T-005 | PASS | Duyệt bởi Trưởng nhóm kỹ thuật |
| REQ-005 | W-016, W-017, W-018 | T-007 | PASS | Dashboard 3 thẻ |
| REQ-006 | W-015 | T-006 | PASS | Chia sẻ vị trí Kỹ thuật viên |
| REQ-007 | - | - | NGOAI_PHAM_VI | Gửi email tự động: cấu hình sau trong Antco |

## 2. Tài nguyên đã tạo

<!-- antco-table:resources -->
| W | Loại | ref / id | Hành động | Link |
|---|---|---|---|---|
| W-002 | object | cobj:phieu_khao_sat | created | /settings/objects/cobj:phieu_khao_sat |
| W-003 | object | cobj:phuong_an_ky_thuat | created | /settings/objects/cobj:phuong_an_ky_thuat |
| W-005 | object | cobj:khu_vuc_khao_sat | created | /settings/objects/cobj:khu_vuc_khao_sat |
| W-013 | layout | SAMPLE-LAYOUT-0001 | created | /settings/object-layout/cobj:phieu_khao_sat/SAMPLE-LAYOUT-0001 |
| W-014 | layout | SAMPLE-LAYOUT-0002 | created | /settings/object-layout/cobj:phieu_khao_sat/SAMPLE-LAYOUT-0002 |
| W-015 | filter | SAMPLE-FILTER-0001 | created | /settings/filter |
| W-016 | report | phieu_theo_thang_trang_thai | created | /settings/reports/phieu_theo_thang_trang_thai |
| W-017 | report | gia_tri_phuong_an_theo_thang | created | /settings/reports/gia_tri_phuong_an_theo_thang |
| W-018 | dashboard | dieu_hanh_khao_sat | created | /settings/dashboards/dieu_hanh_khao_sat |

## 3. Dữ liệu demo

- 38 bản ghi (8 phiếu, 20 khu vực, 10 phương án; gắn 3 khách hàng có sẵn người dùng chỉ định - không tạo / sửa khách hàng), nhãn `ar_20261002_k3x9qa`. Trạng thái: **giữ** để người dùng chạy thử; dọn khi người dùng yêu cầu.

## 4. Việc người dùng cần tự làm

- [ ] Cấp quyền `cobj:phieu_khao_sat`, `cobj:khu_vuc_khao_sat`, `cobj:phuong_an_ky_thuat` (đọc / ghi / xoá) cho vai trò Kỹ thuật viên, Trưởng nhóm kỹ thuật (Cài đặt > Phân quyền).
- [ ] Chia sẻ báo cáo + dashboard cho Quản lý kỹ thuật nếu cần thêm người xem.
- [ ] Thu hồi API token khi không dùng tiếp (Cài đặt > Tích hợp > API Token).

## 5. Rủi ro còn lại

- Chưa có quy tắc bảo mật dữ liệu: mọi người có quyền đối tượng thấy mọi phiếu.
- REQ-007 ngoài phạm vi.
