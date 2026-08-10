# TÀI LIỆU HƯỚNG DẪN: KIẾN TRÚC VÀ ĐÁNH GIÁ CHẤT LƯỢNG TÌM KIẾM NGỮ NGHĨA

Tài liệu này giải thích chi tiết về kiến trúc thiết kế, luồng dữ liệu, cơ chế tính điểm Hybrid và phương pháp đánh giá tự động (Evaluation) của tính năng **Tìm kiếm Ngữ nghĩa** thuộc Hệ thống Quản lý Thư viện BkLib.

---

## 1. KIẾN TRÚC TỔNG QUAN (HYBRID SEMANTIC SEARCH)

Tính năng tìm kiếm ngữ nghĩa được xây dựng theo kiến trúc **Hybrid Search**, kết hợp hai kỹ thuật:

1. **Vector Semantic Search**: Chuyển đổi câu hỏi và nội dung sách thành vector số học (Embedding), sử dụng **Cosine Similarity** để đo độ tương đồng về ngữ nghĩa.
2. **Keyword Matching**: Khớp trực tiếp các từ khóa giữa câu hỏi và nội dung sách — đảm bảo độ chính xác với các truy vấn ngắn, cụ thể.

```
                     ┌────────────────────────────┐
                     │   User gõ câu hỏi tự nhiên  │
                     └────────────┬───────────────┘
                                  │
                        [Adaptive Weight Selector]
                        (Phân tích độ phức tạp query)
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        [Semantic Score]                [Keyword Score]
        Cosine Similarity               Token Overlap
        (Vector Embedding)              (Text Matching)
                   │                             │
                   └──────────────┬──────────────┘
                                  ▼
                     [Hybrid Score = α × Semantic + β × Keyword]
                                  │
                     [Confidence Thresholding]
                      high / medium / low
                                  │
                     [LLM Explanation — top 3]
                                  │
                     [Response → Frontend]
```

---

## 2. LUỒNG DỮ LIỆU CHI TIẾT (DATA FLOW)

### Bước 0: Chuẩn bị — Index toàn bộ kho sách (1 lần lúc khởi động)

Khi AI Service khởi động, hàm `_fetch_and_build_cache()` tự động chạy:

1. Gọi Node.js API lấy **200 cuốn sách** từ PostgreSQL.
2. Với mỗi cuốn sách, ghép các trường thông tin thành chuỗi văn bản:
   ```
   "Tên sách: {title}. Tác giả: {authorNames}. Danh mục: {category}. Tóm tắt: {summary}"
   ```
3. Nạp qua mô hình **SentenceTransformer** (`paraphrase-multilingual-MiniLM-L12-v2`) để chuyển thành **Vector 384 chiều**.
4. Lưu toàn bộ vào `BOOK_EMBEDDINGS_CACHE` (in-memory).

> **Lý do ghép nhiều trường**: Embedding "hiểu" cuốn sách qua nhiều khía cạnh — tiêu đề, tác giả, danh mục, nội dung — giúp tăng độ chính xác tìm kiếm ngữ nghĩa.

### Bước 1: Người dùng gõ câu hỏi

Câu hỏi tự nhiên được gửi từ React Frontend → Node.js Backend → Python AI Service.

```
"tôi muốn học cách viết code sạch và dễ bảo trì"
```

### Bước 2: Tính trọng số Adaptive (Cân bằng thông minh)

Hệ thống tự động điều chỉnh tỷ lệ Semantic/Keyword theo độ phức tạp của câu truy vấn:

| Độ dài query | Ví dụ | Trọng số Semantic | Trọng số Keyword |
| :--- | :--- | :--- | :--- |
| < 3 từ | `"Python cơ bản"` | 40% | 60% |
| 3–5 từ | `"sách lập trình Python"` | 65% | 35% |
| > 5 từ | `"tôi muốn học cách viết code sạch..."` | 80% | 20% |

> **Nguyên lý**: Query dài = người dùng đang diễn đạt ngữ cảnh → ưu tiên hiểu ý nghĩa. Query ngắn = người dùng tìm từ khóa cụ thể → ưu tiên khớp chính xác.

### Bước 3: Tính điểm cho từng cuốn sách

#### 3a. Semantic Score (Cosine Similarity)

```
Query Embedding:  [0.23, -0.11, 0.67, ...]
Book Embedding:   [0.19, -0.08, 0.71, ...]

              dot_product(Query, Book)
Cosine =   ────────────────────────────  ∈ [0, 1]
              |Query| × |Book|
```

Giá trị càng gần **1.0** = hai văn bản càng giống nhau về mặt ngữ nghĩa.

#### 3b. Keyword Score (Token Overlap)

```
Query tokens: {"muon", "hoc", "code", "sach", "bao", "tri"}
Book tokens:  {"clean", "code", "sach", "viet", "lap", "trinh"}

Overlap = {"code", "sach"} → score = 2/6 = 0.33
```

#### 3c. Điểm tổng hợp

```
Final Score = α × Semantic_Score + β × Keyword_Score
            = 0.80 × 0.87 + 0.20 × 0.33
            = 0.696 + 0.066
            = 0.762  (76%)
```

### Bước 4: Phân loại Confidence và Lọc kết quả

Dựa vào điểm số cao nhất (`top_score`), hệ thống tự phân loại:

| Mức Confidence | Điều kiện | Số kết quả trả về | Ngưỡng lọc |
| :--- | :--- | :--- | :--- |
| **high** 🟢 | `top_score >= 0.50` | Tối đa 12 kết quả | 35% của top score |
| **medium** 🟡 | `0.30 ≤ top_score < 0.50` | Tối đa 8 kết quả | 0.20 |
| **low** 🔴 | `top_score < 0.30` | Tối đa 5 kết quả + gợi ý câu hỏi | 0.10 |

