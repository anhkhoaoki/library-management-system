"""
AI Evaluation Framework — AI-as-Judge
Đánh giá 3 tính năng AI:
  1. Chatbot RAG (100 test cases)
  2. Semantic Search (100 test cases)
  3. Book Recommendations (100 test cases)

Chiến lược: Dùng Gemini làm giám khảo (LLM-as-a-Judge) chấm điểm kết quả.
"""

import os
import sys
import json
import asyncio
import time
import re
import httpx
from typing import List, Dict, Any, Optional
from pathlib import Path

# ─── Cấu hình encoding UTF-8 cho Windows ─────────────────────────
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Gemini client (nhẹ, không kéo SentenceTransformer)
from app.core.config import settings
from app.services.chat_service import _google_client, MODEL, BASE_SYSTEM_PROMPT
from google.genai import types as genai_types

# RAG imports — lazy (chỉ load khi chạy module chatbot)
_rag_initialized = False
initialize_rag = None
retrieve_context = None

def _load_rag_modules():
    """Lazy-load ChromaDB + SentenceTransformer chỉ khi cần."""
    global initialize_rag, retrieve_context, _rag_initialized
    if _rag_initialized:
        return
    print("[Init] Đang load SentenceTransformer + ChromaDB (lần đầu mất ~30s)...")
    from app.services.rag_service import initialize_rag as _ir, retrieve_context as _rc
    initialize_rag = _ir
    retrieve_context = _rc
    _rag_initialized = True
    print("[Init] Load xong.")

# ─── Cấu hình ────────────────────────────────────────────────────
EVAL_DIR = Path(__file__).parent / "eval_data"
REPORT_DIR = Path(__file__).parent / "eval_reports"
REPORT_DIR.mkdir(exist_ok=True)

AI_SERVICE_URL = "http://localhost:8000"   # FastAPI AI service
BACKEND_URL    = "http://localhost:3000"   # Node.js backend (nếu cần)

# Free tier Gemini: 15 RPM. Mỗi test case dùng 2 calls (sinh response + judge)
# → Cần ít nhất 8s mỗi case để không vượt quota
RATE_LIMIT_DELAY = 8.0   # giây chờ sau mỗi test case
MAX_RETRY = 3            # số lần retry khi gặp 429

# ─── JUDGE PROMPTS ───────────────────────────────────────────────

CHATBOT_JUDGE_PROMPT = """Bạn là giám khảo AI chấm điểm chatbot thư viện "Thư Bé".
Đánh giá câu trả lời theo 3 tiêu chí (thang 1-5):

1. faithfulness: Câu trả lời CHỈ dùng thông tin từ [Ngữ cảnh], không bịa đặt.
   - 5: Hoàn toàn trung thực, không có thông tin bịa
   - 3: Có một số suy luận ngoài ngữ cảnh
   - 1: Bịa đặt nhiều thông tin

2. relevancy: Câu trả lời giải đáp đúng câu hỏi, không lan man.
   - 5: Trả lời đúng trọng tâm, súc tích
   - 3: Trả lời một phần câu hỏi
   - 1: Lạc đề hoàn toàn

3. correctness: Nội dung khớp với [Ground Truth].
   - 5: Khớp hoàn toàn về ý nghĩa
   - 3: Khớp một phần
   - 1: Sai lệch nghiêm trọng

ĐẶC BIỆT: Nếu câu hỏi ngoài phạm vi thư viện và chatbot từ chối lịch sự → cho điểm 5/5/5.

Trả về JSON thuần túy (không có ```json):
{"faithfulness": <1-5>, "relevancy": <1-5>, "correctness": <1-5>, "reason": "<tóm tắt ngắn tiếng Việt, tối đa 20 từ>"}"""

