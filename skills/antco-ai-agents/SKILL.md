---
name: antco-ai-agents
description: "Tạo, cấu hình và chat thử AI Agent trong Antco qua Public API: model + mức suy luận, chỉ dẫn hệ thống, kỹ năng CORE / EXTENDED, công cụ (bản ghi, quy trình, HTTP, cơ sở tri thức, tìm kiếm web, chuyển giao chat), Data library (tải tài liệu, duyệt, lập chỉ mục RAG), phân quyền từng agent / kỹ năng / công cụ / danh mục; bật / tắt; chat thử trên kênh TEST và duyệt thao tác ghi. Dùng khi cần trợ lý AI nội bộ hoặc AI trả lời khách trên Antco."
license: MIT
metadata:
  author: Antco
  version: "1.1.0"
---

# Antco AI Agents

- **Phiên bản:** `1.1.0` - **Ngày phát hành:** `2026-10-13`
- Xác thực: [../antco-api-auth/SKILL.md](../antco-api-auth/SKILL.md). Đối tượng cho công cụ Bản ghi: [../antco-objects/SKILL.md](../antco-objects/SKILL.md). Quy trình cho công cụ Quy trình: [../antco-processes/SKILL.md](../antco-processes/SKILL.md).

## Mô hình

```
Agent (model, chỉ dẫn, danh tính chạy) --gắn--> Kỹ năng (CORE luôn nạp / EXTENDED model tự chọn) --gắn--> Công cụ (Bản ghi | Quy trình | HTTP | Tri thức | Web | Chuyển giao)
                                                                                                      Tri thức --đọc--> Data library (danh mục -> tài liệu đã lập chỉ mục)
```

## Quyền

`ai:agents:read|write`, `ai:skills:read|write`, `ai:tools:read|write`, `ai:library:read|write` (+ `ai:library:approve` để duyệt tài liệu), `ai:chat:read` (chat). Ngoài mã quyền, từng agent / kỹ năng / công cụ / danh mục có phân quyền riêng (`access[]`: VIEW / EXECUTE / EDIT / DELETE) - người tạo có đủ.

## Endpoint (tiền tố `/api/public/v1/ai`)

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/models` | `id`, `provider`, `efforts`, `available` (hãng đã có khoá) |
| GET | `/tool-catalog` | nhóm công cụ + loại + loại nào ghi dữ liệu |
| GET / POST | `/agents` | tạo luôn ở trạng thái **Tắt** |
| GET / PUT | `/agents/{id}` | PUT **thay toàn bộ** (gửi đủ như khi tạo) |
| POST | `/agents/{id}/status` | `{ active: true \| false }` |
| GET / POST, GET / PUT | `/skills`, `/skills/{id}` | `instructions` <= 2000 ký tự, `toolIds` <= 30 |
| GET / POST, GET / PUT | `/tools`, `/tools/{id}` | không nhận `secret` qua token |
| GET / POST, GET / PUT | `/libraries`, `/libraries/{id}` | cây cha / con |
| POST | `/libraries/{id}/documents` | `{ fileName, contentBase64, name, description, autoApprove }` <= 10 MB: pdf docx xlsx xlsm csv txt md |
| POST | `/documents/{id}/action` | `convert` (chỉ khi lỗi -1) \| `approve` (-2 -> 0) \| `index` (0 -> 2, chạy nền) \| `unindex` |
| POST | `/conversations/messages` | `{ agentId, text, test: true, mode: "ASK" }` -> `{ conversationId }` (trả lời chạy nền) |
| GET | `/conversations/{id}?after=<seq>` | `status`, `messages[]`, `approvals[]` |
| POST | `/conversations/{id}/approvals/{approvalId}` | `{ approved: true \| false }` |

Mọi lệnh ghi cấu hình nhận `?dryRun=1` (tài liệu: chỉ kiểm định dạng / kích thước). Không có qua API: xoá agent / kỹ năng / công cụ / tài liệu, khoá nhà cung cấp AI, bí mật công cụ HTTP, bảng giá.

## Quy trình

1. **Hợp đồng agent** (đưa vào thiết kế, chờ duyệt): ai dùng (nội bộ / khách qua Omni), câu hỏi điển hình, dữ liệu được đọc / ghi, việc KHÔNG được làm, ngôn ngữ.
2. **Khảo sát:** `GET /ai/models` (chọn model `available: true`; chưa hãng nào có khoá -> báo người dùng nhập khoá ở Cài đặt AI, dừng), `GET /ai/agents|skills|tools` (tái dùng kỹ năng / công cụ hệ thống `isSystem` khi phù hợp).
3. **Công cụ** (nhỏ nhất đủ dùng): Bản ghi `RECORD { objectRefs[] }` chỉ các đối tượng cần, chỉ loại cần (`LIST`, `GET`; ghi `CREATE/UPDATE/DELETE` chỉ khi hợp đồng cho phép - mặc định `requiresApproval: true`). Tri thức `KNOWLEDGE_BASE { librarySlugs[], topK, minScore }`. HTTP chỉ URL https công khai; cần khoá -> tạo công cụ không khoá rồi báo người dùng nhập khoá ở giao diện.
4. **Data library** (nếu dùng tri thức): tạo danh mục -> tải tài liệu (base64) -> `approve` (cần `ai:library:approve`, hoặc `autoApprove: true` khi người dùng cho phép) -> `index` -> đọc lại `GET /ai/libraries/{id}` tới khi `status = 2`.
5. **Kỹ năng:** `description` = khi nào dùng (model đọc để chọn), `instructions` = các bước + giới hạn, gắn `toolIds`.
6. **Agent:** `systemPrompt` (vai trò, phạm vi, cấm bịa số liệu, ngôn ngữ), `welcomeMessage`, `errorMessage`, `skills[{ skillId, type }]` (CORE cho việc luôn cần), `runAsUserId`: **null** (chạy theo quyền người chat) - qua token chỉ được null hoặc chính người chạy API.
7. **Chat thử** (agent vẫn Tắt): `POST /ai/conversations/messages` `{ agentId, text, test: true }` -> hỏi lại `GET /ai/conversations/{id}?after=<seq cuối>` mỗi 2-3 giây tới khi `status` khác `RUNNING`. `WAITING_APPROVAL` -> đọc `approvals[]`, chỉ `approved: true` khi người dùng đồng ý và dữ liệu là demo. Thử đủ: 1 câu trong phạm vi, 1 câu ngoài phạm vi (phải từ chối), 1 câu cần công cụ.
8. **Bật** (`/status { active: true }`) chỉ khi người dùng đồng ý sau khi xem kết quả chat thử.

## Bẫy

- Agent không có kỹ năng / công cụ -> chỉ trả lời từ kiến thức model (dễ bịa) - luôn gắn công cụ dữ liệu cần.
- `PUT /agents/{id}` thiếu `skills` = gỡ hết kỹ năng (thay toàn bộ) - dựng từ `GET` mới nhất.
- Mỗi lượt chat tốn token của công ty (`monthlyTokenLimit` để giới hạn) - không chat thử lặp vô ích.
- Công cụ `RECORD` với `objectRefs: ["*"]` chỉ cho Tìm / Xem; ghi phải chọn đối tượng cụ thể.

## Báo kết quả

Bảng: agent / kỹ năng / công cụ / danh mục | id | trạng thái | gắn với | kết quả chat thử (câu hỏi -> tóm tắt trả lời, công cụ đã gọi). Đường dẫn: `/ai_agent/agents`, chat `/ai_agent/chat`.
