"""
recommendation_service.py
══════════════════════════════════════════════════════════════════
UC-AI-03: Personalized Book Recommendation Engine

Thuật toán kết hợp 3 chiến lược:
  1. Content-Based Filtering   — Cosine similarity trên vector embedding
  2. Collaborative Filtering   — User-User overlap scoring
  3. Cold Start                — Sách phổ biến (fallback)

Không cần huấn luyện model riêng — tận dụng lại embedding cache
đã được xây dựng sẵn trong search_service.
══════════════════════════════════════════════════════════════════
"""

import math
from typing import List, Dict, Any, Optional


# ── Helpers ────────────────────────────────────────────────────────

def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Tính cosine similarity giữa 2 vector."""
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _average_vector(vectors: List[List[float]]) -> List[float]:
    """Tính vector trung bình từ danh sách vectors (user profile vector)."""
    if not vectors:
        return []
    dim = len(vectors[0])
    avg = [0.0] * dim
    for vec in vectors:
        for i, v in enumerate(vec):
            avg[i] += v
    n = len(vectors)
    return [x / n for x in avg]


# ── Content-Based Filtering ────────────────────────────────────────

def content_based_recommendations(
    borrowed_book_ids: List[str],
    book_embeddings_cache: List[Dict],
    top_k: int = 20,
) -> List[Dict]:
    """
    Tìm sách tương tự dựa trên embedding của sách đã mượn.

    1. Lấy embedding của tất cả sách đã mượn → tính "user profile vector" (trung bình)
    2. Tính cosine similarity giữa profile vector và mỗi sách chưa mượn trong catalog
    3. Sắp xếp theo điểm giảm dần

    Args:
        borrowed_book_ids: Danh sách ID sách đã mượn
        book_embeddings_cache: Cache embedding đầy đủ từ search module
        top_k: Số kết quả tối đa trả về

    Returns:
        Danh sách dict gồm book info + content_score + reason
    """
    if not borrowed_book_ids or not book_embeddings_cache:
        return []

    borrowed_set = set(borrowed_book_ids)

    # Lấy embedding của những sách đã mượn (còn trong cache)
    borrowed_embeddings = [
        book["embedding"]
        for book in book_embeddings_cache
        if book.get("id") in borrowed_set and book.get("embedding")
    ]

    if not borrowed_embeddings:
        return []

    # Profile vector = trung bình các embedding sách đã mượn
    profile_vector = _average_vector(borrowed_embeddings)

    # Tính similarity với các sách CHƯA mượn
    scores = []
    for book in book_embeddings_cache:
        if book.get("id") in borrowed_set:
            continue
        if not book.get("embedding"):
            continue

        sim = _cosine_similarity(profile_vector, book["embedding"])
        if sim > 0.1:  # ngưỡng tối thiểu
            scores.append({
                "id": book["id"],
                "title": book["title"],
                "authorNames": book.get("authorNames", []),
                "coverImageUrl": book.get("coverImageUrl", ""),
                "summary": book.get("summary", ""),
                "categoryName": book.get("categoryName", ""),
                "availableCopies": book.get("availableCopies", 0),
                "averageRating": book.get("averageRating", 0),
                "content_score": round(sim, 4),
                "reason": "content_based",
                "reasonLabel": "Phù hợp sở thích của bạn",
            })

    scores.sort(key=lambda x: x["content_score"], reverse=True)
    return scores[:top_k]


# ── Collaborative Filtering ────────────────────────────────────────

def collaborative_recommendations(
    borrowed_book_ids: List[str],
    similar_users_borrows: List[Dict],
    book_embeddings_cache: List[Dict],
    top_k: int = 20,
) -> List[Dict]:
    """
    Tìm sách được đọc bởi những người dùng có sở thích tương tự.

    similar_users_borrows format:
    [
        {"userId": "...", "borrowedBookIds": ["id1", "id2"], "overlap": 3},
        ...
    ]

    Score của mỗi sách = Σ (overlap_weight × frequency)
    - overlap_weight: số sách chung với user hiện tại (user càng tương tự → weight càng cao)
    - frequency: số lần sách xuất hiện trong danh sách của similar users

    Args:
        borrowed_book_ids: Sách đã mượn của user hiện tại (để loại trừ)
        similar_users_borrows: Danh sách user tương tự và sách họ đã mượn
        book_embeddings_cache: Để lấy metadata sách
        top_k: Số kết quả tối đa

    Returns:
        Danh sách sách được gợi ý qua collaborative filtering
    """
    if not similar_users_borrows or not book_embeddings_cache:
        return []

    borrowed_set = set(borrowed_book_ids)

    # Tính điểm collaborative cho mỗi sách
    book_collab_scores: Dict[str, float] = {}
    for user_data in similar_users_borrows:
        overlap = user_data.get("overlap", 1)
        weight = math.log2(overlap + 1)  # log để giảm ảnh hưởng của outlier

        for book_id in user_data.get("borrowedBookIds", []):
            if book_id in borrowed_set:
                continue  # bỏ qua sách đã mượn
            book_collab_scores[book_id] = book_collab_scores.get(book_id, 0) + weight

    if not book_collab_scores:
        return []

    # Map bookId → metadata từ cache
    cache_map = {book["id"]: book for book in book_embeddings_cache if book.get("id")}

    results = []
    max_score = max(book_collab_scores.values()) if book_collab_scores else 1

    for book_id, raw_score in sorted(book_collab_scores.items(), key=lambda x: -x[1]):
        book_meta = cache_map.get(book_id)
        if not book_meta:
            continue

        normalized_score = round(raw_score / max_score, 4)
        results.append({
            "id": book_id,
            "title": book_meta["title"],
            "authorNames": book_meta.get("authorNames", []),
            "coverImageUrl": book_meta.get("coverImageUrl", ""),
            "summary": book_meta.get("summary", ""),
            "categoryName": book_meta.get("categoryName", ""),
            "availableCopies": book_meta.get("availableCopies", 0),
            "averageRating": book_meta.get("averageRating", 0),
            "collab_score": normalized_score,
            "reason": "collaborative",
            "reasonLabel": "Người đọc tương tự bạn cũng thích",
        })

        if len(results) >= top_k:
            break

    return results


# ── Hybrid Merge ───────────────────────────────────────────────────

def hybrid_merge(
    content_results: List[Dict],
    collab_results: List[Dict],
    content_weight: float = 0.6,
    collab_weight: float = 0.4,
    final_k: int = 10,
) -> List[Dict]:
    """
    Kết hợp content-based và collaborative scores thành danh sách cuối cùng.

    Hybrid score = content_weight × content_score + collab_weight × collab_score
    Nếu chỉ có 1 nguồn → dùng trực tiếp không cần merge.

    Args:
        content_results: Kết quả content-based
        collab_results: Kết quả collaborative
        content_weight: Trọng số content-based (mặc định 0.6)
        collab_weight: Trọng số collaborative (mặc định 0.4)
        final_k: Số kết quả cuối cùng

    Returns:
        Danh sách sách được đề xuất đã merge và sắp xếp
    """
    # Index theo bookId để merge
    merged: Dict[str, Dict] = {}

    for book in content_results:
        bid = book["id"]
        merged[bid] = {**book, "hybrid_score": content_weight * book.get("content_score", 0)}

    for book in collab_results:
        bid = book["id"]
        if bid in merged:
            # Sách xuất hiện ở cả 2 nguồn → cộng điểm
            merged[bid]["hybrid_score"] += collab_weight * book.get("collab_score", 0)
            merged[bid]["collab_score"] = book.get("collab_score", 0)
            # Nếu collaborative score > content, ưu tiên label collaborative
            if book.get("collab_score", 0) > merged[bid].get("content_score", 0):
                merged[bid]["reason"] = "both"
                merged[bid]["reasonLabel"] = "Được nhiều bạn đọc tương tự yêu thích"
        else:
            merged[bid] = {**book, "hybrid_score": collab_weight * book.get("collab_score", 0)}

    # Sắp xếp theo hybrid_score giảm dần
    sorted_books = sorted(merged.values(), key=lambda x: x.get("hybrid_score", 0), reverse=True)

    # Làm sạch field nội bộ không cần thiết trả về frontend
    result = []
    for book in sorted_books[:final_k]:
        result.append({
            "id": book["id"],
            "title": book["title"],
            "authorNames": book.get("authorNames", []),
            "coverImageUrl": book.get("coverImageUrl", ""),
            "summary": book.get("summary", ""),
            "categoryName": book.get("categoryName", ""),
            "availableCopies": book.get("availableCopies", 0),
            "averageRating": book.get("averageRating", 0),
            "score": round(book.get("hybrid_score", 0), 4),
            "reason": book.get("reason", "content_based"),
            "reasonLabel": book.get("reasonLabel", "Phù hợp với bạn"),
        })

    return result


# ── Main entrypoint ────────────────────────────────────────────────

def get_personalized_recommendations(
    borrowed_book_ids: List[str],
    similar_users_borrows: List[Dict],
    book_embeddings_cache: List[Dict],
    limit: int = 8,
) -> Dict[str, Any]:
    """
    Entrypoint chính — orchestrate toàn bộ pipeline đề xuất.

    Returns:
        {
            "recommendations": [...],
            "reason": "hybrid" | "content_based" | "collaborative" | "cold_start",
            "message": "...",
        }
    """
    # Không có lịch sử → trả về cold start (handled by Node.js)
    if not borrowed_book_ids:
        return {
            "recommendations": [],
            "reason": "cold_start",
            "message": "Sách phổ biến tại thư viện",
        }

    # Chạy 2 thuật toán song song
    content_results = content_based_recommendations(
        borrowed_book_ids=borrowed_book_ids,
        book_embeddings_cache=book_embeddings_cache,
        top_k=20,
    )

    collab_results = collaborative_recommendations(
        borrowed_book_ids=borrowed_book_ids,
        similar_users_borrows=similar_users_borrows,
        book_embeddings_cache=book_embeddings_cache,
        top_k=20,
    )

    # Xác định chiến lược và trọng số
    has_content = len(content_results) > 0
    has_collab = len(collab_results) > 0

    if has_content and has_collab:
        recommendations = hybrid_merge(
            content_results=content_results,
            collab_results=collab_results,
            content_weight=0.6,
            collab_weight=0.4,
            final_k=limit,
        )
        reason = "hybrid"
        message = "Được chọn lọc riêng cho bạn"

    elif has_content:
        # Chỉ có content-based
        recommendations = content_results[:limit]
        for r in recommendations:
            r["score"] = r.pop("content_score", 0)
        reason = "content_based"
        message = "Dựa trên sách bạn đã đọc"

    elif has_collab:
        # Chỉ có collaborative
        recommendations = collab_results[:limit]
        for r in recommendations:
            r["score"] = r.pop("collab_score", 0)
        reason = "collaborative"
        message = "Người đọc tương tự bạn yêu thích"

    else:
        # Không có gì cả → cold start
        return {
            "recommendations": [],
            "reason": "cold_start",
            "message": "Sách phổ biến tại thư viện",
        }

    return {
        "recommendations": recommendations,
        "reason": reason,
        "message": message,
    }