SEARCH_JUDGE_PROMPT = """Bạn là giám khảo AI đánh giá kết quả tìm kiếm ngữ nghĩa sách thư viện.

Đánh giá theo 3 tiêu chí (thang 1-5):

1. semantic_match: Kết quả có khớp về mặt ngữ nghĩa với truy vấn không?
   - 5: Tất cả kết quả đều liên quan chặt chẽ với chủ đề truy vấn
   - 3: Một số kết quả liên quan
   - 1: Kết quả không liên quan hoặc rỗng (trừ truy vấn không liên quan đến thư viện)

2. diversity: Kết quả có đa dạng trong cùng chủ đề không?
   - 5: Đề xuất nhiều góc tiếp cận khác nhau trong cùng lĩnh vực
   - 3: Kết quả tương đối đa dạng
   - 1: Tất cả kết quả giống nhau

3. intent_alignment: Kết quả có phản ánh đúng ý định tìm kiếm không?
   - 5: Hiểu đúng intent (VD: "học cơ bản" → sách nhập môn, không phải sách nâng cao)
   - 3: Hiểu một phần intent
   - 1: Hiểu sai intent hoàn toàn

LƯU Ý: Truy vấn không liên quan sách thư viện (VD: "nấu ăn", "bóng đá") → nếu trả về ít/không kết quả là ĐÚNG, cho điểm 5.

Trả về JSON thuần túy (không có ```json):
{"semantic_match": <1-5>, "diversity": <1-5>, "intent_alignment": <1-5>, "reason": "<tóm tắt ngắn tiếng Việt, tối đa 20 từ>"}"""

RECOMMEND_JUDGE_PROMPT = """Bạn là giám khảo AI đánh giá hệ thống gợi ý sách thư viện.

Đánh giá theo 3 tiêu chí (thang 1-5):

1. relevance: Sách gợi ý có liên quan đến sở thích/lịch sử mượn của người dùng không?
   - 5: Tất cả sách gợi ý đều phù hợp với profile người dùng
   - 3: Một số sách phù hợp
   - 1: Gợi ý hoàn toàn không liên quan

2. novelty: Sách gợi ý có mới (không trùng với sách đã mượn) không?
   - 5: Tất cả sách gợi ý đều chưa mượn
   - 3: Hầu hết là sách mới
   - 1: Toàn sách đã mượn

3. serendipity: Có gợi ý một số sách thú vị ngoài vùng tiêu dùng thông thường không?
   - 5: Có gợi ý sách liên quan nhưng theo hướng mới lạ
   - 3: Gợi ý cơ bản đúng nhưng không bất ngờ
   - 1: Gợi ý hoàn toàn dự đoán được, không có giá trị khám phá

LƯU Ý COLD START: Nếu user chưa có lịch sử (borrowedCategories rỗng) và hệ thống trả về sách phổ biến → cho điểm 4/5/3 (hợp lý cho cold start).

Trả về JSON thuần túy (không có ```json):
{"relevance": <1-5>, "novelty": <1-5>, "serendipity": <1-5>, "reason": "<tóm tắt ngắn tiếng Việt, tối đa 20 từ>"}"""


# ─── HELPER: Gọi Judge LLM (có retry khi 429) ───────────────────
def call_judge(system_prompt: str, user_content: str) -> Dict[str, Any]:
    """Gọi Gemini làm giám khảo. Tự retry khi gặp 429 rate limit."""
    for attempt in range(1, MAX_RETRY + 1):
        try:
            response = _google_client.models.generate_content(
                model=MODEL,
                contents=user_content,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.0,
                    max_output_tokens=256,
                ),
            )
            raw = response.text.strip() if response.text else ""
            raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
            return json.loads(raw)
        except Exception as e:
            err_str = str(e)
            # Kiểm tra lỗi 429 và lấy retryDelay từ message
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                # Tìm retryDelay (VD: "retry in 37.1s")
                m = re.search(r"retry in ([0-9.]+)s", err_str, re.IGNORECASE)
                wait_sec = float(m.group(1)) + 5 if m else 60
                print(f"    [Rate Limit 429] Chờ {wait_sec:.0f}s rồi retry ({attempt}/{MAX_RETRY})...")
                time.sleep(wait_sec)
                continue   # thử lại
            # Lỗi khác → trả về ngay
            print(f"    [Judge Error] {e}")
            return {"error": err_str}
    # Hết retry
    print(f"    [Judge Error] Đã thử {MAX_RETRY} lần, bỏ qua case này.")
    return {"error": "max_retry_exceeded"}


