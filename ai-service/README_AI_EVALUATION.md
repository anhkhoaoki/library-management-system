# Hướng dẫn chạy AI Evaluation Framework

## Cấu trúc thư mục

```
ai-service/
├── run_ai_evaluation.py          ← Script đánh giá chính (MỚI)
├── eval_data/
│   ├── chatbot_test_cases.json   ← 100 test cases Chatbot RAG
│   ├── search_test_cases.json    ← 100 test cases Semantic Search
│   └── recommendation_test_cases.json ← 100 test cases Gợi ý sách
└── eval_reports/                 ← Báo cáo tự động xuất ra (tự tạo khi chạy)
```

## Yêu cầu trước khi chạy

Đảm bảo các service đang chạy:

```bash
# Terminal 1: AI Service
cd ai-service
uvicorn app.main:app --port 8000

# Terminal 2: Backend (nếu cần recommendation thật)
cd backend-express
npm run dev
```

## Cách chạy

### 1. Chạy thử nhanh (demo — 10 case mỗi module = 30 case tổng)
```bash
cd ai-service
python run_ai_evaluation.py --module all --limit 10
```

### 2. Chạy từng module riêng lẻ
```bash
# Chỉ đánh giá Chatbot
python run_ai_evaluation.py --module chatbot

# Chỉ đánh giá Tìm kiếm
python run_ai_evaluation.py --module search

# Chỉ đánh giá Gợi ý
python run_ai_evaluation.py --module recommend
```

### 3. Chạy toàn bộ 300 test cases (ước tính ~45-60 phút)
```bash
python run_ai_evaluation.py --module all
```

## Giải thích chỉ số đánh giá

### Chatbot RAG
| Chỉ số | Ý nghĩa | Mục tiêu |
|--------|---------|----------|
| **Faithfulness** | Không bịa đặt thông tin ngoài FAQ | ≥ 4.0/5 |
| **Relevancy** | Trả lời đúng trọng tâm câu hỏi | ≥ 4.0/5 |
| **Correctness** | Nội dung khớp với đáp án chuẩn | ≥ 3.5/5 |
| **RAG Rate** | Tỷ lệ tìm thấy ngữ cảnh liên quan | ≥ 80% |

### Semantic Search
| Chỉ số | Ý nghĩa | Mục tiêu |
|--------|---------|----------|
| **Semantic Match** | Kết quả khớp chủ đề truy vấn | ≥ 3.5/5 |
| **Diversity** | Đa dạng góc tiếp cận trong kết quả | ≥ 3.0/5 |
| **Intent Alignment** | Hiểu đúng ý định tìm kiếm | ≥ 3.5/5 |

### Recommendations
| Chỉ số | Ý nghĩa | Mục tiêu |
|--------|---------|----------|
| **Relevance** | Sách gợi ý phù hợp sở thích user | ≥ 3.5/5 |
| **Novelty** | Sách mới, chưa mượn | ≥ 3.5/5 |
| **Serendipity** | Khám phá hướng mới thú vị | ≥ 3.0/5 |

## Báo cáo đầu ra

Sau khi chạy, tìm báo cáo trong `eval_reports/`:
- `ai_evaluation_report_YYYYMMDD_HHMMSS.md` — Báo cáo Markdown đầy đủ
- `raw_results_YYYYMMDD_HHMMSS.json` — Dữ liệu thô JSON

## Lưu ý

- Mỗi test case mất ~2.5 giây (rate limit Gemini API)
- 300 test cases ≈ 45-60 phút
- Chạy `--limit 10` để test nhanh (~5 phút)
- Kết quả đánh giá có thể thay đổi nhẹ giữa các lần chạy do LLM judge
