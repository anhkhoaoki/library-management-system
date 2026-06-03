import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [currentLoans, setCurrentLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, loansRes] = await Promise.all([
          api.get('/users/me/stats'),
          api.get('/users/me/borrow-history?status=ACTIVE&limit=5'),
        ]);
        setStats(statsRes.data.data);
        setCurrentLoans(loansRes.data.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      <div className="flex flex-col gap-stack-lg">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden bg-primary text-on-primary p-stack-lg md:p-[48px] shadow-md">
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000)' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display-lg text-display-lg mb-stack-sm">Xin chào {user?.fullName},</h2>
            <p className="font-headline-md text-headline-md font-normal text-primary-fixed-dim mb-stack-lg">
              Hôm nay bạn muốn khám phá điều gì?
            </p>
            <div className="flex flex-wrap gap-stack-md">
              <Link to="/dashboard/student/search" className="bg-secondary text-on-secondary px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-secondary-container transition-all shadow-sm">
                <span className="material-symbols-outlined">explore</span>
                Khám phá sách mới
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-stack-md">
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md text-display-md">{stats?.borrowingCount || 0}</span>
            <span className="text-on-surface-variant font-label-md">Đang mượn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className={`block font-display-md text-display-md ${stats?.overdueCount > 0 ? 'text-error' : 'text-primary'}`}>
              {stats?.overdueCount || 0}
            </span>
            <span className="text-on-surface-variant font-label-md">Quá hạn</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md text-display-md">{stats?.reservationCount || 0}</span>
            <span className="text-on-surface-variant font-label-md">Đang chờ</span>
          </div>
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-surface-variant text-center">
            <span className="block text-primary font-display-md text-display-md">{stats?.totalFine?.toLocaleString()}đ</span>
            <span className="text-on-surface-variant font-label-md">Tiền phạt</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Recent Loans */}
          <section className="lg:col-span-12 flex flex-col gap-stack-md">
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_stories</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Tài liệu bạn đang mượn</h3>
              </div>
              <Link to="/dashboard/student/borrowed-books" className="text-primary hover:underline font-label-md">Xem tất cả</Link>
            </div>
            
            {currentLoans.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center border border-dashed border-outline">
                <p className="text-on-surface-variant italic">Bạn hiện không mượn tài liệu nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md">
                {currentLoans.map(loan => (
                  <div key={loan.id} className="bg-white rounded-xl shadow-sm border border-surface-variant p-stack-md flex gap-stack-md">
                    <Link to={`/dashboard/student/book/${loan.physicalCopy.book.id}`} className="hover:opacity-85 transition-opacity shrink-0">
                      <img 
                        src={loan.physicalCopy.book.coverImageUrl || 'https://via.placeholder.com/150'} 
                        alt={loan.physicalCopy.book.title}
                        className="w-16 h-24 object-cover rounded shadow-sm"
                      />
                    </Link>
                    <div className="flex flex-col flex-1 min-w-0">
                      <Link to={`/dashboard/student/book/${loan.physicalCopy.book.id}`} className="hover:text-primary hover:underline transition-colors block truncate">
                        <h4 className="font-label-md text-label-md text-on-surface truncate font-bold inline">{loan.physicalCopy.book.title}</h4>
                      </Link>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-auto">{loan.physicalCopy.book.authorNames.join(', ')}</p>
                      <div className={`mt-2 flex items-center gap-1 ${loan.status === 'OVERDUE' ? 'text-error' : 'text-secondary'}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {loan.status === 'OVERDUE' ? 'warning' : 'schedule'}
                        </span>
                        <span className="font-label-sm text-label-sm">
                          {loan.status === 'OVERDUE' ? 'Đã quá hạn' : `Hết hạn: ${new Date(loan.dueDate).toLocaleDateString('vi-VN')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

