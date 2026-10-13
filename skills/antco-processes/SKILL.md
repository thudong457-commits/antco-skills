---
name: antco-processes
description: "Thiết kế, tạo, kiểm sơ đồ, xuất bản, kích hoạt và chạy thử end-to-end quy trình Antco qua Public API: quy trình thủ công có form khởi tạo, phê duyệt nhiều cấp (người duyệt theo quản lý / phòng ban / vai trò / quyền), rẽ nhánh theo điều kiện, tự động theo bản ghi / lịch / webhook, bước tạo / cập nhật bản ghi, thông báo, email, AI Agent, xuất văn bản; khởi chạy lượt, xem tiến độ, hoàn thành bước, tạm dừng / huỷ. Dùng khi nghiệp vụ cần luồng duyệt hoặc tự động hoá trên Antco."
license: MIT
metadata:
  author: Antco
  version: "1.2.0"
---

# Antco Processes (quy trình + phê duyệt)

- **Phiên bản:** `1.2.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Sơ đồ + từng loại bước: [references/nodes.md](references/nodes.md). Đối tượng / trường dùng trong bước: [../antco-objects/SKILL.md](../antco-objects/SKILL.md), [../antco-fields/SKILL.md](../antco-fields/SKILL.md).

## Quyền

| Việc | Quyền |
|---|---|
| Xem / kiểm sơ đồ | `workflow:definitions:read` |
| Tạo / sửa / xuất bản / bật-tắt | `workflow:definitions:write` |
| Khởi chạy lượt | `workflow:executions:write` |
| Xem lượt / hoàn thành bước / tạm dừng - huỷ | `workflow:executions:read` (+ là người tham gia / người được giao / quản lý trong phạm vi) |

Kho bí mật quy trình (`{{secret.*}}`) và Kho script bị cấm với token - bước cần khoá HTTP / script: người dùng tự cấu hình ở trình thiết kế.

## Endpoint (tiền tố `/api/public/v1`)

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/processes` | `?category&publishStatus&status&search`, phân trang; không kèm sơ đồ |
| GET | `/processes/{id}` | `flowConfig` (đối tượng) + `validation { errors[], warnings[] }` |
| POST | `/processes?dryRun=1` | luôn NHÁP; không gửi `flowConfig` -> thành phần ban đầu theo loại |
| PUT | `/processes/{id}?dryRun=1` | chỉ khoá gửi lên; `flowConfig` **thay toàn bộ**; không nhận `publishStatus` / `status` |
| POST | `/processes/{id}/validate` | cùng bộ kiểm nút Debug của trình thiết kế |
| POST | `/processes/{id}/publish?dryRun=1` | `{ publish: true }` - sơ đồ còn lỗi -> 400 `details.errors`; `{ publish: false }` về nháp |
| POST | `/processes/{id}/status?dryRun=1` | `{ active: true \| false }` |
| GET | `/processes/{id}/versions` | phiên bản + số lượt từng bản |
| POST | `/processes/{id}/runs` | `{ title }` - chỉ MANUAL / NORMAL đã xuất bản + kích hoạt |
| GET | `/process-lists/{object}` | `process_instances` \| `assigned_steps` \| `completed_steps` \| `approved_steps` \| `pending_approval_steps` -> `{ items, total }` |
| GET | `/process-runs/{id}` | `status`, `progress { visitedNodeIds, currentNodes, failedNodes }`, `tasks[{ id, status, canAct }]`, nhật ký |
| POST | `/process-runs/{id}/state` | `{ action: PAUSE \| RESUME \| CANCEL }` |
| POST | `/process-tasks/{id}/approve` | `{ comment, formData }` - duyệt / hoàn thành bước |
| POST | `/process-tasks/{id}/reject` | `{ reason, formData }` |

Không có qua API: xoá quy trình, nhân bản, mã webhook, kho bí mật, hoàn tác lượt chạy.

## Quy trình làm việc

