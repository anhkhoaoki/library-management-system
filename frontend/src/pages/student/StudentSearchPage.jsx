import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentSearchPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 📦 Đọc trạng thái cũ từ sessionStorage
  const savedIsAiSearch = sessionStorage.getItem('search_isAiSearch') === 'true';
  const savedSearchQuery = sessionStorage.getItem('search_searchQuery') || '';
  const savedCategoryId = sessionStorage.getItem('search_categoryId') || '';
  const savedPage = parseInt(sessionStorage.getItem('search_page'), 10) || 1;

  const [isAiSearch, setIsAiSearch] = useState(savedIsAiSearch);
  const [searchQuery, setSearchQuery] = useState(savedSearchQuery);
  const [categoryId, setCategoryId] = useState(savedCategoryId);

  const [books, setBooks] = useState([]);
  const [allAiBooks, setAllAiBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Metadata từ AI Search
  const [aiMeta, setAiMeta] = useState({
    searchMode: null,         // "semantic" | "hybrid" | "keyword_fallback"
    confidenceLevel: null,    // "high" | "medium" | "low"
    suggestedQueries: [],     // Gợi ý câu hỏi khi low confidence
    isFallback: false,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: savedPage,
    limit: savedIsAiSearch ? 12 : 12,
    totalPages: 0,
  });

  // 💾 Lưu vết sessionStorage
  useEffect(() => {
    sessionStorage.setItem('search_isAiSearch', isAiSearch);
    sessionStorage.setItem('search_searchQuery', searchQuery);
    sessionStorage.setItem('search_categoryId', categoryId);
    sessionStorage.setItem('search_page', pagination.page);
  }, [isAiSearch, searchQuery, categoryId, pagination.page]);

  const handleToggleAiSearch = () => {
    setIsAiSearch(prev => {
      const next = !prev;
      setSearchQuery('');
      setCategoryId('');
      setAiMeta({ searchMode: null, confidenceLevel: null, suggestedQueries: [], isFallback: false });
      setPagination({ total: 0, page: 1, limit: 12, totalPages: 0 });
      return next;
    });
  };

  // Tải danh mục sách
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/books/categories');
        setCategories(response.data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh mục:', err);
      }
    };
    fetchCategories();
  }, []);

  // ─── THÀNH PHẦN 1: Gọi API lấy dữ liệu ─────────────────────────
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        if (isAiSearch) {
          // CHẾ ĐỘ AI SEARCH
          const response = await api.post('/ai/search', { query: searchQuery });
          const aiData = response.data?.data;

          // Bóc tách mảng sách từ response
          const rawBooks = Array.isArray(aiData?.data)
            ? aiData.data
            : Array.isArray(aiData)
            ? aiData
            : [];

          // Lưu metadata AI
          setAiMeta({
            searchMode: aiData?.searchMode || null,
            confidenceLevel: aiData?.confidenceLevel || null,
            suggestedQueries: aiData?.suggestedQueries || [],
            isFallback: aiData?.isFallback || false,
          });

          setAllAiBooks(rawBooks);

          const total = rawBooks.length;
          const limit = 12;
          const totalPages = Math.ceil(total / limit);
          setPagination(prev => ({
            ...prev,
            total,
            limit,
            totalPages,
            page: prev.page <= totalPages ? prev.page : 1,
          }));
        } else {
          // CHẾ ĐỘ TRUYỀN THỐNG
          const response = await api.get('/books', {
            params: {
              q: searchQuery,
              categoryId: categoryId || undefined,
              page: pagination.page,
              limit: 12,
            },
          });
          const normalBooks = response.data?.data || [];
          setBooks(Array.isArray(normalBooks) ? normalBooks : []);
          setPagination(prev => ({ ...prev, ...response.data?.pagination }));
          setAiMeta({ searchMode: null, confidenceLevel: null, suggestedQueries: [], isFallback: false });
        }
      } catch (err) {
        console.error('Lỗi tải sách:', err);
        setBooks([]);
        setAllAiBooks([]);
      } finally {
        setLoading(false);
      }
    };

    const delayTime = isAiSearch ? 700 : 500;
    const timer = setTimeout(() => { fetchBooks(); }, delayTime);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryId, isAiSearch, !isAiSearch ? pagination.page : null]);

  // ─── THÀNH PHẦN 2: Cắt mảng cho phân trang AI ───────────────────
  useEffect(() => {
    if (!isAiSearch) return;
    const startIdx = (pagination.page - 1) * pagination.limit;
    const endIdx = startIdx + pagination.limit;
    setBooks(allAiBooks.slice(startIdx, endIdx));
  }, [pagination.page, pagination.limit, allAiBooks, isAiSearch]);

  // ─── Helper: Hiển thị badge chế độ tìm kiếm ────────────────────
  const renderSearchModeBadge = () => {
    if (!isAiSearch || !aiMeta.searchMode) return null;
    const modeMap = {
      semantic: { label: 'Tìm ngữ nghĩa', icon: 'psychology', color: 'bg-primary/10 text-primary border border-primary/20' },
      hybrid: { label: 'Tìm kết hợp', icon: 'merge', color: 'bg-secondary/10 text-secondary border border-secondary/20' },
      keyword_fallback: { label: 'Từ khóa cơ bản', icon: 'search', color: 'bg-warning/10 text-warning border border-warning/20' },
    };
    const mode = modeMap[aiMeta.searchMode];
    if (!mode) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${mode.color}`}>
        <span className="material-symbols-outlined text-[14px]">{mode.icon}</span>
        {mode.label}
        {aiMeta.confidenceLevel === 'high' && <span className="ml-1 text-[10px] opacity-70">• Độ tin cậy cao</span>}
        {aiMeta.confidenceLevel === 'medium' && <span className="ml-1 text-[10px] opacity-70">• Độ tin cậy trung bình</span>}
        {aiMeta.confidenceLevel === 'low' && <span className="ml-1 text-[10px] opacity-70">• Độ tin cậy thấp</span>}
      </span>
    );
  };

  // ─── Helper: Score badge color ──────────────────────────────────
  const getScoreColor = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 70) return 'bg-success text-white';
    if (pct >= 45) return 'bg-primary text-white';
    if (pct >= 25) return 'bg-warning/90 text-on-warning';
    return 'bg-outline/80 text-white';
  };

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">

        {/* ── Hero Search ── */}
        <section className="bg-white rounded-xl shadow-sm p-stack-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#0d9488 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h2 className="font-display-lg text-display-lg text-primary mb-stack-sm">Khám Phá Tri Thức</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg">
              Tìm kiếm tài liệu bạn cần một cách nhanh chóng
            </p>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">
                  {isAiSearch ? 'psychology' : 'search'}
                </span>
              </div>
              <input
                id="search-input"
                className={`w-full bg-surface-container-low text-on-surface font-body-md rounded-full py-4 pl-12 pr-10 focus:bg-white focus:ring-2 focus:ring-[#0d9488] focus:outline-none transition-all border shadow-sm ${isAiSearch ? 'border-primary/40' : 'border-none'}`}
                placeholder={
                  isAiSearch
                    ? 'Nhập nhu cầu của bạn (Ví dụ: Tôi muốn tìm tài liệu tự học lập trình web cơ bản)...'
                    : 'Nhập tên sách, tác giả, hoặc ISBN...'
                }
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
              />
            </div>

            {/* Filters & AI Switcher */}
            <div className="mt-stack-md flex flex-wrap justify-center items-center gap-6">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={isAiSearch} onChange={handleToggleAiSearch} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d9488]" />
                <span className="ml-3 font-label-md text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  Tìm kiếm thông minh bằng AI
                </span>
              </label>

              <div className={`transition-all duration-200 ${isAiSearch ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <select
                  className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8 cursor-pointer"
                  value={categoryId}
                  onChange={e => { setCategoryId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  disabled={isAiSearch}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* ── Results Section ── */}
        <div className="flex flex-col gap-gutter">

          {/* Header kết quả + metadata AI */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-title-lg text-title-lg text-on-surface">
              {loading ? 'Đang tìm kiếm...' : `Kết quả tìm kiếm (${pagination.total})`}
            </h3>
            {renderSearchModeBadge()}
          </div>

          {/* ── Gợi ý câu hỏi khi low confidence ── */}
          {isAiSearch && aiMeta.suggestedQueries.length > 0 && !loading && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-warning text-[20px]">tips_and_updates</span>
                <span className="font-bold text-sm text-on-surface">
                  Kết quả tìm kiếm chưa đủ chính xác. Bạn có muốn thử:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiMeta.suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchQuery(q); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-1.5 bg-white border border-warning/30 text-on-surface rounded-full text-sm hover:border-primary hover:text-primary transition-all font-medium"
                  >
                    <span className="material-symbols-outlined text-[13px] mr-1 align-middle">search</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── No result state ── */}
          {books.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">
                {isAiSearch ? 'psychology_alt' : 'search_off'}
              </span>
              <p className="text-on-surface-variant italic font-body-md">
                {isAiSearch
                  ? 'Không tìm thấy tài liệu phù hợp theo ngữ nghĩa.'
                  : 'Không tìm thấy tài liệu phù hợp.'}
              </p>
              {isAiSearch && (
                <button
                  onClick={handleToggleAiSearch}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-bold hover:bg-surface-container-high transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  Thử tìm kiếm thường
                </button>
              )}
            </div>
          )}

          {/* ── Book Grid ── */}
          {books.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {books.map(book => {
                const scorePct = book.score != null ? Math.round(book.score * 100) : null;
                return (
                  <article
                    key={book.id}
                    id={`book-card-${book.id}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-stack-md flex flex-col h-full border border-surface-variant group cursor-pointer relative"
                    onClick={() => navigate(`/dashboard/student/book/${book.id}`)}
                    title={book.explanation || book.title}
                  >
                    {/* Cover image */}
                    <div className="relative h-56 mb-stack-sm rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
                      <img
                        alt={book.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                        src={book.coverImageUrl || 'https://via.placeholder.com/300x450?text=No+Cover'}
                      />

                      {/* Availability badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm ${book.availableCopies > 0 ? 'bg-[#006a61] text-white' : 'bg-error text-white'}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {book.availableCopies > 0 ? 'check_circle' : 'error'}
                        </span>
                        {book.availableCopies > 0 ? 'Có sẵn' : 'Hết sách'}
                      </div>

                      {/* AI Score badge — chỉ hiện khi tìm kiếm AI */}
                      {isAiSearch && scorePct != null && (
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow ${getScoreColor(book.score)}`}>
                          {scorePct}% phù hợp
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">{book.title}</h4>
                      <p className="font-label-md text-label-md text-on-surface-variant mb-2">
                        {book.authorNames && book.authorNames.length > 0 ? book.authorNames.join(', ') : 'Chưa rõ tác giả'}
                      </p>

                      {/* AI Explanation (chỉ hiện top 3 khi AI search) */}
                      {isAiSearch && book.explanation && (
                        <p className="text-xs text-primary/80 italic mt-1 mb-2 line-clamp-2 flex items-start gap-1">
                          <span className="material-symbols-outlined text-[13px] mt-0.5 shrink-0">auto_awesome</span>
                          {book.explanation}
                        </p>
                      )}

                      <div className="mt-auto pt-4 border-t border-surface-variant flex items-center justify-between">
                        <span className="text-primary font-bold text-label-md">Xem chi tiết</span>
                        <span className="material-symbols-outlined text-primary">arrow_forward</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ── Phân trang ── */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-stack-lg">
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                  className={`w-10 h-10 rounded-full font-label-md ${pagination.page === i + 1 ? 'bg-primary text-white' : 'bg-white text-on-surface border border-outline'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}