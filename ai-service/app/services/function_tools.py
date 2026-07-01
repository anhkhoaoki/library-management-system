"""
Function Calling Tools — UC-AI-02
Định nghĩa các Tool/Function cho Gemini gọi để lấy dữ liệu thực tế từ DB
thông qua Node.js Backend API (internal endpoint).
"""
import httpx
from typing import Any

from app.core.config import settings

# URL Backend Node.js để Python gọi ngược lại lấy dữ liệu người dùng
BACKEND_URL = settings.BACKEND_URL
INTERNAL_KEY = settings.INTERNAL_API_KEY


# ─── Định nghĩa schema Tools cho Gemini Function Calling ─────────
# Đây là JSON schema mà Gemini dùng để hiểu có tool gì để gọi
TOOL_DECLARATIONS = [
    {
        "name": "get_active_borrows",
        "description": (
            "Lấy danh sách sách mà người dùng đang mượn hiện tại, "
            "bao gồm tên sách và ngày đến hạn trả. "
            "Dùng khi người dùng hỏi về sách họ đang mượn."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "ID của người dùng cần tra cứu",
                }
            },
            "required": ["user_id"],
        },
    },
    {
        "name": "get_user_fines",
        "description": (
            "Lấy thông tin tiền phạt đang nợ của người dùng. "
            "Dùng khi người dùng hỏi về tiền phạt, số tiền nợ."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "ID của người dùng cần tra cứu",
                }
            },
            "required": ["user_id"],
        },
    },
    {
        "name": "get_user_reservations",
        "description": (
            "Lấy danh sách sách mà người dùng đang đặt giữ chỗ. "
            "Dùng khi người dùng hỏi về sách đặt trước, hàng chờ."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "ID của người dùng cần tra cứu",
                }
            },
            "required": ["user_id"],
        },
    },
]


# ─── Thực thi Tool — Python gọi Node.js API ──────────────────────
async def execute_tool(tool_name: str, args: dict[str, Any]) -> str:
    """
    Thực thi tool mà Gemini yêu cầu. Gọi về Node.js internal API để lấy dữ liệu DB.
    Trả về string mô tả kết quả để nhồi ngược vào Gemini.
    """
    user_id = args.get("user_id", "")
    headers = {"X-Internal-Key": INTERNAL_KEY}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if tool_name == "get_active_borrows":
                res = await client.get(
                    f"{BACKEND_URL}/api/v1/ai/internal/user/{user_id}/borrows",
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    if not data:
                        return "Người dùng hiện không có sách nào đang mượn."
                    lines = [
                        f"- '{b['title']}' (Hạn trả: {b['dueDate']}, Trạng thái: {b.get('status', 'ACTIVE')})"
                        for b in data
                    ]
                    return f"Đang mượn {len(data)} cuốn sách:\n" + "\n".join(lines)

            elif tool_name == "get_user_fines":
                res = await client.get(
                    f"{BACKEND_URL}/api/v1/ai/internal/user/{user_id}/fines",
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json().get("data", {})
                    total = data.get("totalFines", 0)
                    pending_count = data.get("pendingCount", 0)
                    if total == 0:
                        return "Người dùng không có tiền phạt nào đang nợ."
                    return (
                        f"Tổng tiền phạt chưa thanh toán: {total:,}đ "
                        f"({pending_count} khoản phạt)."
                    )

            elif tool_name == "get_user_reservations":
                res = await client.get(
                    f"{BACKEND_URL}/api/v1/ai/internal/user/{user_id}/reservations",
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json().get("data", [])
                    if not data:
                        return "Người dùng hiện không có sách nào đang đặt giữ chỗ."
                    lines = [
                        f"- '{r['book']['title']}' (Vị trí hàng chờ: #{r.get('queuePosition', '?')})"
                        for r in data
                    ]
                    return f"Đang đặt giữ chỗ {len(data)} cuốn:\n" + "\n".join(lines)

        except Exception as e:
            print(f"[Function Tool Error] {tool_name}: {e}")

    return "Không thể lấy dữ liệu từ hệ thống lúc này. Vui lòng thử lại sau."
