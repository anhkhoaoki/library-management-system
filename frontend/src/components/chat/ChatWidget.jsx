import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

// Tin nhắn chào mừng ban đầu
const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    text: 'Xin chào! Tôi là **Thư Bé** - trợ lý AI của thư viện BkLib 📚\n\nTôi có thể giúp bạn:\n- Tra cứu quy định mượn/trả sách\n- Kiểm tra sách bạn đang mượn\n- Hỏi về tiền phạt và đặt giữ chỗ\n\nBạn cần hỗ trợ gì?',
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  },
];

const QUICK_SUGGESTIONS = [
  'Tôi đang mượn bao nhiêu sách?',
  'Phí phạt trễ hạn là bao nhiêu?',
  'Thủ tục đặt giữ chỗ sách như thế nào?',
  'Tôi có tiền phạt không?',
];

const API_BASE = 'http://localhost:3000/api/v1';

export default function ChatWidget() {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages]);

  // Lắng nghe sự kiện mở chat từ sidebar
  useEffect(() => {
    const handleSidebarOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('bklib:open-chat', handleSidebarOpen);
    return () => window.removeEventListener('bklib:open-chat', handleSidebarOpen);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpen = () => { setIsOpen(true); setIsMinimized(false); };
  const handleClose = () => {
    // Hủy stream đang chạy nếu có
    abortControllerRef.current?.abort();
    setIsOpen(false);
  };
  const handleToggleMinimize = () => setIsMinimized(!isMinimized);

  // ─── Gọi API thật với SSE streaming ─────────────────────────────
  const callChatAPI = async (userMessage) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      appendAssistantMessage('Bạn cần đăng nhập để sử dụng tính năng này.');
      return;
    }

    // Lấy lịch sử chat hiện tại để gửi kèm
    const history = messages
      .filter(m => m.id !== 1) // Bỏ tin chào mặc định
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    // Tạo ID độc nhất cho tin nhắn AI (streaming) để tránh trùng lặp với ID của User
    const aiMsgId = `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setMessages(prev => [
      ...prev,
      {
        id: aiMsgId,
        role: 'assistant',
        text: '',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true,
      },
    ]);

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: history,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Đọc SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = ''; // Buffer lưu lại dòng chưa hoàn chỉnh cuối cùng của chunk

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Cộng chunk mới nhận được vào buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Tách các dòng theo dấu xuống dòng \n
        const lines = buffer.split('\n');
        
        // Dòng cuối cùng có thể chưa hoàn chỉnh, cất đi để nối vào chunk tiếp theo
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              const token = data.token;

              if (token === '[DONE]') {
                // Stream hoàn thành
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId ? { ...m, isStreaming: false } : m
                  )
                );
                break;
              }

              accumulated += token;
              // Cập nhật tin nhắn từng token đúng theo ID của AI
              setMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId ? { ...m, text: accumulated } : m
                )
              );
            } catch (err) {
              // Bỏ qua lỗi JSON parse của các dòng bị đứt quãng
              console.warn('Lỗi parse dòng SSE:', trimmedLine, err);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[Chat SSE Error]', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, text: 'Xin lỗi, không thể kết nối đến trợ lý lúc này. Vui lòng thử lại sau.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Helper: thêm tin nhắn AI tĩnh (cho lỗi hoặc offline)
  const appendAssistantMessage = (text) => {
    setMessages(prev => [
      ...prev,
      {
        id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        role: 'assistant',
        text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setShowSuggestions(false);
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        role: 'user',
        text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputText('');
    callChatAPI(text);
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        role: 'user',
        text: suggestion,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    callChatAPI(suggestion);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  // Render text với markdown đơn giản (bold, xuống dòng)
  const renderText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  const userInitial = user?.fullName?.charAt(0) || 'U';

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          id="chat-widget-open-btn"
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-secondary to-primary text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-center justify-center hover:scale-110 transition-all duration-200 group"
          title="Mở trợ lý BkLib"
          aria-label="Mở trợ lý thư viện"
        >
          <span
            className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform duration-200"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            forum
          </span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="chat-widget-panel"
          className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.18)] border border-outline-variant overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-[64px]' : 'h-[540px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm leading-tight">Thư Bé — Trợ lý BkLib AI</h3>
              <p className="text-xs text-white/75 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                {isStreaming ? 'Đang trả lời...' : 'Đang hoạt động'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMinimize}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label={isMinimized ? 'Mở rộng chat' : 'Thu nhỏ chat'}
              >
                <span className="material-symbols-outlined text-base">
                  {isMinimized ? 'open_in_full' : 'remove'}
                </span>
              </button>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Đóng chat"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-[#f7fafc] px-3 py-3 flex flex-col gap-3 scrollbar-hide">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {msg.role === 'assistant' ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-sm mb-0.5">
                        <span
                          className="material-symbols-outlined text-white text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          smart_toy
                        </span>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 font-bold text-xs shadow-sm mb-0.5">
                        {userInitial}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`flex flex-col max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-on-primary rounded-br-sm'
                            : 'bg-white text-on-surface border border-outline-variant/50 rounded-bl-sm'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <span>
                            {renderText(msg.text)}
                            {/* Cursor nhấp nháy khi đang stream */}
                            {msg.isStreaming && (
                              <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
                            )}
                          </span>
                        ) : (
                          msg.text
                        )}
                      </div>
                      <span className="text-[10px] text-outline mt-0.5 px-1">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {/* Typing dots khi đang chờ token đầu tiên */}
                {isStreaming && messages[messages.length - 1]?.text === '' && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-sm mb-0.5">
                      <span className="material-symbols-outlined text-white text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                    </div>
                    <div className="bg-white border border-outline-variant/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions */}
              {showSuggestions && !isStreaming && (
                <div className="px-3 py-2 bg-[#f7fafc] border-t border-outline-variant/40 flex gap-2 flex-wrap">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-xs bg-white border border-primary/30 text-primary px-2.5 py-1 rounded-full hover:bg-primary-container/20 transition-colors font-medium whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Bar */}
              <div className="shrink-0 bg-white border-t border-outline-variant px-3 py-3 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? 'Đang trả lời...' : 'Nhập câu hỏi của bạn...'}
                  disabled={isStreaming}
                  className="flex-1 resize-none bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                  style={{ minHeight: '40px', maxHeight: '96px' }}
                />
                <button
                  id="chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isStreaming}
                  className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  aria-label="Gửi tin nhắn"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isStreaming ? 'stop_circle' : 'send'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
