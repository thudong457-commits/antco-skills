# Thiết kế - <Tên dự án>

<!-- antco-artifact:design project=<project-slug> revision=v1 status=DRAFT requirements=yeu-cau-giai-phap-v2.md -->

- Dự án: `<project-slug>` · Revision: `v1` · Trạng thái: `DRAFT` · Dựa trên: `yeu-cau-giai-phap-v2.md` (đã duyệt cổng 1)

## 1. Sơ đồ quan hệ (tóm tắt)

```
crm:account 1 --- n cobj:<cha> 1 --- n cobj:<con>
```

## 2. Đối tượng

<!-- antco-table:objects -->
| ID | Đối tượng | ref | Loại | Hành động | Phân hệ | Tên bản ghi | REQ |
|---|---|---|---|---|---|---|---|
| OBJ-001 | Tài khoản | crm:account | STANDARD | REUSE | crm | Tên | REQ-001 |

## 3. Trường

<!-- antco-table:fields -->
| ID | OBJ | Nhãn | Slug | Kiểu | Hành động | Bắt buộc | Cài đặt | REQ |
|---|---|---|---|---|---|---|---|---|
| FLD-001 | OBJ-002 | Trạng thái | trang_thai | select | CREATE | CO | Mới / Đang làm / Xong (mặc định Mới) | REQ-002 |

## 4. Quan hệ

<!-- antco-table:relations -->
| ID | Từ OBJ | Đến OBJ | Loại | Trường FLD | Ghi chú |
|---|---|---|---|---|---|
| REL-001 | OBJ-002 | OBJ-001 | LOOKUP | FLD-002 | <lý do> |

## 5. Cấu hình (giao diện, quy tắc, bộ lọc, báo cáo, demo...)

<!-- antco-table:config -->
| ID | Loại | OBJ | Mô tả | REQ | Skill |
|---|---|---|---|---|---|
| CFG-001 | LAYOUT | OBJ-002 | <màn Tạo: ...> | REQ-002 | antco-layouts |

## 6. Vòng đời trạng thái

| Từ | Đến | Trường bắt buộc khi chuyển | Ai |
|---|---|---|---|

## 7. Kết quả dry-run phía máy chủ

| Payload | Kết quả | Ghi chú |
|---|---|---|

## 8. Rủi ro và giả định

- <...>