# ═══════════════════════════════════════════════════════════════════
# MODULE 1: ĐÁNH GIÁ CHATBOT RAG
# ═══════════════════════════════════════════════════════════════════
async def evaluate_chatbot(test_cases: List[Dict]) -> Dict:
    """Chạy 100 test case chatbot, dùng Gemini judge chấm điểm."""
    print("\n" + "═" * 60)
    print("  MODULE 1: ĐÁNH GIÁ CHATBOT (RAG)")
    print("═" * 60)

    # Lazy-load RAG (SentenceTransformer + ChromaDB)
    _load_rag_modules()
    print("[Init] Nạp ChromaDB RAG...")
    initialize_rag()
    print("[Init] RAG ready.\n")

    results = []
    faithfulness_scores, relevancy_scores, correctness_scores = [], [], []
    context_found_count = 0

    total = len(test_cases)
    for i, case in enumerate(test_cases, 1):
        qid = case["id"]
        query = case["query"]
        ground_truth = case.get("ground_truth", "")
        category = case.get("category", "")

        print(f"  [{i:3d}/{total}] {category} | {query[:60]}...")

        # ── Bước 1: Lấy context từ RAG ──
        context = retrieve_context(query, top_k=3)
        has_context = len(context.strip()) > 0
        if has_context:
            context_found_count += 1

        # ── Bước 2: Sinh câu trả lời ──
        if has_context:
            prompt = f"""{BASE_SYSTEM_PROMPT}

Thông tin ngữ cảnh từ nội quy thư viện:
---
{context}
---

Câu hỏi: {query}
Trả lời:"""
        else:
            prompt = f"""{BASE_SYSTEM_PROMPT}

Câu hỏi: {query}
Lưu ý: Không tìm thấy thông tin liên quan trong nội quy thư viện.
Trả lời:"""

        try:
            resp = _google_client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={"temperature": 0.3, "max_output_tokens": 512},
            )
            bot_reply = resp.text.strip() if resp.text else "Không có câu trả lời."
        except Exception as e:
            bot_reply = f"[Error] {e}"

        # ── Bước 3: Judge chấm điểm ──
        judge_input = f"""[Câu hỏi]: {query}

[Ngữ cảnh RAG]:
{context if context else "(Không có ngữ cảnh)"}

[Câu trả lời của chatbot]:
{bot_reply}

[Ground Truth]:
{ground_truth}"""

        scores = call_judge(CHATBOT_JUDGE_PROMPT, judge_input)
        await asyncio.sleep(RATE_LIMIT_DELAY)

        faith = scores.get("faithfulness", 1)
        relev = scores.get("relevancy", 1)
        corr  = scores.get("correctness", 1)
        reason = scores.get("reason", "")

        if isinstance(faith, int):
            faithfulness_scores.append(faith)
            relevancy_scores.append(relev)
            correctness_scores.append(corr)

        avg_score = (faith + relev + corr) / 3 if isinstance(faith, int) else 0
        status = "✅" if avg_score >= 3.5 else "⚠️" if avg_score >= 2.5 else "❌"
        print(f"         {status} F={faith} R={relev} C={corr} | {reason}")

        results.append({
            "id": qid,
            "category": category,
            "query": query,
            "context_found": has_context,
            "bot_reply": bot_reply[:200].replace("\n", " "),
            "ground_truth": ground_truth[:200],
            "faithfulness": faith,
            "relevancy": relev,
            "correctness": corr,
            "reason": reason,
            "avg_score": round(avg_score, 2),
        })

    # ── Tổng hợp ──
    n = len(faithfulness_scores)
    avg_f = sum(faithfulness_scores) / n if n else 0
    avg_r = sum(relevancy_scores) / n if n else 0
    avg_c = sum(correctness_scores) / n if n else 0
    rag_rate = context_found_count / total * 100
    pass_count = sum(1 for r in results if isinstance(r["avg_score"], float) and r["avg_score"] >= 3.5)

    summary = {
        "module": "Chatbot RAG",
        "total": total,
        "context_retrieval_rate": round(rag_rate, 1),
        "pass_count": pass_count,
        "pass_rate": round(pass_count / total * 100, 1),
        "avg_faithfulness": round(avg_f, 2),
        "avg_relevancy": round(avg_r, 2),
        "avg_correctness": round(avg_c, 2),
        "overall_avg": round((avg_f + avg_r + avg_c) / 3, 2),
        "results": results,
    }

    print(f"\n  ✔ Chatbot: Pass={pass_count}/{total} | F={avg_f:.2f} R={avg_r:.2f} C={avg_c:.2f} | RAG Rate={rag_rate:.1f}%")
    return summary


