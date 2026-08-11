import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function HistoryPage() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFines, setTotalFines] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/me/borrow-history?status=RETURNED&page=${page}&limit=20`);
      if (response.data?.success) {
        setHistory(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalFines = async () => {
    try {
      const response = await api.get('/users/me/stats');
      if (response.data?.success) {
        setTotalFines(response.data.data?.totalFine || 0);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê phí phạt:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  useEffect(() => {
    fetchTotalFines();
  }, []);

  const filteredHistory = history.filter((item) => {
    const bookTitle = item.physicalCopy?.book?.title || '';
    return bookTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isEmpty = !loading && history.length === 0;

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">
        <div>
          <h2 className="font-display-lg text-on-surface">Lịch sử mượn trả</h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Dữ liệu từ hệ thống lưu thông — cùng nguồn với giao diện thủ thư khi xử lý trả sách.
          </p>
        </div>

        {totalFines > 0 && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-error flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Bạn đang có khoản phạt chưa thanh toán
              </h3>
              <p className="text-sm text-error/80 mt-1">Vui lòng đến quầy thủ thư để thanh toán.</p>
            </div>
            <div className="text-right">
              <span className="block text-sm text-error/80">Tổng nợ phạt</span>
              <span className="font-display-md text-error font-bold">{totalFines.toLocaleString()}đ</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-stack-md border border-surface-variant">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg font-body-md"
              placeholder="Tìm kiếm tài liệu..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isEmpty ? (
          <div className="bg-white rounded-xl p-16 text-center border border-dashed border-outline-variant">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">history</span>
            <p className="text-on-surface-variant italic">Chưa có lịch sử mượn trả.</p>
            <p className="text-sm text-outline mt-2">
              Lịch sử sẽ xuất hiện sau khi thủ thư xử lý trả sách tại quầy lưu thông.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-6 py-4 font-bold text-sm">Tên tài liệu</th>
                    <th className="px-6 py-4 font-bold text-sm">Ngày mượn</th>
                    <th className="px-6 py-4 font-bold text-sm">Ngày trả</th>
                    <th className="px-6 py-4 font-bold text-sm">Trạng thái</th>
                    <th className="px-6 py-4 font-bold text-sm text-right">Phí phạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center">
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center italic text-on-surface-variant">
                        Không tìm thấy tài liệu phù hợp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => {
                      const fine = item.fine;
                      const fineAmount = fine ? Number(fine.totalAmount) : 0;
                      const isPendingFine = fine?.status === 'PENDING';

                      return (
                        <tr key={item.id} className="hover:bg-surface-bright transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Link to={`/dashboard/student/book/${item.physicalCopy?.book?.id}`} className="shrink-0">
                                <img
                                  src={item.physicalCopy?.book?.coverImageUrl || 'https://via.placeholder.com/40'}
                                  alt=""
                                  className="w-8 h-12 object-cover rounded"
                                />
                              </Link>
                              <Link
                                to={`/dashboard/student/book/${item.physicalCopy?.book?.id}`}
                                className="font-bold hover:text-primary hover:underline"
                              >
                                {item.physicalCopy?.book?.title || '—'}
                              </Link>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">{formatDate(item.borrowedAt)}</td>
                          <td className="px-6 py-4 text-sm">{formatDate(item.returnedAt)}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-success/10 text-success">
                              Đã trả
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {fineAmount > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-bold ${isPendingFine ? 'text-error' : 'text-on-surface-variant'}`}>
                                  {fineAmount.toLocaleString()}đ
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isPendingFine ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                  {isPendingFine ? 'Chưa thanh toán' : 'Đã thanh toán'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-end gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-surface-container rounded-lg disabled:opacity-50 text-sm">
              Trước
            </button>
            <span className="text-sm self-center">Trang {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-surface-container rounded-lg disabled:opacity-50 text-sm">
              Sau
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
