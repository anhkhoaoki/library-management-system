import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function TransferManagementPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchTransfers = async () => {
    try {
      const response = await api.get('/branches/transfers/pending');
      setTransfers(response.data.data);
    } catch (err) {
      console.error('Lỗi tải yêu cầu luân chuyển:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/branches/transfers/${id}/status`, { status });
      setMessage({ type: 'success', text: 'Cập nhật trạng thái thành công.' });
      fetchTransfers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi cập nhật.' });
    }
  };

  return (
    <MainLayout role="librarian" userName="Thủ thư" userRole="Librarian">
      <div className="max-w-container-max mx-auto space-y-stack-lg">
        <div className="flex justify-between items-end mb-stack-lg">
          <div>
            <h2 className="font-display-lg text-on-surface mb-stack-sm">Quản lý luân chuyển tài liệu</h2>
            <p className="font-body-md text-on-surface-variant">Xử lý các yêu cầu chuyển sách giữa các chi nhánh.</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
            <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-lowest border-b border-outline-variant">
              <tr>
                <th className="px-stack-md py-4 font-bold text-sm uppercase">Tài liệu</th>
                <th className="px-stack-md py-4 font-bold text-sm uppercase">Lộ trình</th>
                <th className="px-stack-md py-4 font-bold text-sm uppercase">Trạng thái</th>
                <th className="px-stack-md py-4 font-bold text-sm uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-stack-md py-10 text-center text-on-surface-variant italic">
                    {loading ? 'Đang tải dữ liệu...' : 'Hiện không có yêu cầu luân chuyển nào cần xử lý.'}
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-stack-md py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{t.physicalCopy.book.title}</span>
                        <span className="text-xs text-on-surface-variant font-mono">{t.physicalCopy.barcode}</span>
                      </div>
                    </td>
                    <td className="px-stack-md py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{t.fromBranchId}</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        <span className="font-medium text-primary">{t.toBranchId}</span>
                      </div>
                    </td>
                    <td className="px-stack-md py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'REQUESTED' ? 'bg-warning/10 text-warning' :
                          t.status === 'IN_TRANSIT' ? 'bg-info/10 text-info' :
                            'bg-success/10 text-success'
                        }`}>
                        {t.status === 'REQUESTED' ? 'Chờ xác nhận' :
                          t.status === 'IN_TRANSIT' ? 'Đang vận chuyển' : t.status}
                      </span>
                    </td>
                    <td className="px-stack-md py-4">
                      <div className="flex gap-2">
                        {t.status === 'REQUESTED' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'IN_TRANSIT')}
                            className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all"
                          >
                            Xác nhận đi
                          </button>
                        )}
                        {t.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'ARRIVED')}
                            className="bg-success text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-success/90 transition-all"
                          >
                            Xác nhận đến
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
