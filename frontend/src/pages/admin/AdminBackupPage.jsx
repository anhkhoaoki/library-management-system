import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminBackupPage() {
  const [backups, setBackups] = useState([]);
  const [summary, setSummary] = useState({ totalBackups: 0, latestBackupAt: null, totalSizeBytes: 0, totalSize: '0 B' });
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState(null);

  const formatBytes = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/backups');
      if (response.data?.success) {
        const payload = response.data.data;
        const backupList = Array.isArray(payload) ? payload : payload?.backups || [];
        setBackups(backupList);
        const nextSummary = payload?.summary || {
          totalBackups: backupList.length,
          latestBackupAt: backupList[0]?.time || null,
          totalSizeBytes: backupList.reduce((sum, item) => sum + (item.sizeBytes || 0), 0),
          totalSize: formatBytes(backupList.reduce((sum, item) => sum + (item.sizeBytes || 0), 0)),
        };
        setSummary(nextSummary);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Không thể tải danh sách bản sao lưu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      const response = await api.post('/admin/backups');
      if (response.data?.success) {
        toast.success(response.data.message || 'Tạo bản sao lưu thành công');
        fetchBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Lỗi khi tạo bản sao lưu');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`Bạn có chắc muốn áp dụng cấu hình và danh sách chi nhánh từ bản sao lưu ${filename}? Hành động này chỉ ảnh hưởng đến cấu hình hệ thống và chi nhánh, không thay đổi toàn bộ dữ liệu sách/người dùng.`)) {
      return;
    }
    const toastId = toast.loading('Đang áp dụng cấu hình từ bản sao lưu...');
    setRestoringFilename(filename);
    setRestoreFeedback(null);
    try {
      const response = await api.post('/admin/backups/restore', { filename });
      if (response.data?.success) {
        const message = response.data.message || 'Đã áp dụng xong cấu hình và chi nhánh từ bản sao lưu';
        setRestoreFeedback({ type: 'success', title: 'Thành công', message, scope: response.data.restoredScope || ['systemConfigs', 'branches'] });
        toast.success(message, { id: toastId });
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setRestoreFeedback({ type: 'error', title: 'Thất bại', message: 'Không thể áp dụng bản sao lưu. Vui lòng thử lại.' });
      toast.error('Lỗi khi áp dụng bản sao lưu', { id: toastId });
    } finally {
      setRestoringFilename('');
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Bạn có chắc muốn xoá bản sao lưu ${filename} khỏi server? Hành động này không thể hoàn tác.`)) {
      return;
    }

    const toastId = toast.loading('Đang xoá bản sao lưu...');
    try {
      const response = await api.delete(`/admin/backups/${encodeURIComponent(filename)}`);
      if (response.data?.success) {
        toast.success(response.data.message || 'Đã xoá bản sao lưu', { id: toastId });
        fetchBackups();
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Không thể xoá bản sao lưu', { id: toastId });
    }
  };

  const handleDownload = (filename) => {
    const token = localStorage.getItem('accessToken');
    const baseUrl = import.meta.env.VITE_API_URL || api.defaults.baseURL || 'http://localhost:3000/api/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/admin/backups/${encodeURIComponent(filename)}/download`;

    toast.promise(
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then(blob => {
        const windowUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = windowUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(windowUrl);
      }),
      {
        loading: 'Đang tải file...',
        success: 'Tải xong!',
        error: 'Lỗi tải file',
      }
    );
  };


  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface mb-unit">Sao lưu & Phục hồi</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Quản lý an toàn dữ liệu hệ thống thư viện và thiết lập các điểm khôi phục.</p>
          </div>
          <button 
            onClick={handleCreateBackup}
            disabled={isCreating}
            className={`bg-primary text-on-primary hover:opacity-90 transition-colors rounded-lg px-stack-md py-stack-md flex items-center justify-center gap-2 shadow-sm w-full md:w-auto font-label-md text-label-md ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCreating ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                backup
              </span>
            )}
            {isCreating ? 'Đang tạo...' : 'Tạo bản sao lưu mới'}
          </button>
        </div>

        {/* <div className="bg-primary-container/40 border border-primary/20 rounded-xl p-stack-lg">
          <h3 className="font-title-lg text-title-lg text-on-surface mb-2">Luồng hoạt động</h3>
          <ol className="list-decimal ml-5 space-y-2 font-body-md text-body-md text-on-surface-variant">
            <li>Tạo bản sao lưu: hệ thống ghi lại snapshot dữ liệu hiện tại từ CSDL vào một file JSON trên server.</li>
            <li>Tải về: bạn có thể tải file backup về máy để lưu trữ ngoài hệ thống.</li>
            <li>Phục hồi: hệ thống chỉ áp dụng lại cấu hình hệ thống và danh sách chi nhánh từ file backup, không thay đổi toàn bộ dữ liệu sách/người dùng.</li>
            <li>Xoá bản sao: xoá file backup khỏi server khi không còn cần thiết.</li>
          </ol>
        </div> */}

        {restoreFeedback && (
          <div className={`rounded-xl border px-4 py-3 ${restoreFeedback.type === 'success' ? 'border-secondary bg-secondary-container/40 text-on-secondary-container' : 'border-error bg-error-container/40 text-on-error-container'}`}>
            <div className="font-title-md text-title-md">{restoreFeedback.title}</div>
            <p className="font-body-md text-body-md mt-1">{restoreFeedback.message}</p>
            {restoreFeedback.scope && (
              <p className="font-body-sm text-body-sm mt-2">Phạm vi áp dụng: {restoreFeedback.scope.join(', ')}</p>
            )}
          </div>
        )}

        {/* Bento Grid: Status & Storage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
          {/* System Health Card */}
          <div className="md:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-stack-lg flex flex-col justify-between border-l-4 border-secondary-container relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-fixed-dim rounded-full opacity-10 blur-xl"></div>
            <div>
              <div className="flex items-center gap-2 mb-stack-sm">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  health_and_safety
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Trạng thái Hệ thống</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">Các bản sao lưu được tạo trực tiếp từ dữ liệu hiện tại của hệ thống và có thể tải xuống hoặc áp dụng lại phần cấu hình/chi nhánh từ đây.</p>
            </div>
            <div className="mt-stack-md flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              <span className="font-label-md text-label-md text-on-surface">Bản sao lưu thực tế từ CSDL</span>
            </div>
          </div>
          {/* Storage Analytics Card */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-stack-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-stack-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">storage</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Tổng dung lượng bản sao lưu</h3>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-variant text-on-surface-variant px-2 py-1 rounded">{summary.totalBackups} bản</span>
            </div>
            <div className="mb-stack-sm">
              <div className="flex justify-between font-label-md text-label-md mb-2">
                <span className="text-on-surface">Đã lưu: {summary.totalSize}</span>
                <span className="text-on-surface-variant">Lần gần nhất: {summary.latestBackupAt ? new Date(summary.latestBackupAt).toLocaleString('vi-VN') : 'Chưa có'}</span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Dữ liệu được tổng hợp trực tiếp từ các file sao lưu hiện có trên server. Mỗi file chứa snapshot từ CSDL với thông tin người dùng, sách, mượn/trả, tiền phạt, chi nhánh, cấu hình và nhật ký.</p>
          </div>
        </div>

        {/* Section Title */}
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-stack-md">Danh sách Bản sao lưu</h3>

        {/* Backup Records List */}
        <div className="flex flex-col gap-stack-md">
          {loading ? (
             <div className="flex justify-center p-8">
               <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : backups.length === 0 ? (
             <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant font-body-md border border-outline-variant border-dashed">
               Chưa có bản sao lưu nào. Bấm "Tạo bản sao lưu mới" để tạo file đầu tiên.
             </div>
          ) : (
            backups.map((backup) => {
              const d = new Date(backup.time);
              const formattedTime = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
              return (
              <div
                key={backup.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-stack-md flex flex-col md:flex-row md:items-center justify-between border border-transparent hover:border-outline-variant transition-all hover:shadow-md"
              >
                <div className="flex items-start md:items-center gap-stack-md mb-stack-md md:mb-0">
                  <div className={`w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 ${backup.status === 'Archived' ? 'opacity-70' : ''}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {backup.status === 'Success' ? 'cloud_done' : 'cloud_done'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-unit">
                      <h4 className="font-title-lg text-title-lg text-on-surface">{backup.filename}</h4>
                      {backup.isLatest && (
                        <span className="rounded-full px-2 py-0.5 font-label-sm text-label-sm border bg-primary-container text-on-primary-container border-primary-fixed">
                          Mới nhất
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm border ${
                          backup.status === 'Success' ? 'bg-secondary-container text-on-secondary-container border-secondary-fixed' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {backup.status === 'Success' ? 'Thành công' : 'Đã lưu trữ'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-md text-body-md text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span> {formattedTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">hard_drive</span> {backup.size}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          {backup.source === 'database' ? 'storage' : 'person'}
                        </span>{' '}
                        {backup.type}
                      </span>
                    </div>
                    {backup.note && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{backup.note}</p>
                    )}
                    {backup.recordCounts && Object.keys(backup.recordCounts).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(backup.recordCounts).map(([key, value]) => (
                          <span key={key} className="rounded-full border border-outline-variant px-2 py-1 text-xs text-on-surface-variant">
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-stack-sm md:ml-stack-md self-end md:self-auto">
                  <button 
                    onClick={() => handleDownload(backup.filename)} 
                    className="border border-outline text-primary hover:bg-primary-container/30 hover:border-primary rounded px-4 py-2 font-label-md text-label-md transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Tải về
                  </button>
                  <button
                    onClick={() => handleRestoreBackup(backup.filename)}
                    disabled={restoringFilename === backup.filename}
                    className={`border border-outline text-primary hover:bg-surface-container-highest rounded px-4 py-2 font-label-md text-label-md transition-colors flex items-center gap-2 ${restoringFilename === backup.filename ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">settings_backup_restore</span>
                    {restoringFilename === backup.filename ? 'Đang áp dụng...' : 'Phục hồi cấu hình'}
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.filename)}
                    className="border border-error text-error hover:bg-error-container rounded px-4 py-2 font-label-md text-label-md transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                    Xoá bản sao
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      </div>
    </MainLayout>
  );
}
