import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api'; // Đường dẫn import api của dự án

export default function CommunicationsPage() {
  // Khởi tạo các State quản lý dữ liệu Form nhập liệu
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState('IN_APP'); // Mặc định kênh gửi ban đầu
  const [targetRole, setTargetRole] = useState('');    // Rỗng tức là "Tất cả người dùng"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách dữ liệu lịch sử tĩnh ban đầu của bạn
  const [history] = useState([
    {
      id: 1,
      title: 'Thông báo bảo trì hệ thống mượn trả',
      audience: 'Tất cả',
      channels: 'App & Email',
      time: 'Hôm nay, 08:30',
      status: 'sent',
    },
    {
      id: 2,
      title: 'Danh sách tài liệu học tập mới cho học kỳ II',
      audience: 'Sinh viên',
      channels: 'App',
      time: 'Hôm qua, 14:15',
      status: 'sent',
    },
    {
      id: 3,
      title: 'Cập nhật quy định trả sách muộn',
      audience: 'Giảng viên',
      channels: 'Email',
      time: '20/10/2023',
      status: 'draft',
    },
    {
      id: 4,
      title: 'Khảo sát chất lượng dịch vụ thư viện',
      audience: 'Tất cả',
      channels: 'Email',
      time: '18/10/2023',
      status: 'failed',
    },
  ]);

  // Hàm xử lý gọi API gửi thông báo đại trà lên hệ thống
  const handleBroadcast = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        content,
        channel, // Nhận giá trị tương ứng: 'IN_APP', 'EMAIL', 'SMS'
      };

      // Chỉ đính kèm targetRole nếu người dùng chọn cụ thể Admin/Librarian/Reader
      if (targetRole) {
        payload.targetRole = targetRole;
      }

      await api.post('/notifications/broadcast', payload);
      alert('Gửi thông báo thành công!');
      
      // Xóa trống Form sau khi gửi thành công để chuẩn bị cho tin mới
      setTitle('');
      setContent('');
      setChannel('IN_APP');
      setTargetRole('');
    } catch (err) {
      console.error('Lỗi gửi thông báo đại trà:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện gửi thông báo!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hàm xử lý lưu nháp dữ liệu hiện tại (giữ nguyên không reset form để làm mẫu tiếp theo)
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
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channel === 'IN_APP' ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channel === 'IN_APP'}
                        onChange={() => setChannel('IN_APP')}
                        disabled={isSubmitting}
                      />
                      <span className="font-body-md text-body-md text-on-surface">Ứng dụng</span>
                    </label>

                    {/* Checkbox Email */}
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channel === 'EMAIL' ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channel === 'EMAIL'}
                        onChange={() => setChannel('EMAIL')}
                        disabled={isSubmitting}
                      />
                      <span className="font-body-md text-body-md text-on-surface">Email</span>
                    </label>

                    {/* Checkbox SMS */}
                    <label className={`flex items-center gap-2 cursor-pointer p-3 border border-outline-variant rounded-lg flex-1 hover:bg-surface-container-low transition-colors ${channel === 'SMS' ? 'bg-surface-container-low border-primary' : 'bg-surface-container-lowest'}`}>
                      <input 
                        className="text-primary focus:ring-primary w-4 h-4 rounded border-outline-variant" 
                        type="checkbox" 
                        checked={channel === 'SMS'}
                        onChange={() => setChannel('SMS')}
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
              <div className="flex flex-col gap-2 flex-1">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex justify-between items-center">
                  Nội dung chi tiết
                  <button type="button" className="text-secondary flex items-center gap-1 font-label-sm text-label-sm hover:underline">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    AI Hỗ trợ viết
                  </button>
                </label>
                <div className="border border-outline-variant rounded-lg flex flex-col flex-1 overflow-hidden">
                  {/* Toolbar */}
                  <div className="bg-surface-container border-b border-outline-variant p-2 flex gap-1 flex-wrap">
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">format_bold</span>
                    </button>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">format_italic</span>
                    </button>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">format_underlined</span>
                    </button>
                    <div className="w-px bg-outline-variant mx-1 my-1"></div>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                    </button>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">format_list_numbered</span>
                    </button>
                    <div className="w-px bg-outline-variant mx-1 my-1"></div>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">link</span>
                    </button>
                    <button type="button" className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </button>
                  </div>
                  {/* Text Area */}
                  <textarea
                    className="w-full flex-1 min-h-[200px] p-4 bg-surface-container-lowest outline-none font-body-md text-body-md resize-y text-on-surface"
                    placeholder="Soạn nội dung thông báo tại đây..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                  ></textarea>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-surface-variant">
                <button 
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg border border-primary text-primary font-label-md text-label-md font-semibold hover:bg-primary-fixed-dim transition-colors"
                >
                  Lưu nháp
                </button>
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
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Đã gửi trong tháng</p>
                <p className="font-display-lg text-display-lg text-primary">24</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <span className="material-symbols-outlined">mark_email_read</span>
              </div>
            </div>

            {/* History List */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
                <h3 className="font-title-lg text-title-lg text-on-surface">Lịch sử gửi</h3>
                <button type="button" className="text-primary font-label-sm text-label-sm hover:underline">Xem tất cả</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-surface-container-low rounded-lg transition-colors border-b border-surface-variant last:border-0 cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-label-md text-label-md text-on-surface font-semibold line-clamp-1">{item.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] whitespace-nowrap ml-2 ${
                          item.status === 'sent'
                            ? 'bg-[#e6f4ea] text-[#1e8e3e]'
                            : item.status === 'draft'
                            ? 'bg-surface-variant text-on-surface-variant'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {item.status === 'sent' ? 'Đã gửi' : item.status === 'draft' ? 'Bản nháp' : 'Thất bại'}
                      </span>
                    </div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">
                      {item.audience} • {item.channels}
                    </p>
                    <p className="font-label-sm text-label-sm text-outline text-xs">{item.time}</p>
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