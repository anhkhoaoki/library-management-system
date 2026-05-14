# 📚 Hướng Dẫn Test API Trên Swagger UI

> **URL Swagger:** `http://localhost:3000/api-docs`  
> **Server đang chạy:** `npm run dev` trong `backend-express/`

---

## 🗝️ Tài Khoản Test Có Sẵn (từ seed data)

| Role | Email | Password |
|------|-------|----------|
| **ADMIN** | `admin@library.edu.vn` | `Admin@123456` |
| **LIBRARIAN** | `librarian@library.edu.vn` | `Librarian@123` |
| **READER 1** | `reader1@student.edu.vn` | `Reader@123` |
| **READER 2** | `reader2@student.edu.vn` | `Reader@123` |

---

## 🔐 BƯỚC 1: Lấy JWT Token (Bắt buộc trước khi test các API cần auth)

### `POST /api/v1/auth/login`

1. Mở Swagger → tìm tag **Auth** → click vào `POST /api/v1/auth/login`
2. Click **"Try it out"**
3. Dán request body:

```json
{
  "email": "admin@library.edu.vn",
  "password": "Admin@123456"
}
```

4. Click **"Execute"**
5. Copy giá trị `accessToken` trong response
6. **Quan trọng:** Click nút **"Authorize"** 🔒 ở góc trên phải Swagger UI → dán token vào ô **Value**: `Bearer <token_của_bạn>` → click **Authorize**

---

## 🔒 Tag: AUTH

### 1. Đăng ký tài khoản mới
**`POST /api/v1/auth/register`**

```json
{
  "email": "newuser@student.edu.vn",
  "password": "NewPass@123",
  "fullName": "Nguyễn Văn Mới",
  "phone": "0987654321"
}
```
> ⚠️ Sau khi đăng ký, cần xác thực OTP được gửi đến email.

---

### 2. Xác thực OTP kích hoạt tài khoản
**`POST /api/v1/auth/verify-otp`**

```json
{
  "email": "newuser@student.edu.vn",
  "token": "123456",
  "type": "REGISTER"
}
```
> 💡 Thay `123456` bằng mã OTP thực nhận qua email. Nếu test nội bộ, xem log console của server.

---

### 3. Quên mật khẩu
**`POST /api/v1/auth/forgot-password`**

```json
{
  "email": "reader1@student.edu.vn"
}
```

---

### 4. Đặt lại mật khẩu
**`POST /api/v1/auth/reset-password`**

```json
{
  "token": "<token_từ_email>",
  "newPassword": "NewPass@456"
}
```

---

### 5. Đăng nhập ✅ (Test này trước)
**`POST /api/v1/auth/login`**

```json
{
  "email": "admin@library.edu.vn",
  "password": "Admin@123456"
}
```

**Response mẫu:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

---

### 6. Làm mới access token
**`POST /api/v1/auth/refresh-token`**

```json
{
  "refreshToken": "<refresh_token_từ_login>"
}
```

---

### 7. Đăng xuất 🔒 (Cần auth)
**`POST /api/v1/auth/logout`**

> Không cần body. Chỉ cần đã Authorize ở Swagger.

---

## 👤 Tag: USERS (Cần đăng nhập)

> **Authorize với token của bất kỳ role nào trước khi test.**

### 1. Xem hồ sơ cá nhân
**`GET /api/v1/users/me`**

> Không cần body. Click Execute.

**Response mẫu:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "admin@library.edu.vn",
    "fullName": "Quản Trị Viên",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

---

### 2. Cập nhật hồ sơ cá nhân
**`PATCH /api/v1/users/me`**

```json
{
  "fullName": "Quản Trị Viên Updated",
  "phone": "0901234567"
}
```

---

### 3. Xem lịch sử mượn sách
**`GET /api/v1/users/me/borrow-history`**

**Query params (tùy chọn):**
- `page`: `1`
- `limit`: `10`
- `status`: `BORROWING` hoặc `RETURNED` hoặc `OVERDUE`

---

## 📚 Tag: BOOKS

### 1. Tìm kiếm sách (Public - không cần auth)
**`GET /api/v1/books/search`**

**Query params:**
- `q`: `Clean Code`
- `page`: `1`
- `limit`: `10`

---

### 2. Lấy danh sách danh mục (Public)
**`GET /api/v1/books/categories`**

> Không cần body hay params. Click Execute.

