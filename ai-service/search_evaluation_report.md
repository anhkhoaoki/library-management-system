# BÁO CÁO ĐÁNH GIÁ TÍNH NĂNG TÌM KIẾM NGỮ NGHĨA

**Ngày thực hiện**: 2026-09-26 19:15:32
**Mô hình Judge**: `gemini-3.1-flash-lite`
**Mô hình Embedding**: `paraphrase-multilingual-MiniLM-L12-v2`
**Tổng câu hỏi kiểm thử**: 15 câu (12 câu ngữ nghĩa + 3 câu noise)

## 1. TỔNG HỢP CHỈ SỐ ĐO LƯỜNG

### 1.1 Chỉ số Truy hồi Thông tin Cổ điển

| Chỉ số | Ý nghĩa | Kết quả | Mục tiêu |
| :--- | :--- | :--- | :--- |
| **NDCG@5** | Chất lượng xếp hạng top 5 kết quả | **0.9288** | >= 0.70 | 🟢 ĐẠT |
| **MRR** | Kết quả đúng xuất hiện ở vị trí nào | **0.8750** | >= 0.60 | 🟢 ĐẠT |
| **Precision@3** | Độ chính xác trong top 3 kết quả | **0.5556** | >= 0.60 | 🔴 CHƯA ĐẠT |
| **Noise Rejection Rate** | Tỷ lệ từ chối truy vấn không liên quan | **100.0%** | >= 80% | 🟢 ĐẠT |
| **Hybrid Fallback Rate** | Tỷ lệ chuyển sang tìm kiếm từ khóa | **20.0%** | - | - |

### 1.2 Đánh giá Chất lượng bởi LLM Judge (Thang 1-5)

| Tiêu chí | Điểm trung bình | Nhận xét |
| :--- | :--- | :--- |
| **Relevance Score** (Độ liên quan) | **4.13 / 5.0** | Tốt |
| **Ranking Quality** (Chất lượng xếp hạng) | **3.80 / 5.0** | Tốt |

## 2. KẾT QUẢ CHI TIẾT TỪNG CÂU HỎI

