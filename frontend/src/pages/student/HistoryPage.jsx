import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function HistoryPage() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFines, setTotalFines] = useState(0);

  // 1. Lấy danh sách lịch sử mượn từ Backend (giữ nguyên không đổi cấu trúc API)
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Đang đặt limit=20 để hỗ trợ bạn test tính năng phân trang dễ dàng
      const response = await api.get(`/users/me/borrow-history?status=RETURNED&page=${page}&limit=20`);
      
      if (response.data?.success) {
        setHistory(response.data.data || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lấy số tiền phạt chưa thanh toán (PENDING) từ API Stats
  const fetchTotalFines = async () => {
    try {
      const response = await api.get('/users/me/stats');
      if (response.data?.success && response.data?.data) {
        setTotalFines(response.data.data.totalFine || 0);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu thống kê tiền phạt:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]); // Tải lại dữ liệu khi đổi trang

  useEffect(() => {
    fetchTotalFines();
  }, []); // Lấy tổng nợ phạt khi vào trang

  // ============================================================
  // 🚀 LOGIC LỌC TÌM KIẾM TRỰC TIẾP TRÊN FRONTEND (KHÔNG SỬA BE)
  // ============================================================
  const filteredHistory = history.filter((item) => {
    const bookTitle = item.physicalCopy?.book?.title || "";
    // Chuyển đổi cả hai chuỗi về chữ thường để so sánh chính xác (không phân biệt HOA/thường)
    return bookTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">
        <div>
          <h2 className="font-display-lg text-on-surface">Lịch sử mượn trả</h2>
          <p className="font-body-md text-on-surface-variant mt-1">Các tài liệu bạn đã mượn và hoàn trả.</p>
        </div>

        {/* CẢNH BÁO TIỀN PHẠT */}
        {totalFines > 0 && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-error flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Bạn đang có khoản phạt chưa thanh toán!
              </h3>
              <p className="text-sm text-error/80 mt-1">
                Vui lòng đến quầy thủ thư để thanh toán khoản phạt quá hạn.
              </p>
            </div>
            <div className="text-right">
              <span className="block text-sm text-error/80">Tổng nợ phạt</span>
              <span className="font-display-md text-error font-bold">{totalFines.toLocaleString()}đ</span>
            </div>
          </div>
        )}

        {/* KHU VỰC TÌM KIẾM */}
        <div className="bg-white rounded-xl shadow-sm p-stack-md flex flex-col lg:flex-row gap-4 border border-surface-variant">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg font-body-md"
              placeholder="Tìm kiếm tài liệu..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // Cập nhật biến tìm kiếm khi gõ
            />
          </div>
        </div>

        {/* BẢNG DỮ LIỆU LỊCH SỬ MƯỢN TRẢ */}
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
                ) : filteredHistory.length === 0 ? ( // Đổi từ history sang filteredHistory
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center italic text-on-surface-variant">
                      Không tìm thấy tài liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => { // Duyệt mảng đã qua bộ lọc tìm kiếm
                    const fineAmount = item.fine ? Number(item.fine.totalAmount) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.physicalCopy?.book?.coverImageUrl || 'https://via.placeholder.com/40'} 
                              alt={item.physicalCopy?.book?.title} 
                              className="w-8 h-12 object-cover rounded" 
                            />
                            <span className="font-bold">{item.physicalCopy?.book?.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.borrowedAt ? new Date(item.borrowedAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-success/10 text-success">
                            Đã trả
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-error">
                          {fineAmount > 0 ? `${fineAmount.toLocaleString()}đ` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="flex justify-end gap-2 mt-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-surface-container rounded-lg disabled:opacity-50 text-sm"
            >
              Trước
            </button>
            <span className="text-sm self-center">Trang {page} / {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-surface-container rounded-lg disabled:opacity-50 text-sm"
            >
              Sau
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  );
}