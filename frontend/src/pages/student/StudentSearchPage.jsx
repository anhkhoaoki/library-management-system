import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentSearchPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // 📦 ĐỌC TRẠNG THÁI CŨ TỪ SESSION STORAGE (Nếu có)
  const savedIsAiSearch = sessionStorage.getItem('search_isAiSearch') === 'true';
  const savedSearchQuery = sessionStorage.getItem('search_searchQuery') || '';
  const savedCategoryId = sessionStorage.getItem('search_categoryId') || '';
  const savedPage = parseInt(sessionStorage.getItem('search_page'), 10) || 1;

  // Khởi tạo các trạng thái từ bộ nhớ máy
  const [isAiSearch, setIsAiSearch] = useState(savedIsAiSearch);
  const [searchQuery, setSearchQuery] = useState(savedSearchQuery);
  const [categoryId, setCategoryId] = useState(savedCategoryId);
  
  const [books, setBooks] = useState([]); 
  const [allAiBooks, setAllAiBooks] = useState([]); 
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cấu hình phân trang
  const [pagination, setPagination] = useState({ 
    total: 0, 
    page: savedPage, 
    limit: savedIsAiSearch ? 11 : 12, 
    totalPages: 0 
  });

  // 💾 Mỗi khi các biến trạng thái thay đổi, ta lập tức ghi đè vào sessionStorage để lưu vết
  useEffect(() => {
    sessionStorage.setItem('search_isAiSearch', isAiSearch);
    sessionStorage.setItem('search_searchQuery', searchQuery);
    sessionStorage.setItem('search_categoryId', categoryId);
    sessionStorage.setItem('search_page', pagination.page);
  }, [isAiSearch, searchQuery, categoryId, pagination.page]);


  // Khi gạt nút bật/tắt chế độ tìm kiếm
  const handleToggleAiSearch = () => {
    setIsAiSearch((prev) => {
      const nextState = !prev;
      setSearchQuery(''); 
      setCategoryId('');  
      setPagination({
        total: 0,
        page: 1,
        limit: nextState ? 11 : 12,
        totalPages: 0
      });
      return nextState;
    });
  };

  // Tải danh mục sách khi khởi chạy trang
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


  // ─── THÀNH PHẦN 1: GỌI API ĐỂ LẤY DỮ LIỆU TỪ BACKEND ───────────────────
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        if (isAiSearch) {
          // CHẾ ĐỘ AI
          const response = await api.post('/ai/search', { query: searchQuery });
          const aiData = response.data?.data;
          const rawBooks = Array.isArray(aiData?.data) ? aiData.data : (Array.isArray(aiData) ? aiData : []);
          
          setAllAiBooks(rawBooks); 

          const total = rawBooks.length;
          const limit = 11;
          const totalPages = Math.ceil(total / limit);

          setPagination(prev => ({ 
            ...prev, 
            total, 
            limit, 
            totalPages,
            // Giữ đúng trang hiện tại nếu số trang hợp lệ
            page: prev.page <= totalPages ? prev.page : 1 
          }));
        } else {
          // CHẾ ĐỘ TRUYỀN THỐNG
          const response = await api.get('/books', {
            params: { 
              q: searchQuery, 
              categoryId: categoryId || undefined, 
              page: pagination.page, 
              limit: 12 
            }
          });
          const normalBooks = response.data?.data || [];
          setBooks(Array.isArray(normalBooks) ? normalBooks : []);
          setPagination(prev => ({ ...prev, ...response.data?.pagination }));
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
    const timer = setTimeout(() => {
      fetchBooks();
    }, delayTime);

    return () => clearTimeout(timer);
    
  }, [searchQuery, categoryId, isAiSearch, !isAiSearch ? pagination.page : null]); 


  // ─── THÀNH PHẦN 2: CHỈ XỬ LÝ SẮP XẾP / CẮT MẢNG CHO CHẾ ĐỘ AI ───────────
  useEffect(() => {
    if (!isAiSearch) return;

    const startIdx = (pagination.page - 1) * pagination.limit;
    const endIdx = startIdx + pagination.limit;
    
    setBooks(allAiBooks.slice(startIdx, endIdx));
  }, [pagination.page, pagination.limit, allAiBooks, isAiSearch]);


  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">
        <section className="bg-white rounded-xl shadow-sm p-stack-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0d9488 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h2 className="font-display-lg text-display-lg text-primary mb-stack-sm">Khám Phá Tri Thức</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg">Tìm kiếm tài liệu bạn cần một cách nhanh chóng</p>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">
                  {isAiSearch ? 'psychology' : 'search'}
                </span>
              </div>
              <input
                className={`w-full bg-surface-container-low text-on-surface font-body-md rounded-full py-4 pl-12 pr-10 focus:bg-white focus:ring-2 focus:ring-[#0d9488] focus:outline-none transition-all border shadow-sm ${isAiSearch ? 'border-primary/40' : 'border-none'}`}
                placeholder={isAiSearch ? "Nhập nhu cầu của bạn (Ví dụ: Tôi muốn tìm tài liệu tự học lập trình web cơ bản)..." : "Nhập tên sách, tác giả, hoặc ISBN..."}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination(p => ({ ...p, page: 1 })); 
                }}
              />
            </div>

            {/* Filters & AI Switcher */}
            <div className="mt-stack-md flex flex-wrap justify-center items-center gap-6">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input type="checkbox" checked={isAiSearch} onChange={handleToggleAiSearch} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d9488]"></div>
                <span className="ml-3 font-label-md text-on-surface-variant flex items-center gap-1.5">
                  Tìm kiếm thông minh bằng AI
                </span>
              </label>

              <div className={`transition-all duration-200 ${isAiSearch ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <select 
                  className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8 cursor-pointer"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
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

        {/* Results Section */}
        <div className="flex flex-col gap-gutter">
          <div className="flex justify-between items-center">
            <h3 className="font-title-lg text-title-lg text-on-surface">
              {loading ? 'Đang tải...' : `Kết quả tìm kiếm (${books.length})`}
            </h3>
          </div>

          {books.length === 0 ? (
            !loading && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                <p className="text-on-surface-variant italic">Không tìm thấy tài liệu phù hợp.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {books.map(book => {
                return (
                  <article 
                    key={book.id} 
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-stack-md flex flex-col h-full border border-surface-variant group cursor-pointer"
                    onClick={() => navigate(`/dashboard/student/book/${book.id}`)}
                  >
                    <div className="relative h-56 mb-stack-sm rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
                      <img
                        alt={book.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                        src={book.coverImageUrl || 'https://via.placeholder.com/300x450?text=No+Cover'}
                      />
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm ${book.availableCopies > 0 ? 'bg-[#006a61] text-white' : 'bg-error text-white'}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {book.physicalCopy?.book?.availableCopies > 0 || book.availableCopies > 0 ? 'check_circle' : 'error'}
                        </span>
                        {book.availableCopies > 0 ? 'Có sẵn' : 'Hết sách'}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">{book.title}</h4>
                      <p className="font-label-md text-label-md text-on-surface-variant mb-2">
                        {book.authorNames && book.authorNames.length > 0 ? book.authorNames.join(', ') : 'Chưa rõ tác giả'}
                      </p>
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

          {/* Thanh phân trang hiển thị và chạy mượt mà cho cả 2 tab */}
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