import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function BorrowedBooksPage() {
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(null);

  const fetchData = async () => {
    try {
      const [loansRes, statsRes] = await Promise.all([
        api.get('/users/me/borrow-history?status=ACTIVE'),
        api.get('/users/me/stats')
      ]);
      setLoans(loansRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRenew = async (loanId) => {
    setRenewing(loanId);
    try {
      await api.post(`/circulation/renew/${loanId}`);
      alert('Gia hạn thành công!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi gia hạn');
    } finally {
      setRenewing(null);
    }
  };

  if (loading) {
    return (
      <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
        <div className="flex items-center justify-center h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="max-w-container-max mx-auto space-y-stack-lg">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-stack-sm">Sách Đang Mượn</h2>
          <p className="font-body-md text-on-surface-variant">Quản lý và gia hạn các tài liệu bạn đang lưu giữ.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md">{stats?.borrowingCount || 0}</span>
            <span className="text-on-surface-variant font-label-md">Đang mượn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className={`block font-display-md ${stats?.overdueCount > 0 ? 'text-error' : 'text-primary'}`}>
              {stats?.overdueCount || 0}
            </span>
            <span className="text-on-surface-variant font-label-md">Quá hạn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md">{stats?.totalFine?.toLocaleString()}đ</span>
            <span className="text-on-surface-variant font-label-md">Tiền phạt</span>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="bg-white rounded-xl p-20 text-center border border-dashed">
            <p className="text-on-surface-variant italic">Bạn hiện không mượn tài liệu nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-stack-md">
            {loans.map((loan) => (
              <article key={loan.id} className="bg-white rounded-xl shadow-sm border border-surface-variant p-stack-md flex flex-col sm:flex-row gap-stack-md relative">
                <div className="w-full sm:w-32 h-48 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden border border-outline-variant">
                  <img src={loan.physicalCopy.book.coverImageUrl || 'https://via.placeholder.com/150'} alt={loan.physicalCopy.book.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-title-lg text-on-surface line-clamp-2">{loan.physicalCopy.book.title}</h3>
                    <p className="text-sm text-on-surface-variant mb-4">{loan.physicalCopy.book.authorNames.join(', ')}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Ngày mượn:</span>
                        <span>{new Date(loan.borrowedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Hạn trả:</span>
                        <span className={`font-bold ${loan.status === 'OVERDUE' ? 'text-error' : 'text-primary'}`}>
                          {new Date(loan.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Gia hạn:</span>
                        <span>{loan.renewCount} lần</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => handleRenew(loan.id)}
                      disabled={renewing === loan.id}
                      className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:bg-primary-container transition-all disabled:opacity-50"
                    >
                      {renewing === loan.id ? 'Đang gia hạn...' : 'Gia hạn'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
