# BÁO CÁO ĐÁNH GIÁ TÍNH NĂNG TÌM KIẾM NGỮ NGHĨA

**Ngày thực hiện**: 2026-08-02 18:13:18
**Mô hình Judge**: `gemini-3.1-flash-lite`
**Mô hình Embedding**: `paraphrase-multilingual-MiniLM-L12-v2`
**Tổng câu hỏi kiểm thử**: 15 câu (12 câu ngữ nghĩa + 3 câu noise)

## 1. TỔNG HỢP CHỈ SỐ ĐO LƯỜNG

### 1.1 Chỉ số Truy hồi Thông tin Cổ điển

| Chỉ số | Ý nghĩa | Kết quả | Mục tiêu |
| :--- | :--- | :--- | :--- |
| **NDCG@5** | Chất lượng xếp hạng top 5 kết quả | **0.9181** | >= 0.70 | 🟢 ĐẠT |
| **MRR** | Kết quả đúng xuất hiện ở vị trí nào | **0.8750** | >= 0.60 | 🟢 ĐẠT |
| **Precision@3** | Độ chính xác trong top 3 kết quả | **0.6111** | >= 0.60 | 🟢 ĐẠT |
| **Noise Rejection Rate** | Tỷ lệ từ chối truy vấn không liên quan | **33.3%** | >= 80% | 🔴 CHƯA ĐẠT |
| **Hybrid Fallback Rate** | Tỷ lệ chuyển sang tìm kiếm từ khóa | **6.7%** | - | - |

### 1.2 Đánh giá Chất lượng bởi LLM Judge (Thang 1-5)

| Tiêu chí | Điểm trung bình | Nhận xét |
| :--- | :--- | :--- |
| **Relevance Score** (Độ liên quan) | **3.20 / 5.0** | Cần cải thiện |
| **Ranking Quality** (Chất lượng xếp hạng) | **3.07 / 5.0** | Cần cải thiện |

## 2. KẾT QUẢ CHI TIẾT TỪNG CÂU HỎI

