# TÀI LIỆU HƯỚNG DẪN: KIẾN TRÚC VÀ ĐÁNH GIÁ CHẤT LƯỢNG AI CHATBOT

Tài liệu này giải thích chi tiết về kiến trúc thiết kế, luồng dữ liệu, cơ chế truyền phát dữ liệu (Streaming) và phương pháp đánh giá tự động (Evaluation) của trợ lý ảo **"Thư Bé"** thuộc Hệ thống Quản lý Thư viện Đại học BkLib.

---

## 1. KIẾN TRÚC TỔNG QUAN (HYBRID SYSTEM ARCHITECTURE)

Chatbot "Thư Bé" được xây dựng theo kiến trúc **Hybrid (Lai)**, kết hợp giữa hai kỹ thuật tiên tiến nhất hiện nay trong ứng dụng Mô hình Ngôn ngữ Lớn (LLM):

1.  **RAG (Retrieval-Augmented Generation - Tạo truy xuất tăng cường)**: Sử dụng đối với câu hỏi tĩnh về quy chế, nội quy thư viện (ví dụ: *phí phạt, giờ mở cửa, số sách được mượn...*).
2.  **Function Calling (Gọi hàm hệ thống)**: Sử dụng đối với các yêu cầu tra cứu dữ liệu động của chính người dùng hiện tại (ví dụ: *tôi đang mượn sách gì, tôi nợ bao nhiêu tiền phạt...*).

```
                      ┌──────────────────────┐
                      │   User Query (Chat)  │
                      └──────────┬───────────┘
                                 │
                     [Phân loại Ý định (Intent)]
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            [Ý định: FAQ]              [Ý định: Cá nhân]
                   │                           │
          (ChromaDB RAG)             
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                      ┌───────────────────────────┐
                      │   Gemini 3.1 Flash-Lite   │
                      │    (Sinh câu trả lời)     │
                      └─────────────┬─────────────┘
                                    ▼
                            [SSE Streaming]
```

---

## 2. LUỒNG DỮ LIỆU CHI TIẾT (DATA FLOW)

### Luồng 1: Hỏi đáp quy chế thư viện (RAG)
1.  **Gửi yêu cầu**: Bạn đọc hỏi câu hỏi quy chế (Ví dụ: *"Sinh viên đại học mượn tối đa mấy quyển?"*).
2.  **Phân loại ý định**: Bộ lọc phân loại nhận diện đây là câu hỏi **FAQ** (Không chứa từ khóa cá nhân hóa).
3.  **Truy xuất thông tin (Retrieve)**:
    *   Truy vấn câu hỏi sang **ChromaDB** (Vector Store chạy in-memory trên Python).
    *   ChromaDB chuyển câu hỏi thành Vector Embedding bằng mô hình `embedding-001`, sau đó tìm kiếm và trả về top ngữ cảnh có độ tương đồng ngữ nghĩa cao nhất từ file `library_faq.txt`.
4.  **Nhồi prompt (Augment)**: Hệ thống nhồi ngữ cảnh tìm được vào System Prompt mẫu, đóng gói thành prompt gửi tới Gemini.
5.  **Sinh câu trả lời (Generate)**: Gemini đọc prompt, tổng hợp câu trả lời dựa trên ngữ cảnh được cung cấp và stream ngược lại cho người dùng.

### Luồng 2: Tra cứu thông tin cá nhân (Function Calling)
1.  **Gửi yêu cầu**: Bạn đọc hỏi: *"Tài khoản của tôi có bị phạt trễ hạn không?"*.
2.  **Phân loại ý định**: Bộ lọc phát hiện cụm từ *"tài khoản của tôi"*, phân loại ý định là **PERSONAL**.
3.  **Kích hoạt gọi hàm (Function Calling)**:
    *   Python AI Service gửi câu hỏi kèm theo thông tin các Tool khai báo (`get_user_fines`, `get_active_borrows`, `get_user_reservations`) sang Gemini.
    *   Gemini phân tích câu hỏi và nhận ra cần dùng tool `get_user_fines` với tham số `user_id`. Nó trả về một yêu cầu gọi hàm dưới dạng JSON cấu trúc.
4.  **Thực thi gọi hàm (Tool Execution)**:
    *   Python Service bắt lấy yêu cầu đó, thực hiện gọi ngược về API nội bộ của Node.js Backend (`/api/v1/ai/internal/user/{userId}/fines`) với mã bảo mật `X-Internal-Key`.
    *   Node.js Backend truy vấn database PostgreSQL thông qua Prisma ORM và trả về dữ liệu thô (ví dụ: `totalFines: 15000`).
5.  **Tổng hợp kết quả**: Python Service gửi dữ liệu thô này quay lại Gemini. Gemini đọc dữ liệu và tổng hợp thành câu trả lời thân thiện tiếng Việt để stream về cho người dùng.

---

## 3. CƠ CHẾ TRUYỀN PHÁT DỮ LIỆU ĐỘNG (SSE STREAMING)

Để tạo hiệu ứng gõ chữ mượt mà (typing effect) thời gian thực giống ChatGPT và giảm thiểu tối đa cảm giác chờ đợi của người dùng (giảm Latency), hệ thống sử dụng giao thức **SSE (Server-Sent Events)**:

```
[React Frontend]   <---(EventStream)--─   [Node.js Gateway]   <---(Stream Response)--─   [Python AI Service]
```

