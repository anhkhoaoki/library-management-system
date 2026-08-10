"""
run_search_evaluation.py
════════════════════════════════════════════════════════════════════
Script đánh giá chất lượng tính năng Tìm kiếm Ngữ nghĩa (Semantic Search)
Sử dụng:
  1. Golden Dataset — Bộ câu hỏi với kết quả kỳ vọng (Ground Truth)
  2. Chỉ số đo lường cổ điển: NDCG@5, MRR, Precision@3
  3. LLM-as-a-Judge: Gemini đánh giá Relevance và Ranking Quality

Chạy:
  cd ai-service
  python run_search_evaluation.py
════════════════════════════════════════════════════════════════════
"""
import os
import sys
import asyncio
import time
import math
import json
import re
from typing import List, Dict, Any, Optional

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ─── Khởi tạo Gemini Judge (dùng riêng biệt, không qua LangChain) ──
from app.core.config import settings
from google import genai as google_genai

_judge_client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
MODEL = settings.GEMINI_MODEL


# ════════════════════════════════════════════════════════════════════
# GOLDEN DATASET: 15 câu hỏi tìm kiếm và kết quả kỳ vọng
# relevantTitles: Danh sách từ khóa/tiêu đề kỳ vọng trong kết quả
# isNoise: True = câu hỏi không liên quan (kỳ vọng: không có kết quả)
# ════════════════════════════════════════════════════════════════════
SEARCH_TEST_CASES = [
    # ── Nhóm 1: Câu hỏi kỹ thuật / Lập trình ──────────────────────
    {
        "id": "S01",
        "query": "sách lập trình Python cho người mới bắt đầu",
        "relevantKeywords": ["python", "lập trình", "cơ bản", "nhập môn"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách Python hoặc lập trình cơ bản ở vị trí đầu.",
    },
    {
        "id": "S02",
        "query": "tài liệu học máy học (machine learning) và trí tuệ nhân tạo",
        "relevantKeywords": ["machine learning", "học máy", "trí tuệ nhân tạo", "AI", "deep learning"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về AI, Machine Learning hoặc Deep Learning.",
    },
    {
        "id": "S03",
        "query": "sách về thiết kế giao diện và trải nghiệm người dùng",
        "relevantKeywords": ["UI", "UX", "thiết kế", "giao diện", "người dùng"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách UI/UX Design hoặc thiết kế web.",
    },
    {
        "id": "S04",
        "query": "tài liệu xây dựng hệ thống phân tán và kiến trúc microservice",
        "relevantKeywords": ["hệ thống phân tán", "microservice", "distributed", "kiến trúc"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về System Design hoặc Microservices.",
    },
    {
        "id": "S05",
        "query": "sách cấu trúc dữ liệu và giải thuật",
        "relevantKeywords": ["cấu trúc dữ liệu", "giải thuật", "algorithm", "data structure"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Algorithms hoặc Data Structures.",
    },

    # ── Nhóm 2: Câu hỏi xã hội / Kinh tế ──────────────────────────
    {
        "id": "S06",
        "query": "tài liệu về quản lý dự án trong công nghệ phần mềm",
        "relevantKeywords": ["quản lý dự án", "project management", "phần mềm", "agile", "scrum"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Project Management hoặc Agile.",
    },
    {
        "id": "S07",
        "query": "sách về kinh tế học vĩ mô và tài chính doanh nghiệp",
        "relevantKeywords": ["kinh tế", "tài chính", "doanh nghiệp", "vĩ mô"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Kinh tế học hoặc Tài chính.",
    },
    {
        "id": "S08",
        "query": "sách tâm lý học hành vi và kỹ năng giao tiếp",
        "relevantKeywords": ["tâm lý", "giao tiếp", "kỹ năng", "hành vi", "psychology"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Tâm lý học hoặc Kỹ năng mềm.",
    },

    # ── Nhóm 3: Câu hỏi tự nhiên / ngữ cảnh ───────────────────────
    {
        "id": "S09",
        "query": "tôi muốn học cách viết code sạch và dễ bảo trì hơn",
        "relevantKeywords": ["clean code", "code", "lập trình", "refactoring"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách Clean Code hoặc Best Practices lập trình.",
    },
    {
        "id": "S10",
        "query": "cần tài liệu giúp tôi hiểu về mạng máy tính và bảo mật thông tin",
        "relevantKeywords": ["mạng máy tính", "bảo mật", "network", "security", "cybersecurity"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Network hoặc Cybersecurity.",
    },
    {
        "id": "S11",
        "query": "sách giúp hiểu về cơ sở dữ liệu và SQL",
        "relevantKeywords": ["cơ sở dữ liệu", "database", "SQL", "MySQL", "PostgreSQL"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Database hoặc SQL.",
    },
    {
        "id": "S12",
        "query": "muốn tìm sách lịch sử Việt Nam thời kỳ đổi mới",
        "relevantKeywords": ["lịch sử", "Việt Nam", "đổi mới"],
        "isNoise": False,
        "groundTruth": "Kết quả cần chứa sách về Lịch sử Việt Nam hoặc giai đoạn đổi mới.",
    },

    # ── Nhóm 4: Noise queries (kỳ vọng: không có kết quả tin cậy) ─
    {
        "id": "N01",
        "query": "hôm nay thời tiết như thế nào",
        "relevantKeywords": [],
        "isNoise": True,
        "groundTruth": "Câu hỏi không liên quan đến sách — kỳ vọng không có kết quả hoặc fallback.",
    },
    {
        "id": "N02",
        "query": "abc xyz 123",
        "relevantKeywords": [],
        "isNoise": True,
        "groundTruth": "Query vô nghĩa — kỳ vọng không có kết quả.",
    },
    {
        "id": "N03",
        "query": "tôi muốn đặt đồ ăn online",
        "relevantKeywords": [],
        "isNoise": True,
        "groundTruth": "Câu hỏi không thuộc lĩnh vực thư viện — kỳ vọng không có kết quả.",
    },
]


# ════════════════════════════════════════════════════════════════════
# CÁC HÀM TÍNH CHÍNH SỐ ĐÁNH GIÁ
# ════════════════════════════════════════════════════════════════════

def compute_relevance_list(results: List[dict], relevant_keywords: List[str], is_noise: bool) -> List[int]:
    """
    Tính danh sách relevance cho mỗi kết quả:
      2 = Rất phù hợp (tiêu đề hoặc tóm tắt khớp >= 2 từ khóa)
      1 = Phù hợp (khớp 1 từ khóa)
      0 = Không phù hợp
    Nếu là noise query, tất cả đều = 0.
    """
    if is_noise or not relevant_keywords:
        return [0] * len(results)

    rels = []
    for book in results:
        text = f"{book.get('title', '')} {book.get('summary', '')} {' '.join(book.get('authorNames', []))}".lower()
        matched = sum(1 for kw in relevant_keywords if kw.lower() in text)
        if matched >= 2:
            rels.append(2)
        elif matched == 1:
            rels.append(1)
        else:
            rels.append(0)
    return rels


def compute_dcg(relevances: List[int], k: int) -> float:
    """Tính Discounted Cumulative Gain tại vị trí k."""
    dcg = 0.0
    for i, rel in enumerate(relevances[:k]):
        dcg += rel / math.log2(i + 2)
    return dcg


def compute_ndcg(relevances: List[int], k: int = 5) -> float:
    """Tính Normalized DCG@k."""
    actual_dcg = compute_dcg(relevances, k)
    ideal_rels = sorted(relevances, reverse=True)
    ideal_dcg = compute_dcg(ideal_rels, k)
    if ideal_dcg == 0:
        return 1.0 if actual_dcg == 0 else 0.0
    return round(actual_dcg / ideal_dcg, 4)


def compute_mrr(relevances: List[int]) -> float:
    """Tính Mean Reciprocal Rank — vị trí kết quả đúng đầu tiên."""
    for i, rel in enumerate(relevances):
        if rel > 0:
            return round(1.0 / (i + 1), 4)
    return 0.0


def compute_precision_at_k(relevances: List[int], k: int = 3) -> float:
    """Tính Precision@k — tỷ lệ kết quả đúng trong top K."""
    if not relevances:
        return 0.0
    top_k = relevances[:k]
    relevant_count = sum(1 for r in top_k if r > 0)
    return round(relevant_count / k, 4)


# ════════════════════════════════════════════════════════════════════
# LLM-AS-A-JUDGE: Gemini đánh giá chất lượng kết quả
# ════════════════════════════════════════════════════════════════════

JUDGE_SYSTEM_PROMPT = """Bạn là chuyên gia đánh giá hệ thống tìm kiếm thư viện đại học.
Hãy đánh giá chất lượng kết quả tìm kiếm ngữ nghĩa theo 2 tiêu chí và trả về JSON:

{
  "relevance_score": <1-5>,   // Mức độ liên quan giữa câu hỏi và tập kết quả
  "ranking_quality": <1-5>,   // Kết quả quan trọng nhất có ở vị trí đầu không?
  "reason": "<giải thích ngắn gọn trong 1 câu tiếng Việt>"
}

Thang điểm:
  5 = Xuất sắc  |  4 = Tốt  |  3 = Trung bình  |  2 = Kém  |  1 = Rất kém
Chỉ trả về JSON, không thêm markdown hay giải thích."""


async def judge_search_result(
    query: str,
    results: List[dict],
    ground_truth: str,
    is_noise: bool,
) -> Dict[str, Any]:
    """Dùng Gemini đánh giá 1 kết quả tìm kiếm."""
    if not results and is_noise:
        return {"relevance_score": 5, "ranking_quality": 5, "reason": "Đúng — không có kết quả cho noise query."}

    # Tạo chuỗi mô tả top 5 kết quả
    result_summary = "\n".join([
        f"{i+1}. [{round(r.get('score', 0)*100)}%] {r.get('title', 'N/A')} — {r.get('summary', '')[:100]}"
        for i, r in enumerate(results[:5])
    ]) or "(Không có kết quả)"

    prompt = f"""Câu tìm kiếm: "{query}"
Kết quả kỳ vọng: {ground_truth}
Các kết quả trả về (top {min(5, len(results))}):
{result_summary}

Đánh giá chất lượng:"""

    try:
        response = _judge_client.models.generate_content(
            model=MODEL,
            contents=[
                {"role": "user", "parts": [{"text": JUDGE_SYSTEM_PROMPT + "\n\n" + prompt}]}
            ],
            config={"temperature": 0.0, "max_output_tokens": 256},
        )
        raw = response.text or ""
        json_match = re.search(r'\{.*?\}', raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"relevance_score": "-", "ranking_quality": "-", "reason": "Không parse được JSON"}
    except Exception as e:
        return {"relevance_score": "-", "ranking_quality": "-", "reason": f"Lỗi: {str(e)[:80]}"}


# ════════════════════════════════════════════════════════════════════
# THỰC THI ĐÁNH GIÁ
# ════════════════════════════════════════════════════════════════════

async def run_search_evaluation():
    print("=" * 60)
    print("  KHỞI CHẠY ĐÁNH GIÁ CHẤT LƯỢNG TÌM KIẾM NGỮ NGHĨA")
    print("=" * 60)

    # Khởi tạo RAG/Embedding (cần thiết để search_service hoạt động)
    from app.services.rag_service import initialize_rag
    print("[1/3] Đang nạp cơ sở tri thức...")
    initialize_rag()
    print("→ Hoàn tất.\n")

    # Lấy danh sách sách để dùng làm corpus
    from app.api.routes.search import _fetch_and_build_cache
    print("[2/3] Đang nạp và index danh sách sách vào bộ nhớ...")
    book_embeddings = await _fetch_and_build_cache()
    if not book_embeddings:
        print("⚠️  Không thể tải danh sách sách. Kiểm tra Node.js backend đang chạy không?")
        return
    print(f"→ Đã index {len(book_embeddings)} cuốn sách.\n")

    from app.services.search_service import semantic_search

    print(f"[3/3] Bắt đầu đánh giá {len(SEARCH_TEST_CASES)} câu hỏi kiểm thử...\n")

    results_data = []
    ndcg_scores = []
    mrr_scores = []
    precision_scores = []
    fallback_count = 0
    noise_correct = 0
    judge_relevance_scores = []
    judge_ranking_scores = []

    for i, case in enumerate(SEARCH_TEST_CASES):
        qid = case["id"]
        query = case["query"]
        is_noise = case["isNoise"]
        relevant_kws = case["relevantKeywords"]

        print(f"  [{i+1}/{len(SEARCH_TEST_CASES)}] {qid}: '{query[:60]}'")

        # Chạy tìm kiếm
        try:
            raw_results = await semantic_search(
                query=query,
                book_embeddings=book_embeddings,
                limit=10,
            )
            top_score = raw_results[0].get("score", 0) if raw_results else 0

            # Xác định ngưỡng lọc
            if top_score >= 0.35:
                threshold = max(0.30, top_score * 0.35)
            elif top_score >= 0.20:
                threshold = 0.15
            else:
                threshold = 0.0
                fallback_count += 1

            filtered = [r for r in raw_results if r.get("score", 0) >= threshold][:8]

        except Exception as e:
            print(f"    ⚠️  Lỗi tìm kiếm: {e}")
            filtered = []
            fallback_count += 1

        # Tính relevances
        relevances = compute_relevance_list(filtered, relevant_kws, is_noise)

        # Tính các chỉ số
        ndcg = compute_ndcg(relevances, k=5)
        mrr = compute_mrr(relevances)
        prec = compute_precision_at_k(relevances, k=3)

        # Noise detection
        if is_noise:
            has_result = len(filtered) > 0 and (filtered[0].get("score", 0) >= 0.20)
            noise_ok = not has_result
            if noise_ok:
                noise_correct += 1
        else:
            noise_ok = True

        if not is_noise:
            ndcg_scores.append(ndcg)
            mrr_scores.append(mrr)
            precision_scores.append(prec)

        # LLM Judge
        judge = await judge_search_result(
            query=query,
            results=filtered,
            ground_truth=case["groundTruth"],
            is_noise=is_noise,
        )
        if isinstance(judge.get("relevance_score"), (int, float)):
            judge_relevance_scores.append(judge["relevance_score"])
        if isinstance(judge.get("ranking_quality"), (int, float)):
            judge_ranking_scores.append(judge["ranking_quality"])

        results_data.append({
            "id": qid,
            "query": query,
            "isNoise": is_noise,
            "resultCount": len(filtered),
            "topScore": round(raw_results[0].get("score", 0) * 100, 1) if raw_results else 0,
            "ndcg5": ndcg,
            "mrr": mrr,
            "precision3": prec,
            "noiseCorrect": "✅" if noise_ok else "❌" if is_noise else "-",
            "judgeRelevance": judge.get("relevance_score", "-"),
            "judgeRanking": judge.get("ranking_quality", "-"),
            "judgeReason": judge.get("reason", "-"),
            "topResults": [r.get("title", "?") for r in filtered[:3]],
        })

        await asyncio.sleep(3)  # Tránh rate limit

    # ─── Tổng hợp chỉ số ─────────────────────────────────────────
    n = len(SEARCH_TEST_CASES)
    n_valid = len(ndcg_scores)
    n_noise = sum(1 for c in SEARCH_TEST_CASES if c["isNoise"])
    avg_ndcg = sum(ndcg_scores) / n_valid if ndcg_scores else 0
    avg_mrr = sum(mrr_scores) / n_valid if mrr_scores else 0
    avg_prec = sum(precision_scores) / n_valid if precision_scores else 0
    fallback_rate = (fallback_count / n) * 100
    noise_accuracy = (noise_correct / n_noise) * 100 if n_noise > 0 else 100
    avg_judge_rel = sum(judge_relevance_scores) / len(judge_relevance_scores) if judge_relevance_scores else 0
    avg_judge_rank = sum(judge_ranking_scores) / len(judge_ranking_scores) if judge_ranking_scores else 0

    # ─── Xuất báo cáo ────────────────────────────────────────────
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "search_evaluation_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# BÁO CÁO ĐÁNH GIÁ TÍNH NĂNG TÌM KIẾM NGỮ NGHĨA\n\n")
        f.write(f"**Ngày thực hiện**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Mô hình Judge**: `{MODEL}`\n")
        f.write(f"**Mô hình Embedding**: `paraphrase-multilingual-MiniLM-L12-v2`\n")
        f.write(f"**Tổng câu hỏi kiểm thử**: {n} câu ({n - n_noise} câu ngữ nghĩa + {n_noise} câu noise)\n\n")

        f.write("## 1. TỔNG HỢP CHỈ SỐ ĐO LƯỜNG\n\n")
        f.write("### 1.1 Chỉ số Truy hồi Thông tin Cổ điển\n\n")
        f.write("| Chỉ số | Ý nghĩa | Kết quả | Mục tiêu |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        status_ndcg = "🟢 ĐẠT" if avg_ndcg >= 0.70 else "🔴 CHƯA ĐẠT"
        f.write(f"| **NDCG@5** | Chất lượng xếp hạng top 5 kết quả | **{avg_ndcg:.4f}** | >= 0.70 | {status_ndcg} |\n")
        status_mrr = "🟢 ĐẠT" if avg_mrr >= 0.60 else "🔴 CHƯA ĐẠT"
        f.write(f"| **MRR** | Kết quả đúng xuất hiện ở vị trí nào | **{avg_mrr:.4f}** | >= 0.60 | {status_mrr} |\n")
        status_prec = "🟢 ĐẠT" if avg_prec >= 0.60 else "🔴 CHƯA ĐẠT"
        f.write(f"| **Precision@3** | Độ chính xác trong top 3 kết quả | **{avg_prec:.4f}** | >= 0.60 | {status_prec} |\n")
        status_noise = "🟢 ĐẠT" if noise_accuracy >= 80 else "🔴 CHƯA ĐẠT"
        f.write(f"| **Noise Rejection Rate** | Tỷ lệ từ chối truy vấn không liên quan | **{noise_accuracy:.1f}%** | >= 80% | {status_noise} |\n")
        f.write(f"| **Hybrid Fallback Rate** | Tỷ lệ chuyển sang tìm kiếm từ khóa | **{fallback_rate:.1f}%** | - | - |\n\n")

        f.write("### 1.2 Đánh giá Chất lượng bởi LLM Judge (Thang 1-5)\n\n")
        f.write("| Tiêu chí | Điểm trung bình | Nhận xét |\n")
        f.write("| :--- | :--- | :--- |\n")
        rel_label = "Rất tốt" if avg_judge_rel >= 4.5 else ("Tốt" if avg_judge_rel >= 3.5 else "Cần cải thiện")
        f.write(f"| **Relevance Score** (Độ liên quan) | **{avg_judge_rel:.2f} / 5.0** | {rel_label} |\n")
        rank_label = "Rất tốt" if avg_judge_rank >= 4.5 else ("Tốt" if avg_judge_rank >= 3.5 else "Cần cải thiện")
        f.write(f"| **Ranking Quality** (Chất lượng xếp hạng) | **{avg_judge_rank:.2f} / 5.0** | {rank_label} |\n\n")

        f.write("## 2. KẾT QUẢ CHI TIẾT TỪNG CÂU HỎI\n\n")
        f.write("| ID | Câu hỏi | # Kết quả | Top Score | NDCG@5 | MRR | P@3 | Noise | Judge Rel | Judge Rank | Nhận xét | Top 3 kết quả |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for r in results_data:
            top3 = "; ".join(r["topResults"][:3]) or "Không có"
            f.write(
                f"| {r['id']} | *{r['query'][:40]}* | {r['resultCount']} | {r['topScore']}% "
                f"| {r['ndcg5']} | {r['mrr']} | {r['precision3']} | {r['noiseCorrect']} "
                f"| {r['judgeRelevance']} | {r['judgeRanking']} | {r['judgeReason'][:60]} | {top3[:60]} |\n"
            )

        f.write("\n## 3. NHẬN XÉT VÀ ĐỀ XUẤT\n\n")
        f.write("### 3.1 Điểm mạnh\n")
        f.write("- Kiến trúc Hybrid Search (Vector + Keyword) giúp cân bằng giữa hiểu ngữ nghĩa và khớp từ khóa chính xác.\n")
        f.write("- Adaptive weighting điều chỉnh tỷ lệ semantic/keyword theo độ dài câu hỏi.\n")
        f.write("- Confidence thresholding ngăn trả về kết quả không liên quan.\n")
        f.write("\n### 3.2 Hạn chế và Đề xuất\n")
        if avg_ndcg < 0.70:
            f.write("- NDCG@5 chưa đạt mục tiêu → Cần bổ sung thêm trường `description`/`category` vào văn bản nhúng.\n")
        if avg_mrr < 0.60:
            f.write("- MRR thấp → Kết quả quan trọng nhất chưa được xếp ở đầu → Cân chỉnh lại trọng số semantic_w.\n")
        if noise_accuracy < 80:
            f.write("- Noise rejection chưa tốt → Cần tăng ngưỡng confidence hoặc thêm bộ lọc intent.\n")
        f.write("- Nên theo dõi Click-through Rate (CTR) trong thực tế để đánh giá bổ sung hành vi người dùng.\n")

    print("=" * 60)
    print("🎉 ĐÁNH GIÁ HOÀN TẤT!")
    print(f"   NDCG@5: {avg_ndcg:.4f}  |  MRR: {avg_mrr:.4f}  |  P@3: {avg_prec:.4f}")
    print(f"   Judge Relevance: {avg_judge_rel:.2f}/5  |  Ranking: {avg_judge_rank:.2f}/5")
    print(f"👉 Báo cáo: {report_path}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_search_evaluation())