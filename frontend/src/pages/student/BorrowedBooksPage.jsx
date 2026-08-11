import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

const MAX_RENEW = 2;
const RENEW_DAYS = 7;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function isOverdue(dueDate) {
  return getDaysUntilDue(dueDate) < 0;
}

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
        api.get('/users/me/stats'),
      ]);
      setLoans(loansRes.data.data || []);
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
      const res = await api.post(`/circulation/borrow-records/${loanId}/renew`);
      const newDue = res.data.data?.newDueDate;
      alert(newDue ? `Gia hạn thành công! Hạn trả mới: ${formatDate(newDue)}` : 'Gia hạn thành công!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi gia hạn');
    } finally {
      setRenewing(null);
    }
  };

  const getRenewState = (loan) => {
    const overdue = isOverdue(loan.dueDate);
    const daysLeft = getDaysUntilDue(loan.dueDate);
    const renewsLeft = MAX_RENEW - (loan.renewCount ?? 0);

    if (overdue) {
      return { canRenew: false, label: 'Đã quá hạn', hint: 'Vui lòng đến thư viện để xử lý' };
    }
    if ((loan.renewCount ?? 0) >= MAX_RENEW) {
      return { canRenew: false, label: 'Đã hết lượt gia hạn', hint: `Đã dùng hết ${MAX_RENEW} lượt gia hạn` };
    }
    return {
      canRenew: true,
      label: 'Gia hạn',
      hint: daysLeft <= 3
        ? `Sắp đến hạn (${daysLeft} ngày)! Gia hạn thêm ${RENEW_DAYS} ngày (còn ${renewsLeft} lượt)`
        : `Còn ${daysLeft} ngày — gia hạn thêm ${RENEW_DAYS} ngày (còn ${renewsLeft} lượt)`,
    };
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
          <h2 className="font-display-lg text-display-lg text-on-surface mb-stack-sm">Sách đang mượn</h2>
          <p className="font-body-md text-on-surface-variant">
            Dữ liệu từ hệ thống lưu thông — cùng nguồn khi thủ thư xác nhận cho mượn tại quầy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md">{stats?.borrowingCount ?? loans.length}</span>
            <span className="text-on-surface-variant font-label-md">Đang mượn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className={`block font-display-md ${loans.some((l) => isOverdue(l.dueDate)) ? 'text-error' : 'text-primary'}`}>
              {loans.filter((l) => isOverdue(l.dueDate)).length}
            </span>
            <span className="text-on-surface-variant font-label-md">Quá hạn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md">{(stats?.totalFine ?? 0).toLocaleString()}đ</span>
            <span className="text-on-surface-variant font-label-md">Tiền phạt chưa TT</span>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center border border-dashed border-outline-variant">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">book_2</span>
            <p className="text-on-surface-variant italic">Bạn hiện không mượn tài liệu nào.</p>
            <p className="text-sm text-outline mt-2">
              Sách sẽ hiển thị ở đây sau khi thủ thư xác nhận cho mượn tại quầy lưu thông.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-stack-md">
            {loans.map((loan) => {
              const book = loan.physicalCopy?.book;
              if (!book) return null;

              const overdue = isOverdue(loan.dueDate);
              const daysLeft = getDaysUntilDue(loan.dueDate);
              const renewState = getRenewState(loan);

              return (
                <article
                  key={loan.id}
                  className={`bg-white rounded-xl shadow-sm border p-stack-md flex flex-col sm:flex-row gap-stack-md relative ${
                    overdue ? 'border-error/30' : 'border-surface-variant'
                  }`}
                >
                  {overdue && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-error text-white text-xs font-bold rounded-full">
                      QUÁ HẠN
                    </div>
                  )}
                  <Link
                    to={`/dashboard/student/book/${book.id}`}
                    className="w-full sm:w-32 h-48 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden border border-outline-variant block hover:opacity-90"
                  >
                    <img
                      src={book.coverImageUrl || 'https://via.placeholder.com/150'}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-lg text-on-surface line-clamp-2 pr-16">{book.title}</h3>
                      <p className="text-sm text-on-surface-variant mb-4">{book.authorNames?.join(', ')}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Ngày mượn:</span>
                          <span>{formatDate(loan.borrowedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Hạn trả:</span>
                          <span className={`font-bold ${overdue ? 'text-error' : daysLeft <= 3 ? 'text-warning' : 'text-primary'}`}>
                            {formatDate(loan.dueDate)}
                            {!overdue && ` (${daysLeft} ngày)`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Gia hạn:</span>
                          <span>{loan.renewCount ?? 0}/{MAX_RENEW} lần</span>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-2 italic">{renewState.hint}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleRenew(loan.id)}
                        disabled={renewing === loan.id || !renewState.canRenew}
                        className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:bg-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {renewing === loan.id ? 'Đang gia hạn...' : renewState.label}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
