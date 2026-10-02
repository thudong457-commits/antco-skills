# Thiết kế - Khảo sát hiện trường và phương án kỹ thuật PCS (ví dụ)

<!-- antco-artifact:design project=pcs-khao-sat revision=v1 status=APPROVED requirements=yeu-cau-giai-phap-v2.md -->

- Dự án: `pcs-khao-sat` · Revision: `v1` · Trạng thái: `APPROVED` (cùng kế hoạch, cổng 2) · Dựa trên: `yeu-cau-giai-phap-v2.md`
- Dữ liệu trong file là ví dụ tổng hợp. Mã trường thật (tiền tố `cf_`) đọc lại sau khi tạo; bảng dưới dùng slug thiết kế.

## 1. Sơ đồ quan hệ

```
crm:account 1 ----- n cobj:phieu_khao_sat n ----- 1 hrm:staff (kỹ thuật viên)
                         1 |            1 |
                         n |            n |
   cobj:khu_vuc_khao_sat (Con)    cobj:phuong_an_ky_thuat (tra cứu thường)
```

## 2. Đối tượng

<!-- antco-table:objects -->
| ID | Đối tượng | ref | Loại | Hành động | Phân hệ | Tên bản ghi | REQ |
|---|---|---|---|---|---|---|---|
| OBJ-001 | Tài khoản (khách hàng) | crm:account | STANDARD | REUSE | crm | Tên tài khoản | REQ-001 |
| OBJ-002 | Nhân sự (kỹ thuật viên) | hrm:staff | STANDARD | REUSE | hrm | Họ tên | REQ-001 |
| OBJ-003 | Phiếu khảo sát | cobj:phieu_khao_sat | CUSTOM | CREATE | fsm | Đánh số KS-{yyyy}-{0000} | REQ-001 |
| OBJ-004 | Khu vực khảo sát | cobj:khu_vuc_khao_sat | CHILD | CREATE | fsm | Đánh số KV-{000000} | REQ-002 |
| OBJ-005 | Phương án kỹ thuật | cobj:phuong_an_ky_thuat | CUSTOM | CREATE | fsm | Đánh số PA-{yyyy}-{0000} | REQ-003, REQ-004 |

## 3. Trường

<!-- antco-table:fields -->
| ID | OBJ | Nhãn | Slug | Kiểu | Hành động | Bắt buộc | Cài đặt | REQ |
|---|---|---|---|---|---|---|---|---|
| FLD-001 | OBJ-003 | Khách hàng | khach_hang | lookup | CREATE | CO | đích crm:account, một giá trị | REQ-001 |
| FLD-002 | OBJ-003 | Địa chỉ khảo sát | dia_chi | text | CREATE | CO | maxLength 255 | REQ-001 |
| FLD-003 | OBJ-003 | Ngày khảo sát | ngay_khao_sat | date | CREATE | CO | - | REQ-001 |
| FLD-004 | OBJ-003 | Kỹ thuật viên | ky_thuat_vien | lookup | CREATE | CO | đích hrm:staff | REQ-001, REQ-006 |
| FLD-005 | OBJ-003 | Loại cơ sở | loai_co_so | select | CREATE | KHONG | Nhà hàng / Nhà máy / Văn phòng / Kho / Khác | REQ-001 |
| FLD-006 | OBJ-003 | Trạng thái | trang_thai | select | CREATE | CO | Mới (mặc định) / Đã khảo sát / Huỷ, có màu | REQ-001, REQ-005 |
| FLD-007 | OBJ-003 | Số khu vực | so_khu_vuc | rollup | CREATE | KHONG | COUNT từ OBJ-004 | REQ-002 |
| FLD-008 | OBJ-004 | Phiếu khảo sát | phieu_khao_sat | dependent_lookup | CREATE | CO | máy chủ tự tạo khi tạo OBJ-004 (cha OBJ-003) | REQ-002 |
| FLD-009 | OBJ-004 | Khu vực | khu_vuc | text | CREATE | CO | VD Bếp, Kho lạnh | REQ-002 |
| FLD-010 | OBJ-004 | Loại côn trùng | loai_con_trung | multiselect | CREATE | CO | Gián / Chuột / Muỗi / Ruồi / Mối / Kiến / Khác | REQ-002 |
| FLD-011 | OBJ-004 | Mức độ nhiễm | muc_do | select | CREATE | CO | Thấp / Trung bình / Cao, có màu | REQ-002 |
| FLD-012 | OBJ-004 | Diện tích (m2) | dien_tich | number | CREATE | KHONG | decimals 1, min 0 | REQ-002 |
| FLD-013 | OBJ-005 | Phiếu khảo sát | phieu_khao_sat | lookup | CREATE | CO | đích cobj:phieu_khao_sat | REQ-003 |
| FLD-014 | OBJ-005 | Phương pháp xử lý | phuong_phap | textarea | CREATE | CO | maxLength 4000 | REQ-003 |
| FLD-015 | OBJ-005 | Tần suất | tan_suat | select | CREATE | CO | Một lần / Hàng tuần / Hàng tháng / Hàng quý | REQ-003 |
| FLD-016 | OBJ-005 | Giá trị dự kiến | gia_tri | money | CREATE | CO | min 0 | REQ-003, REQ-005 |
| FLD-017 | OBJ-005 | Trạng thái | trang_thai | select | CREATE | CO | Nháp (mặc định) / Chờ duyệt / Đã duyệt / Từ chối / Khách chọn | REQ-004 |
| FLD-018 | OBJ-005 | Lý do từ chối | ly_do_tu_choi | textarea | CREATE | KHONG | bắt buộc khi chuyển sang Từ chối (quy tắc CFG-004) | REQ-004 |