# ═══════════════════════════════════════════════════════════════════
# MODULE 2: ĐÁNH GIÁ TÌM KIẾM NGỮ NGHĨA
# ═══════════════════════════════════════════════════════════════════
async def evaluate_search(test_cases: List[Dict]) -> Dict:
    """Chạy 100 test case semantic search, gọi AI service thật."""
    print("\n" + "═" * 60)
    print("  MODULE 2: ĐÁNH GIÁ TÌM KIẾM NGỮ NGHĨA")
    print("═" * 60)

    results = []
    sem_scores, div_scores, intent_scores = [], [], []

    total = len(test_cases)
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, case in enumerate(test_cases, 1):
            qid = case["id"]
            query = case["query"]
            category = case.get("category", "")
            expected_topics = case.get("expected_topics", [])
            should_empty = case.get("should_return_empty", False)

            print(f"  [{i:3d}/{total}] {category} | {query[:60]}...")

            # ── Bước 1: Gọi semantic search API ──
            search_results = []
            api_error = None
            try:
                resp = await client.post(
                    f"{AI_SERVICE_URL}/search/semantic",
                    json={"query": query, "limit": 10},
                )
                data = resp.json()
                search_results = data.get("results", [])
            except Exception as e:
                api_error = str(e)
                print(f"         [API Error] {e}")

            # ── Bước 2: Chuẩn bị nội dung cho Judge ──
            if search_results:
                results_summary = "\n".join([
                    f"  {j+1}. '{r.get('title', '?')}' - {r.get('authorNames', ['?'])} | Category: {r.get('categoryName', '?')} | Score: {r.get('score', 0):.3f}"
                    for j, r in enumerate(search_results[:8])
                ])
            else:
                results_summary = "(Không có kết quả)"

            judge_input = f"""[Truy vấn tìm kiếm]: {query}
[Chủ đề mong đợi]: {', '.join(expected_topics) if expected_topics else 'Truy vấn không liên quan'}
[Nên trả về rỗng]: {'Có' if should_empty else 'Không'}

[Kết quả hệ thống trả về ({len(search_results)} sách)]:
{results_summary}"""

            scores = call_judge(SEARCH_JUDGE_PROMPT, judge_input)
            await asyncio.sleep(RATE_LIMIT_DELAY)

            sem   = scores.get("semantic_match", 1)
            div   = scores.get("diversity", 1)
            intent = scores.get("intent_alignment", 1)
            reason = scores.get("reason", "")

            if isinstance(sem, int):
                sem_scores.append(sem)
                div_scores.append(div)
                intent_scores.append(intent)

            avg_score = (sem + div + intent) / 3 if isinstance(sem, int) else 0
            status = "✅" if avg_score >= 3.5 else "⚠️" if avg_score >= 2.5 else "❌"
            print(f"         {status} S={sem} D={div} I={intent} | {len(search_results)} kq | {reason}")

            results.append({
                "id": qid,
                "category": category,
                "query": query,
                "result_count": len(search_results),
                "top_titles": [r.get("title", "?") for r in search_results[:3]],
                "semantic_match": sem,
                "diversity": div,
                "intent_alignment": intent,
                "reason": reason,
                "avg_score": round(avg_score, 2),
                "api_error": api_error,
            })

    n = len(sem_scores)
    avg_s = sum(sem_scores) / n if n else 0
    avg_d = sum(div_scores) / n if n else 0
    avg_i = sum(intent_scores) / n if n else 0
    pass_count = sum(1 for r in results if isinstance(r["avg_score"], float) and r["avg_score"] >= 3.5)

    summary = {
        "module": "Semantic Search",
        "total": total,
        "pass_count": pass_count,
        "pass_rate": round(pass_count / total * 100, 1),
        "avg_semantic_match": round(avg_s, 2),
        "avg_diversity": round(avg_d, 2),
        "avg_intent_alignment": round(avg_i, 2),
        "overall_avg": round((avg_s + avg_d + avg_i) / 3, 2),
        "results": results,
    }

    print(f"\n  ✔ Search: Pass={pass_count}/{total} | S={avg_s:.2f} D={avg_d:.2f} I={avg_i:.2f}")
    return summary


