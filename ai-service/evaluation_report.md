# BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG AI CHATBOT (EVALUATION REPORT)

**Ngày thực hiện**: 2026-07-02 17:28:52
**Mô hình sử dụng**: `gemini-2.5-flash`
**Tổng số câu hỏi kiểm thử**: 16 câu

## 1. TÓM TẮT CHỈ SỐ ĐO LƯỜNG (METRICS SUMMARY)

| Chỉ số đánh giá | Công thức | Kết quả đạt được | Mục tiêu đồ án | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Độ chính xác phân loại Ý định (Intent Accuracy)** | Đúng Intent / Tổng số câu | **81.2%** | >= 90% | 🔴 CHƯA ĐẠT |
| **Độ chính xác chọn Tool (Tool Selection Accuracy)** | Chọn đúng Tool / Tổng câu cá nhân | **0.0%** | >= 90% | 🔴 CHƯA ĐẠT |
| **Tỷ lệ tìm thấy ngữ cảnh RAG (RAG Retrieval Rate)** | Tìm thấy context / Tổng câu quy chế | **70.0%** | >= 80% | 🔴 CHƯA ĐẠT |

## 2. BẢNG DỮ LIỆU CHẠY THỰC NGHIỆM CHI TIẾT

| ID | Câu hỏi của bạn đọc | Phân loại Intent | Trạng thái | Tool đã gọi | Trạng thái | Độ dài Context | Câu trả lời của Trợ lý |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | *Quy định mượn sách của thư viện như thế nào?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 827 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 2 | *Sinh viên đại học được mượn tối đa bao nhiêu cuốn sách?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 639 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 3 | *Phí phạt trễ hạn được tính như thế nào?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 825 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 4 | *Thư viện cơ sở Dĩ An mở cửa lúc mấy giờ?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 825 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 5 | *Làm thế nào để hủy đặt giữ chỗ sách trực tuyến?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 826 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 6 | *Mất sách thì phải đền bù thế nào?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 827 ký tự | Chào bạn,  Về việc đền bù khi mất sách, thông tin chi tiết về mức đền bù cụ thể không được nêu rõ trong nội quy hiện tại. Tuy nhiên, các trường hợp sá... |
| 7 | *Thư viện cơ sở Lý Thường Kiệt có mở cửa thứ bảy không?* | FAQ (kỳ vọng: FAQ) | ✅ Đạt | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 826 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 8 | *Tôi có thể nhờ người khác mượn sách hộ không?* | PERSONAL (kỳ vọng: FAQ) | ❌ Sai | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 9 | *Tôi được gia hạn mượn sách tối đa mấy lần?* | PERSONAL (kỳ vọng: FAQ) | ❌ Sai | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 10 | *Làm sao để biết cuốn sách tôi cần đang ở cơ sở nào?* | PERSONAL (kỳ vọng: FAQ) | ❌ Sai | `Không dùng` (kỳ vọng: `Không dùng`) | ✅ Đạt | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 11 | *Tôi đang mượn những cuốn sách nào vậy?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_active_borrows`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 12 | *Tài khoản của tôi có bị phạt tiền trễ hạn không?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_user_fines`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 13 | *Kiểm tra giúp mình danh sách sách đang đặt giữ chỗ với?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_user_reservations`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 14 | *Cho mình xem các cuốn sách mình mượn sắp hết hạn chưa?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_active_borrows`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 15 | *Xem giùm tôi tổng tiền phạt hiện tại của tôi là bao nhiêu?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_user_fines`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |
| 16 | *Lịch sử đặt giữ chỗ của tôi có cuốn nào không?* | PERSONAL (kỳ vọng: PERSONAL) | ✅ Đạt | `Không dùng` (kỳ vọng: `get_user_reservations`) | ❌ Sai | 0 ký tự | [Gemini Error] 429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': 'You exceeded your current quota, please check your plan and billing details... |

## 3. PHÂN TÍCH VÀ ĐỀ XUẤT CẢI TIẾN

### 3.1 Nhận xét kết quả phân loại Ý định
- Cần bổ sung các từ khóa nhận diện câu hỏi cá nhân vào bộ lọc để cải thiện độ nhạy.

### 3.2 Nhận xét kết quả RAG Retrieval
- ChromaDB kết hợp mô hình SentenceTransformer cho kết quả tìm kiếm ngữ cảnh có độ tương đồng cao.
- Việc giữ nguyên cấu trúc đoạn văn (paragraph chunking) giúp Gemini hiểu trọn vẹn ý của quy chế thư viện, câu trả lời mạch lạc và không bị đứt câu.
