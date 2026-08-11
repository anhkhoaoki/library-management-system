import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function ReservationsPage() {
  const { user } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const response = await api.get('/users/me/reservations');
      setReservations(response.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đặt chỗ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 30000);
    return () => clearInterval(interval);
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
          <h2 className="font-display-lg text-on-surface mb-stack-sm">Yêu cầu mượn sách</h2>
          <p className="font-body-md text-on-surface-variant">
            Các sách bạn đã yêu cầu mượn và đang chờ thủ thư xác nhận tại quầy.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
          <div className="xl:col-span-8 flex flex-col gap-stack-md">
            {reservations.length === 0 ? (
              <div className="bg-white rounded-xl p-20 text-center border border-dashed">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 block">event_seat</span>
                <p className="text-on-surface-variant italic">Bạn hiện không có yêu cầu mượn sách nào đang chờ xử lý.</p>
                <Link to="/dashboard/student/search" className="inline-block mt-4 text-primary font-bold hover:underline">
                  Tìm sách để mượn →
                </Link>
              </div>
            ) : (
              reservations.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-surface-variant p-stack-md flex flex-col sm:flex-row gap-stack-md relative">
                  <Link
                    to={`/dashboard/student/book/${item.book.id}`}
                    className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant block hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={item.book.coverImageUrl || 'https://via.placeholder.com/100x150'}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-stack-sm gap-2">
                      <div>
                        <h3 className="font-title-lg text-on-surface">{item.book.title}</h3>
                        <p className="text-sm text-on-surface-variant">{item.book.authorNames?.join(', ')}</p>
                        <p className="text-xs text-outline mt-1">
                          Yêu cầu lúc: {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      {item.status === 'READY_FOR_PICKUP' && (
                        <span className="px-3 py-1 rounded-full font-label-sm flex items-center gap-1 bg-success/10 text-success whitespace-nowrap">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Chờ xác nhận
                        </span>
                      )}
                      {item.status === 'WAITING' && (
                        <span className="px-3 py-1 rounded-full font-label-sm flex items-center gap-1 bg-tertiary/10 text-tertiary whitespace-nowrap">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          Đang chờ sách
                        </span>
                      )}
                    </div>

                    {/* {item.status === 'READY_FOR_PICKUP' && (
                      <div className="bg-success/5 border border-success/20 rounded-lg p-3 mb-2">
                        <p className="text-sm text-success font-medium">
                          Sách đã sẵn sàng! Vui lòng đến quầy thủ thư để xác nhận mượn.
                        </p>
                        {item.expiresAt && (
                          <p className="text-xs text-warning font-semibold mt-1">
                            Hạn lấy sách: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    )} */}

                    {item.status === 'WAITING' && (
                      <p className="text-xs text-on-surface-variant mb-2">
                        Vị trí trong hàng đợi: <span className="font-bold text-primary">#{item.queuePosition}</span>
                        {' '}— Bạn sẽ nhận email khi sách có sẵn.
                      </p>
                    )}

                    {(item.status === 'WAITING' || item.status === 'READY_FOR_PICKUP') && (
                      <div className="mt-auto flex justify-end gap-2">
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="px-4 py-2 text-error font-bold border border-error/20 rounded-lg hover:bg-error/5"
                        >
                          Hủy yêu cầu
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-4 space-y-4">
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-stack-md">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined">info</span>
                Lưu ý đặt chỗ
              </h3>
              <ul className="text-sm text-on-surface-variant space-y-2 list-disc list-inside">
                <li>Thông báo &quot;đã được duyệt&quot; chỉ gửi khi thủ thư xác nhận cho mượn tại quầy.</li>
                <li>Khi sách có sẵn (hàng đợi), bạn sẽ nhận thông báo đến quầy xác nhận mượn.</li>
                <li>Sau khi duyệt, sách chuyển sang mục &quot;Sách đang mượn&quot; và biến mất khỏi trang này.</li>
              </ul>
            </div>

            {/* <div className="bg-surface-container-low rounded-xl border border-outline-variant p-stack-md">
              <h3 className="font-bold text-on-surface flex items-center gap-2 mb-2 text-sm">
                <span className="material-symbols-outlined text-[18px]">help</span>
                Quy trình mượn sách
              </h3>
              <ol className="text-xs text-on-surface-variant space-y-2">
                <li><strong>1.</strong> Yêu cầu mượn từ trang chi tiết sách</li>
                <li><strong>2.</strong> Chờ sách sẵn sàng (nhận email thông báo)</li>
                <li><strong>3.</strong> Đến quầy thủ thư xác nhận mượn</li>
                <li><strong>4.</strong> Sách xuất hiện tại &quot;Sách đang mượn&quot;</li>
              </ol>
            </div> */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
