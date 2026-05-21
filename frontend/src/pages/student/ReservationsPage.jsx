import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ReservationsPage() {
  const { user } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const response = await api.get('/users/me/reservations');
      setReservations(response.data.data);
    } catch (err) {
      console.error('Lỗi tải danh sách đặt chỗ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu đặt chỗ này?')) return;
    try {
      await api.delete(`/circulation/reservations/${id}`);
      alert('Đã hủy đặt chỗ.');
      fetchReservations();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi hủy đặt chỗ');
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
        <div className="mb-stack-lg">
          <h2 className="font-display-lg text-on-surface mb-stack-sm">Sách đang đặt giữ chỗ</h2>
          <p className="font-body-md text-on-surface-variant">Theo dõi trạng thái các tài liệu bạn đã yêu cầu.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
          <div className="xl:col-span-8 flex flex-col gap-stack-md">
            {reservations.length === 0 ? (
              <div className="bg-white rounded-xl p-20 text-center border border-dashed">
                <p className="text-on-surface-variant italic">Bạn hiện không có yêu cầu đặt chỗ nào.</p>
              </div>
            ) : (
              reservations.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-surface-variant p-stack-md flex flex-col sm:flex-row gap-stack-md relative">
                  <div className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant">
                    <img src={item.book.coverImageUrl || 'https://via.placeholder.com/100x150'} alt={item.book.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-stack-sm">
                      <div>
                        <h3 className="font-title-lg text-on-surface">{item.book.title}</h3>
                        <p className="text-sm text-on-surface-variant">{item.book.authorNames.join(', ')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full font-label-sm flex items-center gap-1 ${
                        item.status === 'READY_FOR_PICKUP' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {item.status === 'READY_FOR_PICKUP' ? 'check_circle' : 'schedule'}
                        </span>
                        {item.status === 'READY_FOR_PICKUP' ? 'Sẵn sàng lấy' : 'Đang chờ'}
                      </span>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button 
                        onClick={() => handleCancel(item.id)}
                        className="px-4 py-2 text-error font-bold border border-error/20 rounded-lg hover:bg-error/5"
                      >
                        Hủy yêu cầu
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-4">
             <div className="bg-primary/5 rounded-xl border border-primary/20 p-stack-md">
                <h3 className="font-bold text-primary flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined">info</span>
                  Lưu ý đặt chỗ
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Khi sách sẵn sàng, bạn sẽ nhận được thông báo qua email. Vui lòng đến thư viện nhận sách trong vòng 3 ngày kể từ khi sách có sẵn.
                </p>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