*   **Python AI Service**: Sử dụng `fastapi.responses.StreamingResponse` kết hợp thư viện `google-genai` mới của Google để stream từng từ (token) ngay khi mô hình sinh ra. Định dạng gửi đi dưới dạng SSE: `data: {"token": "Chào"}\n\n`.
*   **Node.js Backend (Proxy)**: Nhận stream thô từ Python. Node.js không đợi nhận hết mà hoạt động như một cổng chuyển tiếp (Proxy Stream), gọi `res.write(chunk)` để đẩy dữ liệu tới frontend ngay lập tức. Sau khi hoàn thành, Node.js tự động lưu nội dung hội thoại vào bảng `ChatHistory` trong PostgreSQL.
*   **React Frontend**: Sử dụng API `fetch` tiêu chuẩn với `response.body.getReader()`. Từng mảnh dữ liệu nhận được sẽ được giải mã thông qua `TextDecoder` và ghép dần vào khung chat của React State, mang lại trải nghiệm thời gian thực tuyệt vời.

---

## 4. PHƯƠNG PHÁP ĐÁNH GIÁ CHẤT LƯỢNG (LLM-AS-A-JUDGE EVALUATION)

Để đánh giá một cách khoa học hệ thống chatbot phục vụ cho đồ án tốt nghiệp, dự án này đã hiện thực hóa giải pháp kiểm thử tự động **LLM-as-a-Judge** ngay trong mã nguồn (`run_evaluation.py`).

### 4.1 Bộ tiêu chuẩn RAG Triad (Bộ ba RAG)
Chúng ta dùng một mô hình LLM độc lập (Gemini 3.1 Flash-Lite được cấu hình nhiệt độ $T=0.0$ để chấm điểm khách quan nhất) để chấm điểm câu trả lời từ thang điểm 1-5 theo 3 chỉ số RAG Triad:

```
                      ┌──────────────────────┐
                      │    1. Faithfulness   │
                      │  (Độ trung thực RAG) │
                      └──────────┬───────────┘
                                 ▼
                      ┌──────────────────────┐
                      │  2. Answer Relevancy │
                      │    (Độ liên quan)    │
                      └──────────┬───────────┘
                                 ▼
                      ┌──────────────────────┐
                      │ 3. Semantic Correct  │
                      │   (Độ chính xác)     │
                      └──────────────────────┘
```

1.  **Faithfulness (Độ trung thực / Chống ảo giác)**:
    *   *Định nghĩa*: Đo lường xem câu trả lời của Chatbot có hoàn toàn dựa trên ngữ cảnh do ChromaDB cung cấp hay không.
    *   *Tiêu chí chấm*: Điểm 5 nếu câu trả lời không có bất kỳ chi tiết tự bịa đặt nào ngoài tài liệu. Điểm 1 nếu câu trả lời chứa thông tin không thể đối chứng trong tài liệu gốc.
2.  **Answer Relevancy (Độ liên quan câu trả lời)**:
    *   *Định nghĩa*: Đánh giá xem chatbot có trả lời trực tiếp, đầy đủ và đúng trọng tâm câu hỏi của người dùng hay không, tránh tình trạng trả lời dài dòng hoặc lạc đề.
3.  **Semantic Correctness (Độ chính xác ngữ nghĩa)**:
    *   *Định nghĩa*: So sánh ý nghĩa cốt lõi của câu trả lời của chatbot với câu trả lời chuẩn mẫu (**Ground Truth**) do chuyên gia/thủ thư soạn sẵn.
    *   *Tiêu chí chấm*: Điểm 5 nếu thông tin truyền tải khớp hoàn toàn về mặt kiến thức. Điểm 1 nếu thông tin truyền tải bị sai lệch, thiếu sót nghiêm trọng.

### 4.2 Các chỉ số cấu trúc hệ thống (System Metrics)
*   **Intent Accuracy (Độ chính xác nhận diện Ý định)**: Tỷ lệ phân loại đúng câu hỏi tĩnh (FAQ) và câu hỏi động (PERSONAL) dựa trên bộ lọc từ khóa tinh chỉnh (`PERSONAL_KEYWORDS`).
*   **Tool Selection Accuracy (Độ chính xác gọi Tool)**: Đối với câu hỏi cá nhân, tỷ lệ Gemini chọn và kích hoạt chính xác tên hàm cần gọi (ví dụ: `get_active_borrows` vs `get_user_fines`).

---

## 5. HƯỚNG DẪN VẬN HÀNH & ĐỌC BÁO CÁO ĐÁNH GIÁ

### 5.1 Khởi chạy kiểm thử
Trong thư mục gốc của dự án, chạy lệnh sau để thực hiện đánh giá tự động trên bộ dữ liệu chuẩn (Golden Dataset gồm 16 câu hỏi test):

```bash
cd ai-service
python run_evaluation.py
```

### 5.2 Đọc hiểu báo cáo `evaluation_report.md`
Sau khi chạy xong, file [evaluation_report.md](file:///f:/NEW/KHOA/HK252/DATN/demo/ai-service/evaluation_report.md) sẽ tự động được sinh ra trong thư mục `ai-service/`. Báo cáo gồm:
*   **Phần 1**: Bảng tổng hợp điểm số trung bình (thang điểm 5) cho Faithfulness, Relevancy, Correctness và các tỷ lệ phần trăm chính xác của cấu trúc hệ thống.
*   **Phần 2**: Bảng chi tiết kết quả từng câu kiểm thử bao gồm câu hỏi, ý định, tool được gọi, độ dài context, điểm số chi tiết từ giám khảo AI và lời giải thích lý do chấm điểm (Reason).
*   **Phần 3**: Nhận xét điểm mạnh, điểm yếu và đề xuất hướng cải tiến cho đồ án.