**Danh mục có sẵn trong DB:**
- Khoa học Máy tính
- Văn học
- Kinh tế - Quản trị

---

### 3. Xem chi tiết sách (Public)
**`GET /api/v1/books/{id}`**

> Cần ID sách thực. Lấy ID bằng cách search trước (`GET /books/search`).

**Ví dụ:** Dán ID sách vào ô `id` trong path parameter.

---

### 4. Xem đánh giá sách (Public)
**`GET /api/v1/books/{id}/reviews`**

**Query params (tùy chọn):**
- `page`: `1`
- `limit`: `10`

---

### 5. Gửi đánh giá sách 🔒 (Cần auth - READER)
**`POST /api/v1/books/{id}/reviews`**

> Authorize với token của Reader trước.

```json
{
  "rating": 5,
  "comment": "Cuốn sách rất hay và hữu ích!"
}
```

---

### 6. Thêm sách mới 🔒 (Librarian / Admin)
**`POST /api/v1/books`**

> Authorize với Librarian hoặc Admin token.

```json
{
  "isbn": "9780201633610",
  "title": "Design Patterns: Elements of Reusable Object-Oriented Software",
  "authorNames": ["Erich Gamma", "Richard Helm", "Ralph Johnson", "John Vlissides"],
  "publisher": "Addison-Wesley",
  "publishYear": 1994,
  "language": "en",
  "categoryId": "<id_category_khoa_hoc_may_tinh>",
  "description": "Cuốn sách kinh điển về các design patterns trong lập trình OOP.",
  "totalCopies": 3,
  "availableCopies": 3
}
```

> 💡 Lấy `categoryId` từ `GET /api/v1/books/categories`

---

### 7. Cập nhật sách 🔒 (Librarian / Admin)
**`PUT /api/v1/books/{id}`**

```json
{
  "title": "Design Patterns - Updated Edition",
  "totalCopies": 5,
  "availableCopies": 5
}
```

---

### 8. Xóa sách 🔒 (Librarian / Admin)
**`DELETE /api/v1/books/{id}`**

> Chỉ cần điền `id` sách. Không cần body.

---

### 9. Truy cập tài liệu số 🔒 (Cần auth)
**`GET /api/v1/books/{id}/digital/{resourceId}`**

> Cần có sách có tài nguyên số trong DB.

---

### 10. Kết thúc phiên đọc số 🔒 (Cần auth)
**`PATCH /api/v1/books/digital/sessions/{logId}/end`**

> Điền `logId` từ response khi bắt đầu phiên đọc.

---

## 🔄 Tag: CIRCULATION (Cần đăng nhập)

> ⚠️ Hầu hết API này yêu cầu **LIBRARIAN** hoặc **ADMIN** role.

### 1. Tạo phiếu mượn sách 🔒 (Librarian / Admin)
**`POST /api/v1/circulation/borrow`**

> Authorize với Librarian token: `librarian@library.edu.vn / Librarian@123`

```json
{
  "userId": "<id_của_reader1>",
  "bookId": "<id_của_sách>",
  "copyId": "<id_bản_sao_vật_lý>"
}
```

> 💡 **Cách lấy ID:**
> - `userId`: Login bằng reader1, gọi `GET /users/me` → copy `id`
> - `bookId`: Gọi `GET /books/search?q=Clean Code` → copy `id`
> - `copyId`: Từ chi tiết sách, xem danh sách `physicalCopies`

---

### 2. Xử lý trả sách 🔒 (Librarian / Admin)
**`POST /api/v1/circulation/return`**

```json
{
  "borrowRecordId": "<id_phiếu_mượn>"
}
```

> 💡 Lấy `borrowRecordId` từ response của API tạo phiếu mượn, hoặc từ `GET /users/me/borrow-history`.

---

### 3. Thanh toán tiền phạt 🔒 (Librarian / Admin)
**`POST /api/v1/circulation/fines/{id}/pay`**

> Điền `id` khoản phạt vào path param. Không cần body.

---

### 4. Gia hạn mượn sách 🔒 (Reader - tự phục vụ)
**`POST /api/v1/circulation/borrow-records/{id}/renew`**

> Authorize với Reader token. Điền `id` của bản ghi mượn.

---

### 5. Đặt trước sách 🔒 (Reader - tự phục vụ)
**`POST /api/v1/circulation/reservations`**

> Authorize với Reader token.