## 4. Quan hệ

<!-- antco-table:relations -->
| ID | Từ OBJ | Đến OBJ | Loại | Trường FLD | Ghi chú |
|---|---|---|---|---|---|
| REL-001 | OBJ-003 | OBJ-001 | LOOKUP | FLD-001 | Xoá khách không xoá phiếu |
| REL-002 | OBJ-003 | OBJ-002 | LOOKUP | FLD-004 | Chỉ tham chiếu nhân sự có sẵn |
| REL-003 | OBJ-004 | OBJ-003 | CHILD_OF | FLD-008 | Khu vực không có ý nghĩa nếu xoá phiếu |
| REL-004 | OBJ-005 | OBJ-003 | LOOKUP | FLD-013 | Phương án giữ lại để đối chiếu dù phiếu bị huỷ |

## 5. Cấu hình

<!-- antco-table:config -->
| ID | Loại | OBJ | Mô tả | REQ | Skill |
|---|---|---|---|---|---|
| CFG-001 | LAYOUT | OBJ-003 | Màn Tạo: Group 2 cột (khách, địa chỉ, ngày, KTV, loại cơ sở) | REQ-001 | antco-layouts |
| CFG-002 | LAYOUT | OBJ-003 | Màn Xem/Sửa: Row [2,1], cột chính trường + Tab-Section (Khu vực, Phương án), cột phụ trạng thái + số khu vực | REQ-001, REQ-002, REQ-003 | antco-layouts |
| CFG-003 | PATH | OBJ-003 | Lộ trình Mới -> Đã khảo sát, chỉ dẫn từng bước | REQ-001 | antco-rules |
| CFG-004 | STATUS_RULE | OBJ-005 | Nháp -> Chờ duyệt -> Đã duyệt / Từ chối; Từ chối -> Nháp; Đã duyệt -> Khách chọn; sang Từ chối bắt buộc Lý do | REQ-004 | antco-rules |
| CFG-005 | ACTION | OBJ-005 | Nút Gửi duyệt, Duyệt, Từ chối (popup nhập Lý do) | REQ-004 | antco-actions |
| CFG-006 | RELATED_LIST | OBJ-003 | Hiện Khu vực khảo sát (thêm dòng tại chỗ) + Phương án kỹ thuật | REQ-002, REQ-003 | antco-related-lists |
| CFG-007 | FILTER | OBJ-003 | Phiếu của tôi đang mở: KTV = $currentUser và Trạng thái = Mới; chia sẻ vị trí Kỹ thuật viên (Xem) | REQ-006 | antco-filters |
| CFG-008 | REPORT_TYPE | OBJ-003 | Tập dữ liệu Phiếu khảo sát + Tài khoản | REQ-005 | antco-reports |
| CFG-009 | REPORT | OBJ-003 | Số phiếu theo tháng x trạng thái | REQ-005 | antco-reports |
| CFG-010 | REPORT_TYPE | OBJ-005 | Tập dữ liệu Phương án + Phiếu khảo sát | REQ-005 | antco-reports |
| CFG-011 | REPORT | OBJ-005 | Tổng giá trị phương án theo tháng x trạng thái | REQ-005 | antco-reports |
| CFG-012 | DASHBOARD | - | Điều hành khảo sát: KPI phiếu tháng này, đường phiếu theo tháng, cột giá trị phương án | REQ-005 | antco-reports |
| CFG-013 | DEMO_DATA | OBJ-003 | 8 phiếu, 20 khu vực, 10 phương án (chỉ đối tượng tự tạo); khách hàng = 3 tài khoản có sẵn người dùng chỉ định, KTV = nhân sự có sẵn (chỉ tham chiếu id) | REQ-005 | antco-records |

## 6. Vòng đời trạng thái phương án

| Từ | Đến | Trường bắt buộc khi chuyển | Ai |
|---|---|---|---|
| Nháp | Chờ duyệt | Giá trị dự kiến | Người lập |
| Chờ duyệt | Đã duyệt | - | Trưởng nhóm kỹ thuật |
| Chờ duyệt | Từ chối | Lý do từ chối | Trưởng nhóm kỹ thuật |
| Từ chối | Nháp | - | Người lập |
| Đã duyệt | Khách chọn | - | Người lập |

## 7. Kết quả dry-run phía máy chủ

| Payload | Kết quả | Ghi chú |
|---|---|---|
| POST /objects (OBJ-003, OBJ-004, OBJ-005) | hợp lệ | slug chưa dùng |
| POST /objects/{ref}/fields (FLD-007 rollup) | hợp lệ sau khi OBJ-004 tồn tại | dry-run lại trong pha triển khai |
| POST /objects/{ref}/layouts (CFG-001) | hợp lệ, 0 cảnh báo | - |

## 8. Rủi ro và giả định

- Quyền `cobj:phieu_khao_sat:*`, `cobj:khu_vuc_khao_sat:*`, `cobj:phuong_an_ky_thuat:*` chỉ Quản trị có ngay; người dùng tự cấp cho vai trò Kỹ thuật viên / Trưởng nhóm sau bàn giao.
- Không bật quy tắc bảo mật dữ liệu ở bản này (KTV thấy mọi phiếu theo quyền đối tượng).
