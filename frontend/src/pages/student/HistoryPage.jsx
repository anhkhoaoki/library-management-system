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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/me/borrow-history?status=RETURNED&search=${searchTerm}&page=${page}`);
      setHistory(response.data.data);
      // setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, searchTerm]);

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg">
        <div>
          <h2 className="font-display-lg text-on-surface">Lịch sử mượn trả</h2>
          <p className="font-body-md text-on-surface-variant mt-1">Các tài liệu bạn đã mượn và hoàn trả.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-stack-md flex flex-col lg:flex-row gap-4 border border-surface-variant">
          <div className="flex-1 relative">
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
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center italic text-on-surface-variant">
                      Chưa có lịch sử giao dịch.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-bright transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={item.physicalCopy.book.coverImageUrl || 'https://via.placeholder.com/40'} alt={item.physicalCopy.book.title} className="w-8 h-12 object-cover rounded" />
                          <span className="font-bold">{item.physicalCopy.book.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{new Date(item.borrowedAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-6 py-4 text-sm">{new Date(item.returnedAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-success/10 text-success">
                          Đã trả
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {item.fineAmount > 0 ? `${item.fineAmount.toLocaleString()}đ` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