```json
{
  "bookId": "<id_sách_muốn_đặt_trước>"
}
```

---

## 🔔 Tag: NOTIFICATIONS (Cần đăng nhập)

### 1. Xem cài đặt thông báo
**`GET /api/v1/notifications/settings`**

> Không cần body.

---

### 2. Cập nhật cài đặt thông báo
**`PUT /api/v1/notifications/settings`**

```json
{
  "emailEnabled": true,
  "smsEnabled": false,
  "overdueReminder": true,
  "reservationReady": true
}
```

---

### 3. Xem danh sách thông báo
**`GET /api/v1/notifications`**

**Query params (tùy chọn):**
- `page`: `1`
- `limit`: `20`
- `unreadOnly`: `true`

---

### 4. Đánh dấu 1 thông báo đã đọc
**`PATCH /api/v1/notifications/{id}/read`**

> Điền `id` thông báo vào path param.

---

### 5. Đánh dấu tất cả đã đọc
**`PATCH /api/v1/notifications/read-all`**

> Không cần body.

---

### 6. Gửi thông báo hàng loạt 🔒 (Librarian / Admin)
**`POST /api/v1/notifications/broadcast`**

```json
{
  "title": "Thông báo từ thư viện",
  "message": "Thư viện sẽ đóng cửa ngày 30/4 nhân dịp lễ Giải phóng miền Nam.",
  "targetRole": "READER"
}
```

---

## ⚙️ Tag: ADMIN (Cần quyền ADMIN hoặc LIBRARIAN)

### 1. Dashboard tổng quan 🔒 (Admin / Librarian)
**`GET /api/v1/admin/dashboard`**

> Không cần body.

**Response mẫu:**
```json
{
  "success": true,
  "data": {
    "totalBooks": 3,
    "totalUsers": 4,
    "activeBorrows": 0,
    "overdueCount": 0,
    "totalFines": 0
  }
}
```

---

### 2. Xuất báo cáo 🔒 (Admin / Librarian)
**`GET /api/v1/admin/reports/export`**

**Query params:**
- `type`: `borrow` (hoặc `overdue`, `fine`, `inventory`)
- `from`: `2025-01-01`
- `to`: `2025-12-31`
- `format`: `json` (hoặc `excel`)

---

### 3. Danh sách người dùng 🔒 (Admin only)
**`GET /api/v1/admin/users`**

> Authorize với Admin token.

**Query params (tùy chọn):**
- `page`: `1`
- `limit`: `20`
- `role`: `READER`
- `status`: `ACTIVE`
- `search`: `Nguyễn`

---

### 4. Cập nhật trạng thái tài khoản 🔒 (Admin only)
**`PATCH /api/v1/admin/users/{id}/status`**

> Điền `id` người dùng vào path param.

```json
{
  "status": "SUSPENDED"
}
```

> Các giá trị: `ACTIVE`, `INACTIVE`, `SUSPENDED`

---

### 5. Cập nhật vai trò người dùng 🔒 (Admin only)
**`PATCH /api/v1/admin/users/{id}/role`**

```json
{
  "role": "LIBRARIAN"
}
```

> Các giá trị: `READER`, `LIBRARIAN`, `ADMIN`

---

### 6. Lấy cấu hình hệ thống 🔒 (Admin only)
**`GET /api/v1/admin/system-config`**

> Không cần body.

---

### 7. Cập nhật cấu hình hệ thống 🔒 (Admin only)
**`PUT /api/v1/admin/system-config`**

```json
{
  "maxBorrowDays": 14,
  "maxRenewCount": 2,
  "finePerDay": 2000
}
```

---

### 8. Danh sách chi nhánh 🔒 (Admin / Librarian)
**`GET /api/v1/admin/branches`**

> Không cần body.

**Chi nhánh có sẵn:**
- `branch-cs-01`: Thư viện Cơ sở 1 - Lý Thường Kiệt
- `branch-cs-02`: Thư viện Cơ sở 2 - Dĩ An

---

### 9. Thêm chi nhánh mới 🔒 (Admin only)
**`POST /api/v1/admin/branches`**

```json
{
  "name": "Thư viện Cơ sở 3 - Bình Dương",
  "address": "Đường ĐT743, Bình Dương",
  "phone": "0274-3456-789",
  "isActive": true
}
```

---