# ═══════════════════════════════════════════════════════════════════
# MODULE 3: ĐÁNH GIÁ HỆ THỐNG GỢI Ý SÁCH
# ═══════════════════════════════════════════════════════════════════
async def evaluate_recommendations(test_cases: List[Dict]) -> Dict:
    """Chạy 100 test case recommendation, dùng mock profile gọi AI service."""
    print("\n" + "═" * 60)
    print("  MODULE 3: ĐÁNH GIÁ GỢI Ý SÁCH")
    print("═" * 60)

    results = []
    rel_scores, nov_scores, ser_scores = [], [], []

    total = len(test_cases)
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, case in enumerate(test_cases, 1):
            qid = case["id"]
            category = case.get("category", "")
            profile = case.get("profile", {})
            expected_categories = case.get("expected_relevant_categories", [])
            description = case.get("description", "")

            borrowed_titles = profile.get("borrowedTitles", [])
            borrowed_categories = profile.get("borrowedCategories", [])
            ratings = profile.get("ratings", [])

            print(f"  [{i:3d}/{total}] {category} | {description[:60]}...")

            # ── Bước 1: Gọi recommendation AI service ──
            rec_results = []
            api_error = None
            try:
                resp = await client.post(
                    f"{AI_SERVICE_URL}/recommend/personalized",
                    json={
                        "userId": f"eval_user_{qid}",
                        "borrowedBookIds": [f"mock_book_{j}" for j in range(len(borrowed_titles))],
                        "ratings": [{"bookId": f"mock_{j}", "rating": r.get("rating", 3)} for j, r in enumerate(ratings)],
                        "similarUsersBorrows": [],
                        "limit": 8,
                        "_eval_borrowed_titles": borrowed_titles,      # Hint cho judge
                        "_eval_borrowed_categories": borrowed_categories,
                    },
                    timeout=20.0,
                )
                data = resp.json()
                rec_results = data.get("recommendations", [])
            except Exception as e:
                api_error = str(e)
                print(f"         [API Error] {e}")

            # ── Bước 2: Judge chấm điểm ──
            if rec_results:
                recs_summary = "\n".join([
                    f"  {j+1}. '{r.get('title', '?')}' | Category: {r.get('categoryName', '?')} | Reason: {r.get('reasonLabel', '?')}"
                    for j, r in enumerate(rec_results[:8])
                ])
            else:
                recs_summary = "(Không có gợi ý)"

            judge_input = f"""[Mô tả user]: {description}
[Lịch sử mượn]: {', '.join(borrowed_titles) if borrowed_titles else '(Chưa có)'}
[Thể loại yêu thích]: {', '.join(borrowed_categories) if borrowed_categories else '(Chưa có)'}
[Ratings]: {json.dumps(ratings) if ratings else '(Chưa có)'}
[Thể loại gợi ý kỳ vọng]: {', '.join(expected_categories)}

[Sách được hệ thống gợi ý ({len(rec_results)} cuốn)]:
{recs_summary}"""

            scores = call_judge(RECOMMEND_JUDGE_PROMPT, judge_input)
            await asyncio.sleep(RATE_LIMIT_DELAY)

            rel = scores.get("relevance", 1)
            nov = scores.get("novelty", 1)
            ser = scores.get("serendipity", 1)
            reason = scores.get("reason", "")

            if isinstance(rel, int):
                rel_scores.append(rel)
                nov_scores.append(nov)
                ser_scores.append(ser)

            avg_score = (rel + nov + ser) / 3 if isinstance(rel, int) else 0
            status = "✅" if avg_score >= 3.5 else "⚠️" if avg_score >= 2.5 else "❌"
            print(f"         {status} R={rel} N={nov} S={ser} | {len(rec_results)} gợi ý | {reason}")

            results.append({
                "id": qid,
                "category": category,
                "description": description,
                "borrowed_titles": borrowed_titles[:3],
                "rec_count": len(rec_results),
                "top_recs": [r.get("title", "?") for r in rec_results[:3]],
                "relevance": rel,
                "novelty": nov,
                "serendipity": ser,
                "reason": reason,
                "avg_score": round(avg_score, 2),
                "api_error": api_error,
            })

    n = len(rel_scores)
    avg_r = sum(rel_scores) / n if n else 0
    avg_n = sum(nov_scores) / n if n else 0
    avg_s = sum(ser_scores) / n if n else 0
    pass_count = sum(1 for r in results if isinstance(r["avg_score"], float) and r["avg_score"] >= 3.5)

    summary = {
        "module": "Recommendations",
        "total": total,
        "pass_count": pass_count,
        "pass_rate": round(pass_count / total * 100, 1),
        "avg_relevance": round(avg_r, 2),
        "avg_novelty": round(avg_n, 2),
        "avg_serendipity": round(avg_s, 2),
        "overall_avg": round((avg_r + avg_n + avg_s) / 3, 2),
        "results": results,
    }

    print(f"\n  ✔ Recommend: Pass={pass_count}/{total} | R={avg_r:.2f} N={avg_n:.2f} S={avg_s:.2f}")
    return summary