1. **Chốt luồng trước khi dựng** (trình bày lại, chờ đồng ý): tên, loại (bảng loại ở [references/nodes.md](references/nodes.md) mục 2), danh sách bước từ Bắt đầu tới Kết thúc (phân biệt Kết thúc lượt / Kết thúc nhánh). Luồng duyệt phải chốt: kích hoạt khi nào, người duyệt từng cấp lấy từ đâu (quản lý L1 / phòng ban / vai trò / quyền), người đề nghị trùng người duyệt thì sao, từ chối có gửi lại được không, bản ghi bị sửa / huỷ khi đang chờ duyệt.
2. **Khảo sát:** `GET /processes?search=` (tránh trùng), `GET /objects/{ref}/fields` (khoá trường cho điều kiện / ánh xạ), `GET /org/positions`, `/access/roles` (người duyệt theo vai trò / chức vụ). Có quy trình tương tự -> `GET /processes/{id}` làm mẫu cấu hình bước.
3. **Dựng sơ đồ** theo [references/nodes.md](references/nodes.md) -> `POST /processes?dryRun=1` -> đọc `validation` -> sửa tới khi `errors` rỗng (cảnh báo: đọc và giải thích cho người dùng).
4. **Tạo thật** (`--apply --run-id`) -> `POST /processes/{id}/validate` -> `POST /processes/{id}/publish` `{ publish: true }`.
5. **Chạy thử end-to-end** (MANUAL / NORMAL): `POST /processes/{id}/runs` `{ title: "... [MẪU]" }` -> `GET /process-runs/{runId}` -> bước `canAct` của người chạy API: `POST /process-tasks/{taskId}/approve` với `formData` mẫu -> lặp tới khi lượt `COMPLETED` / `REJECTED`. Bước giao cho người khác (quản lý duyệt): xác nhận `tasks[]` của bước đó có `assigneeName` đúng người (`"Hàng chờ chung"` / `assigneeId: null` = không tìm ra người duyệt, VD người khởi tạo chưa có quản lý trực tiếp -> báo người dùng bổ sung sơ đồ tổ chức hoặc đổi cách chọn người duyệt), báo người dùng tự duyệt thử trên giao diện. TRIGGERED: tạo / sửa bản ghi demo thoả điều kiện rồi `GET /process-lists/process_instances` tìm lượt mới.
6. **Dọn:** lượt thử chưa xong -> `POST /process-runs/{id}/state` `{ action: "CANCEL" }` (hỏi người dùng trước). Quy trình tự động chạy theo dữ liệu thật ngay khi xuất bản + kích hoạt - với TRIGGERED / SCHEDULED, xuất bản xong để **tắt** (`status` `{ active: false }`) tới khi người dùng đồng ý bật.

## Cổng hẹp

- Huỷ lượt chạy, tắt / đổi sơ đồ quy trình đang có lượt chạy thật, xuất bản quy trình TRIGGERED / SCHEDULED trên dữ liệu thật: **hỏi người dùng từng lần**.
- Không tự duyệt bước giao cho người khác; người khởi tạo không duyệt được bước PHÊ DUYỆT của chính mình (máy chủ chặn).
- Đổi sơ đồ bản đã xuất bản -> phiên bản mới; lượt đang dở giữ sơ đồ cũ - báo người dùng.

## Bẫy

- Thiếu `data.nodeType` hoặc cấu hình bọc trong `data.config` -> bước không chạy.
- Cạnh ra của bước duyệt không có nhãn -> đi cả nhánh Duyệt lẫn Từ chối.
- Biến viết `{{...}}` thay vì `${...}` -> ra chữ nguyên văn.
- Cổng `OPEN` 1 cạnh ra / thiếu nhánh mặc định -> lỗi hoặc treo lượt.
- Form khởi tạo có trường bắt buộc -> `approve` thiếu `formData` -> 400.

## Báo kết quả

Bảng: quy trình | id | loại | phiên bản | xuất bản / kích hoạt | kết quả kiểm sơ đồ | lượt thử (id, trạng thái cuối, các bước đã qua). Đường dẫn: `/process/designer/<id>`, lượt chạy `/process/executions/<runId>`.