### 10. Cập nhật chi nhánh 🔒 (Admin only)
**`PUT /api/v1/admin/branches/{id}`**

> Điền `id` chi nhánh (ví dụ: `branch-cs-01`).

```json
{
  "name": "Thư viện Cơ sở 1 - Updated",
  "phone": "028-9999-9999"
}
```

---

### 11. Xóa chi nhánh 🔒 (Admin only)
**`DELETE /api/v1/admin/branches/{id}`**

> Điền `id` chi nhánh vào path param.

---

### 12. Nhật ký kiểm toán 🔒 (Admin only)
**`GET /api/v1/admin/audit-logs`**

**Query params (tùy chọn):**
- `page`: `1`
- `limit`: `50`
- `from`: `2025-01-01`
- `to`: `2025-12-31`

---

## 🤖 Tag: AI

### 1. Tìm kiếm ngôn ngữ tự nhiên (Public)
**`POST /api/v1/ai/search`**

> Không cần auth.

```json
{
  "query": "sách về lập trình python cho người mới bắt đầu"
}
```

---

### 2. Chat với AI 🔒 (Cần đăng nhập)
**`POST /api/v1/ai/chat`**

```json
{
  "message": "Tôi muốn tìm sách về trí tuệ nhân tạo cho người mới",
  "sessionId": "session-test-001"
}
```

---

### 3. Gợi ý sách cá nhân hóa 🔒 (Cần đăng nhập)
**`GET /api/v1/ai/recommendations`**

**Query params:**
- `limit`: `10`

---

### 4. Tra cứu sách theo ISBN 🔒 (Librarian / Admin)
**`GET /api/v1/ai/catalog/isbn/{isbn}`**

**Ví dụ ISBN để test:**
- `9780132350884` (Clean Code)
- `978-0-13-468599-1` (The Pragmatic Programmer)

---

### 5. Tóm tắt nội dung sách bằng AI 🔒 (Librarian / Admin)
**`POST /api/v1/ai/catalog/summarize`**

```json
{
  "bookId": "<id_sách>",
  "content": "Cuốn sách Clean Code của Robert C. Martin hướng dẫn cách viết code sạch..."
}
```

---

## 📋 Quy Trình Test Đề Xuất (End-to-End)

### Luồng 1: Bạn đọc mượn và trả sách

```
1. [Auth] Login với reader1 → lấy token reader
2. [Auth] Login với librarian → lấy token librarian  
3. [Books] GET /books/search?q=Clean Code → lấy bookId
4. [Users] GET /users/me (reader token) → lấy readerId
5. [Circulation] POST /borrow (librarian token) với userId=readerId, bookId
6. [Users] GET /users/me/borrow-history (reader token) → xem phiếu mượn
7. [Circulation] POST /borrow-records/{id}/renew (reader token) → gia hạn
8. [Circulation] POST /return (librarian token) → trả sách
```

### Luồng 2: Admin quản lý hệ thống

```
1. [Auth] Login với admin → lấy admin token
2. [Admin] GET /admin/dashboard → xem tổng quan
3. [Admin] GET /admin/users → xem danh sách users
4. [Admin] PATCH /admin/users/{id}/status với status=SUSPENDED → khóa tài khoản
5. [Admin] GET /admin/reports/export?type=borrow → xuất báo cáo
6. [Admin] GET /admin/audit-logs → xem log hệ thống
```

### Luồng 3: Thủ thư thêm sách mới

```
1. [Auth] Login với librarian → lấy token
2. [Books] GET /books/categories → lấy categoryId
3. [Books] POST /books → thêm sách mới
4. [AI] GET /ai/catalog/isbn/{isbn} → tra cứu thông tin từ AI
5. [AI] POST /ai/catalog/summarize → tạo tóm tắt nội dung sách
```

---

## ⚡ Tips Sử Dụng Swagger UI

| Mẹo | Cách làm |
|-----|----------|
| Authorize một lần, dùng cho tất cả | Click 🔒 **Authorize** → paste `Bearer <token>` |
| Token hết hạn? | Dùng `POST /auth/refresh-token` để lấy token mới |
| Xem schema đầy đủ | Click **"Schema"** trong phần response |
| Filter API theo tag | Dùng ô tìm kiếm ở đầu trang Swagger |
| Copy response | Click icon copy trong response body |
| `tryItOutEnabled: true` | Đã bật sẵn, click "Try it out" để test trực tiếp |
