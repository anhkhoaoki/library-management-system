import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function CommunicationsPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState(['IN_APP']);
  const [targetRole, setTargetRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historySummary, setHistorySummary] = useState({ total: 0, unreadCount: 0 });

  useEffect(() => {
    fetchNotificationsHistory();
  }, []);

  const fetchNotificationsHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await api.get('/notifications', { params: { page: 1, limit: 8, allChannels: true } });
      const items = response.data.data || [];
      setHistory(items);
      setHistorySummary({
        total: response.data.pagination?.total ?? items.length,
        unreadCount: response.data.unreadCount ?? 0,
      });
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Không thể tải lịch sử thông báo');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryTime = (value) => {
    if (!value) return 'Vừa gửi';
    try {
      return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Vừa gửi';
    }
  };

  const resolveChannelLabel = (value) => {
    switch (value) {
      case 'EMAIL':
        return 'Email';
      case 'SMS':
        return 'SMS';
      default:
        return 'Ứng dụng';
    }
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    if (channels.length === 0) {
      alert('Vui lòng chọn ít nhất 1 kênh gửi!');
      return;
    }

    setIsSubmitting(true);
    try {
      const apiResponses = [];
      for (const ch of channels) {
        const payload = {
          title,
          content,
          channel: ch,
        };

        if (targetRole) {
          payload.targetRole = targetRole;
        }

        const res = await api.post('/notifications/broadcast', payload);
        if (res.data && res.data.data && res.data.data.message) {
          apiResponses.push(res.data.data.message);
        }
      }
      
      if (apiResponses.length > 0) {
        alert('Kết quả gửi:\n\n' + apiResponses.join('\n\n'));
      } else {
        alert('Gửi thông báo thành công qua các kênh đã chọn!');
      }
      setTitle('');
      setContent('');
      setChannels(['IN_APP']);
      setTargetRole('');
      await fetchNotificationsHistory();
    } catch (err) {
      console.error('Lỗi gửi thông báo đại trà:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện gửi thông báo!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập ít nhất tiêu đề để lưu bản nháp!');
      return;
    }
    alert('Đã lưu dữ liệu thông báo vào trạng thái nháp thành công!');
  };

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Quản lý truyền thông</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Tạo và gửi thông báo đại trà đến các nhóm đối tượng trong thư viện.</p>
        </div>

        {/* Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Create Notification Form (Spans 8 cols) */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">campaign</span>
                Tạo thông báo mới
              </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-stack-md">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface font-semibold">Tiêu đề thông báo</label>
                <input
                  className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="Nhập tiêu đề..."
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Routing (Channel & Audience) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Kênh gửi</label>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    {/* Checkbox Ứng dụng */}
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channels.includes('IN_APP') ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channels.includes('IN_APP')}
                        onChange={(e) => setChannels(prev => e.target.checked ? [...prev, 'IN_APP'] : prev.filter(c => c !== 'IN_APP'))}
                        disabled={isSubmitting}
                      />
                      <span className="font-body-md text-body-md text-on-surface">Ứng dụng</span>
                    </label>

                    {/* Checkbox Email */}
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channels.includes('EMAIL') ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channels.includes('EMAIL')}
                        onChange={(e) => setChannels(prev => e.target.checked ? [...prev, 'EMAIL'] : prev.filter(c => c !== 'EMAIL'))}
                        disabled={isSubmitting}
                      />
                      <span className="font-body-md text-body-md text-on-surface">Email</span>
                    </label>

                    {/* Checkbox SMS */}
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channels.includes('SMS') ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channels.includes('SMS')}
                        onChange={(e) => setChannels(prev => e.target.checked ? [...prev, 'SMS'] : prev.filter(c => c !== 'SMS'))}
                        disabled={isSubmitting}
                      />
                      <span className="font-body-md text-body-md text-on-surface">SMS</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">Đối tượng nhận</label>
                  <div className="relative">
                    <select 
                      className="appearance-none w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">Tất cả người dùng</option>
                      <option value="ADMIN">Admin</option>
                      <option value="LIBRARIAN">Librarian</option>
                      <option value="READER">Reader</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
              </div>

              {/* Rich Text Content */}
              <div className="flex flex-col gap-2 flex-1 relative quill-container">
                <style dangerouslySetInnerHTML={{__html: `
                  .quill-container .ql-toolbar { border-radius: 0.5rem 0.5rem 0 0; background: var(--surface-container); border-color: var(--outline-variant); }
                  .quill-container .ql-container { border-radius: 0 0 0.5rem 0.5rem; background: var(--surface-container-lowest); border-color: var(--outline-variant); font-family: inherit; font-size: 0.875rem; min-height: 250px;}
                `}} />
                <label className="font-label-md text-label-md text-on-surface font-semibold flex justify-between items-center">
                  Nội dung chi tiết
                </label>
                <div className="flex flex-col flex-1">
                  <ReactQuill 
                    theme="snow" 
                    value={content} 
                    onChange={setContent} 
                    readOnly={isSubmitting}
                    placeholder="Soạn nội dung thông báo tại đây..."
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-surface-variant">
                {/* <button 
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg border border-primary text-primary font-label-md text-label-md font-semibold hover:bg-primary-fixed-dim transition-colors"
                >
                  Lưu nháp
                </button> */}
                <button 
                  type="button"
                  onClick={handleBroadcast}
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg text-on-primary font-label-md text-label-md font-semibold transition-colors shadow-sm flex items-center gap-2 ${
                    isSubmitting ? 'bg-outline-variant cursor-not-allowed' : 'bg-primary hover:bg-tertiary-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi thông báo'}
                </button>
              </div>
            </div>
          </div>

          {/* History Widget (Spans 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-gutter">
            {/* Analytics Mini Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant p-5 flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Thông báo mới</p>
                <p className="font-display-lg text-display-lg text-primary">{historySummary.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <span className="material-symbols-outlined">mark_email_read</span>
              </div>
            </div>

            {/* History List */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
                <h3 className="font-title-lg text-title-lg text-on-surface">Lịch sử gửi</h3>
                <span className="text-primary font-label-sm text-label-sm">{historySummary.unreadCount} chưa đọc</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {historyLoading ? (
                  <div className="p-3 text-sm text-on-surface-variant">Đang tải lịch sử thông báo...</div>
                ) : historyError ? (
                  <div className="p-3 text-sm text-error">{historyError}</div>
                ) : history.length === 0 ? (
                  <div className="p-3 text-sm text-on-surface-variant">Chưa có thông báo nào được gửi.</div>
                ) : history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-surface-container-low rounded-lg transition-colors border-b border-surface-variant last:border-0"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-label-md text-label-md text-on-surface font-semibold line-clamp-1">{item.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] whitespace-nowrap ml-2 ${
                          item.isRead ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {item.isRead ? 'Đã xem' : 'Mới'}
                      </span>
                    </div>
                    <div 
                      className="font-label-sm text-label-sm text-on-surface-variant mb-2 line-clamp-3 overflow-hidden text-ellipsis [&>p]:inline"
                      dangerouslySetInnerHTML={{ __html: item.content || 'Không có nội dung chi tiết.' }}
                    />
                    <p className="font-label-sm text-label-sm text-outline text-xs">
                      {resolveChannelLabel(item.channel)} • {formatHistoryTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}