### Bước 5: AI Giải thích kết quả (top 3)

Với 3 kết quả đầu tiên (nếu confidence ≥ medium), **Gemini 3.1 Flash-Lite** được gọi để sinh câu giải thích ngắn (~20 từ) tại sao cuốn sách phù hợp với câu truy vấn của người dùng.

---

## 3. CƠ CHẾ XỬ LÝ SAI SÓT (HYBRID FALLBACK)

Khi Semantic Search không đủ tin cậy, hệ thống **tự động điều chỉnh**:

```
Tìm kiếm ngữ nghĩa
        │
   top_score thấp?
        │
   ┌────┴────┐
  Có        Không
   │          │
   ▼          ▼
searchMode:  searchMode:
"keyword_   "semantic"
 fallback"
   │
   ▼
+ Gợi ý câu hỏi cụ thể hơn (suggestedQueries)
  do Gemini sinh ra
```

Ngoài ra, nếu Python AI Service bị lỗi hoàn toàn, Node.js Backend tự fallback sang **tìm kiếm từ khóa thuần túy** trực tiếp trên PostgreSQL.

---

## 4. PHƯƠNG PHÁP ĐÁNH GIÁ CHẤT LƯỢNG (LLM-AS-A-JUDGE EVALUATION)

Dự án hiện thực hóa bộ đánh giá tự động trong file `run_search_evaluation.py`, sử dụng kết hợp **chỉ số truy hồi thông tin cổ điển** và **LLM-as-a-Judge**.

### 4.1 Golden Dataset

Bộ dữ liệu kiểm thử gồm **15 câu hỏi**:
- **12 câu ngữ nghĩa**: Câu hỏi tự nhiên về các lĩnh vực khác nhau (lập trình, kinh tế, tâm lý, xã hội...) kèm danh sách từ khóa kết quả kỳ vọng.
- **3 câu noise**: Câu hỏi hoàn toàn không liên quan (thời tiết, đồ ăn...) — kỳ vọng hệ thống từ chối trả kết quả.

### 4.2 Chỉ số đo lường cổ điển

| Chỉ số | Ý nghĩa | Mục tiêu |
| :--- | :--- | :--- |
| **NDCG@5** | Chất lượng xếp hạng top 5 kết quả — kết quả quan trọng có ở đầu không? | ≥ 0.70 |
| **MRR** | Mean Reciprocal Rank — kết quả đúng xuất hiện ở vị trí nào? | ≥ 0.60 |
| **Precision@3** | Trong top 3 kết quả, bao nhiêu kết quả thực sự liên quan? | ≥ 0.60 |
| **Noise Rejection Rate** | Tỷ lệ từ chối truy vấn không liên quan đến sách | ≥ 80% |
| **Hybrid Fallback Rate** | Tỷ lệ tự chuyển sang tìm kiếm từ khóa | Theo dõi |

### 4.3 LLM-as-a-Judge

**Gemini 3.1 Flash-Lite** (nhiệt độ T=0.0) đóng vai trò **Giám khảo AI** đánh giá 2 tiêu chí:

```
Chỉ số              Ý nghĩa                              Thang điểm
──────────────────────────────────────────────────────────────────
Relevance Score     Tập kết quả có liên quan đến         1 → 5
                    câu hỏi của người dùng không?

Ranking Quality     Kết quả quan trọng nhất có           1 → 5
                    xuất hiện ở vị trí đầu danh sách?
```

---

## 5. GIAO DIỆN NGƯỜI DÙNG (UI FEATURES)

Khi bật chế độ **"Tìm kiếm thông minh bằng AI"** trên trang tìm kiếm:

- **Score badge**: Hiển thị `"76% phù hợp"` trên góc trên trái mỗi card sách.
- **Search mode badge**: Hiển thị `"Tìm ngữ nghĩa"` / `"Tìm kết hợp"` / `"Từ khóa cơ bản"` kèm mức độ tin cậy ở đầu trang kết quả.
- **AI Explanation**: Câu giải thích ngắn ngay dưới tiêu đề sách cho top 3 kết quả.
- **Suggested query chips**: Khi kết quả thấp tin cậy, hiện các nút gợi ý câu hỏi cụ thể hơn để người dùng thử lại.
- **Empty state thông minh**: Khi không có kết quả AI, hiện nút "Thử tìm kiếm thường" để fallback.

---

## 6. HƯỚNG DẪN VẬN HÀNH & ĐỌC BÁO CÁO ĐÁNH GIÁ

### 6.1 Làm mới index khi có sách mới

Khi thủ thư thêm sách mới vào hệ thống, gọi endpoint để cập nhật cache embedding:

```bash
curl -X POST http://localhost:8000/search/refresh-cache
```

### 6.2 Khởi chạy kiểm thử đánh giá

Đảm bảo Node.js Backend đang chạy (cổng 3000), sau đó chạy:

```bash
cd ai-service
python run_search_evaluation.py
```

### 6.3 Đọc hiểu báo cáo `search_evaluation_report.md`

Sau khi chạy xong, file `search_evaluation_report.md` tự động sinh ra trong thư mục `ai-service/`. Báo cáo gồm:

- **Phần 1**: Bảng tổng hợp điểm số NDCG@5, MRR, Precision@3, Noise Rejection Rate và điểm trung bình từ Giám khảo AI (thang 1-5).
- **Phần 2**: Bảng chi tiết kết quả từng câu kiểm thử bao gồm câu hỏi, số kết quả, điểm số từng chỉ số và nhận xét của Giám khảo AI.
- **Phần 3**: Nhận xét điểm mạnh, điểm yếu và đề xuất hướng cải tiến.