| ID | Câu hỏi | # Kết quả | Top Score | NDCG@5 | MRR | P@3 | Noise | Judge Rel | Judge Rank | Nhận xét | Top 3 kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| S01 | *sách lập trình Python cho người mới bắt * | 8 | 68.2% | 0.9155 | 1.0 | 1.0 | ✅ | 5 | 5 | Các kết quả trả về đều bám sát chủ đề lập trình Python và cá | Lập trình Python cơ bản; Học máy với Python: Từ cơ bản đến ứ |
| S02 | *tài liệu học máy học (machine learning) * | 8 | 58.1% | 0.7654 | 1.0 | 0.6667 | ✅ | 4 | 4 | Hai kết quả đầu tiên rất sát với yêu cầu, tuy nhiên các kết  | Hands-On Machine Learning with Scikit-Learn, Keras, and Tens |
| S03 | *sách về thiết kế giao diện và trải nghiệ* | 8 | 49.1% | 1.0 | 0.0 | 0.0 | ✅ | 1 | 1 | Các kết quả trả về tập trung vào kỹ thuật lập trình và kiến  | Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hành; Design Patte |
| S04 | *tài liệu xây dựng hệ thống phân tán và k* | 6 | 64.6% | 1.0 | 1.0 | 0.6667 | ✅ | 4 | 5 | Kết quả hàng đầu rất sát với yêu cầu, tuy nhiên các kết quả  | Building Microservices: Designing Fine-Grained Systems; Kiến |
| S05 | *sách cấu trúc dữ liệu và giải thuật* | 8 | 75.2% | 1.0 | 1.0 | 0.3333 | ✅ | 4 | 5 | Kết quả đầu tiên khớp hoàn hảo với truy vấn và các kết quả t | Nhập môn Cấu trúc Dữ liệu và Giải thuật; Cơ sở Dữ liệu: Lý t |
| S06 | *tài liệu về quản lý dự án trong công ngh* | 8 | 61.9% | 0.9197 | 1.0 | 0.6667 | ✅ | 4 | 3 | Kết quả tìm kiếm có chứa các tài liệu phù hợp nhưng các đầu  | Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hành; Quản trị Dự  |
| S07 | *sách về kinh tế học vĩ mô và tài chính d* | 8 | 63.9% | 0.866 | 1.0 | 1.0 | ✅ | 4 | 4 | Hệ thống trả về các kết quả chính xác về kinh tế và tài chín | Tài chính Doanh nghiệp; Kinh tế Vi mô; Kinh tế Vĩ mô |
| S08 | *sách tâm lý học hành vi và kỹ năng giao * | 8 | 56.7% | 1.0 | 1.0 | 0.6667 | ✅ | 5 | 4 | Các kết quả đều bám sát chủ đề tâm lý học và kỹ năng mềm, tu | Kỹ năng Thuyết trình Hiệu quả; Tâm lý học Đám đông; Atomic H |
| S09 | *tôi muốn học cách viết code sạch và dễ b* | 2 | 56.0% | 1.0 | 1.0 | 0.3333 | ✅ | 5 | 5 | Các kết quả trả về đều là những tài liệu kinh điển và phù hợ | Clean Code: A Handbook of Agile Software Craftsmanship; The  |
| S10 | *cần tài liệu giúp tôi hiểu về mạng máy t* | 8 | 62.0% | 0.9197 | 1.0 | 0.6667 | ✅ | 4 | 3 | Hệ thống tìm được các tài liệu đúng chủ đề nhưng chưa ưu tiê | An toàn và Bảo mật Thông tin; Nhập môn Cấu trúc Dữ liệu và G |
| S11 | *sách giúp hiểu về cơ sở dữ liệu và SQL* | 4 | 53.2% | 0.6309 | 0.5 | 0.3333 | ✅ | 3 | 2 | Kết quả phù hợp nhất về cơ sở dữ liệu nằm ở vị trí thứ hai t | Nhập môn Cấu trúc Dữ liệu và Giải thuật; Cơ sở Dữ liệu: Lý t |
| S12 | *muốn tìm sách lịch sử Việt Nam thời kỳ đ* | 8 | 77.4% | 1.0 | 1.0 | 1.0 | ✅ | 2 | 2 | Các kết quả trả về chủ yếu tập trung vào lịch sử cổ trung đạ | Lịch sử Việt Nam Từ Nguồn Gốc đến Thế kỷ XIX; Đại Cương Lịch |
| N01 | *hôm nay thời tiết như thế nào* | 3 | 25.0% | 1.0 | 0.0 | 0.0 | ❌ | 1 | 1 | Hệ thống trả về các đầu sách không liên quan thay vì thông b | The 4-Hour Workweek; A Brief History of Time; The Power of N |
| N02 | *abc xyz 123* | 8 | 21.1% | 1.0 | 0.0 | 0.0 | ❌ | 1 | 1 | Hệ thống trả về các kết quả không liên quan cho một truy vấn | Mạng Máy Tính; Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hàn |
| N03 | *tôi muốn đặt đồ ăn online* | 8 | 18.1% | 1.0 | 0.0 | 0.0 | ✅ | 1 | 1 | Hệ thống trả về các tài liệu học thuật không liên quan đến y | Domain-Driven Design; Lập trình Web với JavaScript và Node.j |

## 3. NHẬN XÉT VÀ ĐỀ XUẤT

### 3.1 Điểm mạnh
- Kiến trúc Hybrid Search (Vector + Keyword) giúp cân bằng giữa hiểu ngữ nghĩa và khớp từ khóa chính xác.
- Adaptive weighting điều chỉnh tỷ lệ semantic/keyword theo độ dài câu hỏi.
- Confidence thresholding ngăn trả về kết quả không liên quan.

### 3.2 Hạn chế và Đề xuất
- Noise rejection chưa tốt → Cần tăng ngưỡng confidence hoặc thêm bộ lọc intent.
- Nên theo dõi Click-through Rate (CTR) trong thực tế để đánh giá bổ sung hành vi người dùng.
