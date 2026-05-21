import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentSearchPage() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const response = await api.get('/books', {
          params: {
            q: searchQuery,
            categoryId: categoryId || undefined,
            page: pagination.page,
            limit: pagination.limit
          }
        });
        setBooks(response.data.data);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      } catch (err) {
        console.error('Lỗi tải sách:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchBooks();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, categoryId, pagination.page]);

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">
        {/* Search Hero Section */}
        <section className="bg-white rounded-xl shadow-sm p-stack-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0d9488 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h2 className="font-display-lg text-display-lg text-primary mb-stack-sm">Khám Phá Tri Thức</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg">Tìm kiếm tài liệu bạn cần một cách nhanh chóng</p>

            {/* Smart Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">search</span>
              </div>
              <input
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded-full py-4 pl-12 pr-10 focus:bg-white focus:ring-2 focus:ring-[#0d9488] focus:outline-none transition-all border-none shadow-sm"
                placeholder="Nhập tên sách, tác giả, hoặc ISBN..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="mt-stack-md flex flex-wrap justify-center gap-3">
              <select 
                className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <div className="flex flex-col gap-gutter">
          <div className="flex justify-between items-center">
            <h3 className="font-title-lg text-title-lg text-on-surface">
              {loading ? 'Đang tải...' : `Kết quả tìm kiếm (${pagination.total})`}
            </h3>
          </div>

          {books.length === 0 && !loading ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
              <p className="text-on-surface-variant italic">Không tìm thấy tài liệu phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {books.map(book => (
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
                        {book.availableCopies > 0 ? 'check_circle' : 'error'}
                      </span>
                      {book.availableCopies > 0 ? 'Có sẵn' : 'Hết sách'}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">{book.title}</h4>
                    <p className="font-label-md text-label-md text-on-surface-variant mb-2">{book.authorNames.join(', ')}</p>
                    <div className="mt-auto pt-4 border-t border-surface-variant flex items-center justify-between">
                      <span className="text-primary font-bold text-label-md">Xem chi tiết</span>
                      <span className="material-symbols-outlined text-primary">arrow_forward</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
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