| ID | Câu hỏi | # Kết quả | Top Score | NDCG@5 | MRR | P@3 | Noise | Judge Rel | Judge Rank | Nhận xét | Top 3 kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| S01 | *sách lập trình Python cho người mới bắt * | 6 | 76.9% | 1.0 | 1.0 | 1.0 | ✅ | 5 | 5 | Các kết quả trả về đều bám sát chủ đề lập trình Python và cá | Lập trình Python cơ bản; Học máy với Python: Từ cơ bản đến ứ |
| S02 | *tài liệu học máy học (machine learning) * | 8 | 68.1% | 1.0 | 1.0 | 0.6667 | ✅ | 4 | 4 | Hai kết quả đầu tiên rất sát với yêu cầu, tuy nhiên các kết  | Hands-On Machine Learning with Scikit-Learn, Keras, and Tens |
| S03 | *sách về thiết kế giao diện và trải nghiệ* | 8 | 61.4% | 1.0 | 0.0 | 0.0 | ✅ | 1 | 1 | Các kết quả trả về tập trung vào kỹ thuật lập trình và kiến  | Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hành; Design Patte |
| S04 | *tài liệu xây dựng hệ thống phân tán và k* | 3 | 80.7% | 1.0 | 1.0 | 0.6667 | ✅ | 5 | 5 | Kết quả trả về tập trung chính xác vào chủ đề microservices  | Building Microservices: Designing Fine-Grained Systems; Kiến |
| S05 | *sách cấu trúc dữ liệu và giải thuật* | 8 | 72.1% | 1.0 | 1.0 | 0.3333 | ✅ | 4 | 5 | Kết quả đầu tiên khớp hoàn hảo với truy vấn, tuy nhiên các k | Nhập môn Cấu trúc Dữ liệu và Giải thuật; Python for Data Ana |
| S06 | *tài liệu về quản lý dự án trong công ngh* | 8 | 71.1% | 0.9197 | 1.0 | 0.6667 | ✅ | 4 | 3 | Kết quả tìm kiếm bao quát được chủ đề nhưng các tài liệu qua | Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hành; Quản trị Dự  |
| S07 | *sách về kinh tế học vĩ mô và tài chính d* | 8 | 71.5% | 0.833 | 1.0 | 0.6667 | ✅ | 4 | 3 | Hệ thống trả về các đầu sách đúng chủ đề nhưng thứ tự ưu tiê | Tài chính Doanh nghiệp; Kinh tế Vi mô; Marketing Căn bản |
| S08 | *sách tâm lý học hành vi và kỹ năng giao * | 8 | 66.3% | 0.8772 | 1.0 | 0.3333 | ✅ | 5 | 4 | Các kết quả đều bám sát chủ đề tâm lý học và kỹ năng mềm, tu | Kỹ năng Thuyết trình Hiệu quả; Atomic Habits; Lãnh đạo bằng  |
| S09 | *tôi muốn học cách viết code sạch và dễ b* | 1 | 67.9% | 1.0 | 1.0 | 0.3333 | ✅ | 5 | 5 | Kết quả trả về chính xác là cuốn sách kinh điển về chủ đề co | Clean Code: A Handbook of Agile Software Craftsmanship |
| S10 | *cần tài liệu giúp tôi hiểu về mạng máy t* | 7 | 69.2% | 0.9197 | 1.0 | 0.6667 | ✅ | 4 | 3 | Kết quả tìm kiếm bao quát được các chủ đề yêu cầu nhưng thứ  | An toàn và Bảo mật Thông tin; Nhập môn Cấu trúc Dữ liệu và G |
| S11 | *sách giúp hiểu về cơ sở dữ liệu và SQL* | 3 | 59.1% | 0.6309 | 0.5 | 0.3333 | ✅ | 3 | 2 | Kết quả tìm kiếm chưa tối ưu khi đặt sách về cấu trúc dữ liệ | Nhập môn Cấu trúc Dữ liệu và Giải thuật; Cơ sở Dữ liệu: Lý t |
| S12 | *muốn tìm sách lịch sử Việt Nam thời kỳ đ* | 8 | 85.4% | 0.9652 | 1.0 | 1.0 | ✅ | 3 | 2 | Hệ thống trả về các tài liệu lịch sử chung nhưng thiếu các đ | Lịch sử Việt Nam Từ Nguồn Gốc đến Thế kỷ XIX; Văn hóa Việt N |
| N01 | *hôm nay thời tiết như thế nào* | 0 | 0% | 1.0 | 0.0 | 0.0 | ✅ | 5 | 5 | Đúng — không có kết quả cho noise query. | Không có |
| N02 | *abc xyz 123* | 0 | 0% | 1.0 | 0.0 | 0.0 | ✅ | 5 | 5 | Đúng — không có kết quả cho noise query. | Không có |
| N03 | *tôi muốn đặt đồ ăn online* | 0 | 0% | 1.0 | 0.0 | 0.0 | ✅ | 5 | 5 | Đúng — không có kết quả cho noise query. | Không có |

## 3. NHẬN XÉT VÀ ĐỀ XUẤT

### 3.1 Điểm mạnh
- Kiến trúc Hybrid Search (Vector + Keyword) giúp cân bằng giữa hiểu ngữ nghĩa và khớp từ khóa chính xác.
- Adaptive weighting điều chỉnh tỷ lệ semantic/keyword theo độ dài câu hỏi.
- Confidence thresholding ngăn trả về kết quả không liên quan.

### 3.2 Hạn chế và Đề xuất
- Nên theo dõi Click-through Rate (CTR) trong thực tế để đánh giá bổ sung hành vi người dùng.