# ═══════════════════════════════════════════════════════════════════
# XUẤT BÁO CÁO MARKDOWN
# ═══════════════════════════════════════════════════════════════════
def generate_report(chatbot: Dict, search: Dict, recommend: Dict, elapsed: float):
    """Tạo báo cáo tổng hợp Markdown cho cả 3 module."""
    report_path = REPORT_DIR / f"ai_evaluation_report_{time.strftime('%Y%m%d_%H%M%S')}.md"

    def rating_label(score: float) -> str:
        if score >= 4.5: return "🟢 Rất tốt"
        if score >= 3.5: return "🟡 Tốt"
        if score >= 2.5: return "🟠 Trung bình"
        return "🔴 Cần cải thiện"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# BÁO CÁO ĐÁNH GIÁ TOÀN DIỆN CÁC TÍNH NĂNG AI (AI-as-Judge)\n\n")
        f.write(f"**Ngày thực hiện:** {time.strftime('%d/%m/%Y %H:%M:%S')}\n")
        f.write(f"**Mô hình đánh giá (Judge):** `{MODEL}`\n")
        f.write(f"**Tổng số test case:** 300 (100 × 3 tính năng)\n")
        f.write(f"**Thời gian chạy:** {elapsed/60:.1f} phút\n\n")

        # ── Bảng tóm tắt tổng thể ──
        f.write("---\n\n## TỔNG QUAN KẾT QUẢ\n\n")
        f.write("| Tính năng | Tổng TC | Đạt | Tỷ lệ đạt | Điểm TB | Đánh giá |\n")
        f.write("|-----------|---------|-----|-----------|---------|----------|\n")
        f.write(f"| **Chatbot RAG** | {chatbot['total']} | {chatbot['pass_count']} | {chatbot['pass_rate']}% | {chatbot['overall_avg']:.2f}/5.0 | {rating_label(chatbot['overall_avg'])} |\n")
        f.write(f"| **Tìm kiếm ngữ nghĩa** | {search['total']} | {search['pass_count']} | {search['pass_rate']}% | {search['overall_avg']:.2f}/5.0 | {rating_label(search['overall_avg'])} |\n")
        f.write(f"| **Gợi ý sách** | {recommend['total']} | {recommend['pass_count']} | {recommend['pass_rate']}% | {recommend['overall_avg']:.2f}/5.0 | {rating_label(recommend['overall_avg'])} |\n")

        total_pass = chatbot["pass_count"] + search["pass_count"] + recommend["pass_count"]
        overall_avg = (chatbot["overall_avg"] + search["overall_avg"] + recommend["overall_avg"]) / 3
        f.write(f"| **TỔNG CỘNG** | **300** | **{total_pass}** | **{total_pass/3:.1f}%** | **{overall_avg:.2f}/5.0** | **{rating_label(overall_avg)}** |\n\n")

        # ════ MODULE 1: CHATBOT ════
        f.write("---\n\n## MODULE 1: CHATBOT RAG — Giải đáp nội quy thư viện\n\n")
        f.write("### Chỉ số đánh giá\n\n")
        f.write("| Chỉ số | Điểm TB | Mục tiêu | Trạng thái |\n")
        f.write("|--------|---------|----------|------------|\n")
        f.write(f"| RAG Context Retrieval Rate | {chatbot['context_retrieval_rate']}% | ≥ 80% | {'✅' if chatbot['context_retrieval_rate'] >= 80 else '❌'} |\n")
        f.write(f"| Faithfulness (Độ trung thực) | {chatbot['avg_faithfulness']:.2f}/5.0 | ≥ 4.0 | {'✅' if chatbot['avg_faithfulness'] >= 4.0 else '❌'} |\n")
        f.write(f"| Answer Relevancy (Độ liên quan) | {chatbot['avg_relevancy']:.2f}/5.0 | ≥ 4.0 | {'✅' if chatbot['avg_relevancy'] >= 4.0 else '❌'} |\n")
        f.write(f"| Semantic Correctness (Độ chính xác) | {chatbot['avg_correctness']:.2f}/5.0 | ≥ 3.5 | {'✅' if chatbot['avg_correctness'] >= 3.5 else '❌'} |\n\n")

        f.write("### Kết quả chi tiết (100 test cases)\n\n")
        f.write("| ID | Danh mục | Câu hỏi | F | R | C | TB | Nhận xét |\n")
        f.write("|----|----------|---------|---|---|---|----|----------|\n")
        for r in chatbot["results"]:
            q = r["query"][:50] + ("..." if len(r["query"]) > 50 else "")
            f.write(f"| {r['id']} | {r['category']} | {q} | {r['faithfulness']} | {r['relevancy']} | {r['correctness']} | {r['avg_score']} | {r['reason']} |\n")

        # ════ MODULE 2: SEARCH ════
        f.write("\n---\n\n## MODULE 2: TÌM KIẾM NGỮ NGHĨA (Semantic Search)\n\n")
        f.write("### Chỉ số đánh giá\n\n")
        f.write("| Chỉ số | Điểm TB | Mục tiêu | Trạng thái |\n")
        f.write("|--------|---------|----------|------------|\n")
        f.write(f"| Semantic Match (Độ khớp ngữ nghĩa) | {search['avg_semantic_match']:.2f}/5.0 | ≥ 3.5 | {'✅' if search['avg_semantic_match'] >= 3.5 else '❌'} |\n")
        f.write(f"| Diversity (Độ đa dạng) | {search['avg_diversity']:.2f}/5.0 | ≥ 3.0 | {'✅' if search['avg_diversity'] >= 3.0 else '❌'} |\n")
        f.write(f"| Intent Alignment (Đúng ý định) | {search['avg_intent_alignment']:.2f}/5.0 | ≥ 3.5 | {'✅' if search['avg_intent_alignment'] >= 3.5 else '❌'} |\n\n")

        f.write("### Kết quả chi tiết (100 test cases)\n\n")
        f.write("| ID | Danh mục | Truy vấn | Số KQ | S | D | I | TB | Nhận xét |\n")
        f.write("|----|----------|----------|-------|---|---|---|----|----------|\n")
        for r in search["results"]:
            q = r["query"][:45] + ("..." if len(r["query"]) > 45 else "")
            f.write(f"| {r['id']} | {r['category']} | {q} | {r['result_count']} | {r['semantic_match']} | {r['diversity']} | {r['intent_alignment']} | {r['avg_score']} | {r['reason']} |\n")

        # ════ MODULE 3: RECOMMENDATIONS ════
        f.write("\n---\n\n## MODULE 3: GỢI Ý SÁCH CÁ NHÂN HÓA\n\n")
        f.write("### Chỉ số đánh giá\n\n")
        f.write("| Chỉ số | Điểm TB | Mục tiêu | Trạng thái |\n")
        f.write("|--------|---------|----------|------------|\n")
        f.write(f"| Relevance (Độ liên quan) | {recommend['avg_relevance']:.2f}/5.0 | ≥ 3.5 | {'✅' if recommend['avg_relevance'] >= 3.5 else '❌'} |\n")
        f.write(f"| Novelty (Độ mới) | {recommend['avg_novelty']:.2f}/5.0 | ≥ 3.5 | {'✅' if recommend['avg_novelty'] >= 3.5 else '❌'} |\n")
        f.write(f"| Serendipity (Khám phá) | {recommend['avg_serendipity']:.2f}/5.0 | ≥ 3.0 | {'✅' if recommend['avg_serendipity'] >= 3.0 else '❌'} |\n\n")

        f.write("### Kết quả chi tiết (100 test cases)\n\n")
        f.write("| ID | Danh mục | Mô tả profile | Số gợi ý | R | N | S | TB | Nhận xét |\n")
        f.write("|----|----------|---------------|----------|---|---|---|----|----------|\n")
        for r in recommend["results"]:
            desc = r["description"][:45] + ("..." if len(r["description"]) > 45 else "")
            f.write(f"| {r['id']} | {r['category']} | {desc} | {r['rec_count']} | {r['relevance']} | {r['novelty']} | {r['serendipity']} | {r['avg_score']} | {r['reason']} |\n")

        # ── Nhận xét tổng thể ──
        f.write("\n---\n\n## PHÂN TÍCH VÀ KẾT LUẬN\n\n")
        f.write("### Điểm mạnh\n")
        if chatbot["avg_faithfulness"] >= 4.0:
            f.write("- **Chatbot**: Độ trung thực cao, hầu như không có hiện tượng ảo giác (hallucination).\n")
        if search["avg_semantic_match"] >= 3.5:
            f.write("- **Tìm kiếm**: Hiểu đúng ngữ nghĩa truy vấn, kể cả truy vấn tự nhiên dài.\n")
        if recommend["avg_relevance"] >= 3.5:
            f.write("- **Gợi ý**: Phản ánh đúng sở thích người dùng dựa trên lịch sử mượn.\n")

        f.write("\n### Điểm cần cải thiện\n")
        if chatbot["avg_correctness"] < 3.5:
            f.write("- **Chatbot**: Một số câu trả lời chưa khớp hoàn toàn với ground truth.\n")
        if search["avg_diversity"] < 3.0:
            f.write("- **Tìm kiếm**: Kết quả còn thiếu đa dạng trong một số chủ đề.\n")
        if recommend["avg_serendipity"] < 3.0:
            f.write("- **Gợi ý**: Chưa có nhiều gợi ý bất ngờ, cần cải thiện serendipity.\n")
        f.write("- Cần tích hợp thêm sách thực tế vào vector database để nâng cao chất lượng tìm kiếm và gợi ý.\n")

        f.write("\n### Hướng phát triển\n")
        f.write("1. **Chatbot**: Bổ sung thêm tài liệu FAQ, tăng chunk overlap để cải thiện retrieval.\n")
        f.write("2. **Tìm kiếm**: Fine-tune embedding model với tập ngữ liệu thư viện Việt Nam.\n")
        f.write("3. **Gợi ý**: Thu thập thêm dữ liệu rating thực từ người dùng để cải thiện collaborative filtering.\n")

    # Lưu JSON thô
    json_path = REPORT_DIR / f"raw_results_{time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"chatbot": chatbot, "search": search, "recommend": recommend}, f, ensure_ascii=False, indent=2)

    return report_path, json_path


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════
async def main():
    print("=" * 60)
    print("   HỆ THỐNG ĐÁNH GIÁ AI TOÀN DIỆN (AI-as-Judge)")
    print("   300 Test Cases — Chatbot | Search | Recommendations")
    print("=" * 60)

    start_time = time.time()

    # Tải test cases
    def load(filename: str) -> List[Dict]:
        path = EVAL_DIR / filename
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    chatbot_cases  = load("chatbot_test_cases.json")
    search_cases   = load("search_test_cases.json")
    recommend_cases = load("recommendation_test_cases.json")

    print(f"\n[Load] ✅ Chatbot: {len(chatbot_cases)} cases")
    print(f"[Load] ✅ Search:  {len(search_cases)} cases")
    print(f"[Load] ✅ Recommend: {len(recommend_cases)} cases")

    # Chọn module để chạy
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", choices=["all", "chatbot", "search", "recommend"], default="all")
    parser.add_argument("--limit", type=int, default=0, help="Giới hạn số test case mỗi module (0=tất cả)")
    args, _ = parser.parse_known_args()

    if args.limit > 0:
        chatbot_cases  = chatbot_cases[:args.limit]
        search_cases   = search_cases[:args.limit]
        recommend_cases = recommend_cases[:args.limit]
        print(f"\n[Config] Chạy {args.limit} test case mỗi module (chế độ demo)\n")

    # Chạy đánh giá
    chatbot_result   = {"module": "Chatbot RAG", "total": 0, "pass_count": 0, "pass_rate": 0, "overall_avg": 0, "context_retrieval_rate": 0, "avg_faithfulness": 0, "avg_relevancy": 0, "avg_correctness": 0, "results": []}
    search_result    = {"module": "Semantic Search", "total": 0, "pass_count": 0, "pass_rate": 0, "overall_avg": 0, "avg_semantic_match": 0, "avg_diversity": 0, "avg_intent_alignment": 0, "results": []}
    recommend_result = {"module": "Recommendations", "total": 0, "pass_count": 0, "pass_rate": 0, "overall_avg": 0, "avg_relevance": 0, "avg_novelty": 0, "avg_serendipity": 0, "results": []}

    if args.module in ("all", "chatbot"):
        chatbot_result = await evaluate_chatbot(chatbot_cases)
    if args.module in ("all", "search"):
        search_result = await evaluate_search(search_cases)
    if args.module in ("all", "recommend"):
        recommend_result = await evaluate_recommendations(recommend_cases)

    elapsed = time.time() - start_time

    # Xuất báo cáo
    report_path, json_path = generate_report(chatbot_result, search_result, recommend_result, elapsed)

    print("\n" + "=" * 60)
    print("🎉 ĐÁNH GIÁ HOÀN TẤT!")
    print(f"   Thời gian: {elapsed/60:.1f} phút")
    print(f"📄 Báo cáo Markdown: {report_path}")
    print(f"📊 Dữ liệu JSON thô: {json_path}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
