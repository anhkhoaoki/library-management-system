import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function Topbar({ userName = 'Người dùng', userRole = 'Vai trò' }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    dueDateReminders: true,
    marketingEmails: false
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Lỗi lấy thông báo:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err);
    }
  };

  const openSettings = async () => {
    setShowDropdown(false);
    setShowSettings(true);
    setLoadingSettings(true);
    try {
      const res = await api.get('/notifications/settings');
      const dbData = res.data.data;
      if (dbData) {
        // Đọc dữ liệu từ Cột Database Backend tương ứng đổ lại vào State Giao diện FE
        setSettings({
          emailNotifications: dbData.emailEnabled ?? true,
          pushNotifications: dbData.inAppEnabled ?? true,
          dueDateReminders: dbData.dueDateReminder ?? true,
          marketingEmails: dbData.broadcast ?? false
        });
      }
    } catch (err) {
      console.error('Lỗi lấy cài đặt thông báo:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSettings = async () => {
    try {
      // Map các giá trị từ UI sang đúng tên các cột trong schema.prisma của Backend
      const payload = {
        emailEnabled: settings.emailNotifications,
        inAppEnabled: settings.pushNotifications,
        dueDateReminder: settings.dueDateReminders,
        broadcast: settings.marketingEmails,
        
        // Giữ mặc định true/false cho các trường nghiệp vụ thư viện khác mà UI chưa có
        smsEnabled: false,
        reservationReady: true,
        fineNotice: true
      };

      await api.put('/notifications/settings', payload);
      alert('Đã lưu cài đặt thông báo thành công!');
      setShowSettings(false);
    } catch (err) {
      console.error('Chi tiết lỗi lưu cài đặt từ Backend:', err.response?.data || err.message);
      alert('Lỗi lưu cài đặt, vui lòng thử lại!');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="hidden md:flex justify-between items-center px-margin-desktop py-stack-md bg-white border-b border-outline-variant sticky top-0 z-30">
      <div className="flex-1 max-w-2xl relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input
          className="w-full bg-surface-container-low border-none rounded-full py-3 pl-12 pr-12 focus:ring-2 focus:ring-secondary focus:bg-white transition-all font-body-md text-body-md text-on-surface placeholder:text-outline"
          placeholder="Tìm kiếm tài liệu, tác giả, ISBN..."
          type="text"
        />
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-secondary-container transition-colors"
          title="Tìm kiếm nâng cao"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </button>
      </div>

      <div className="flex items-center gap-stack-md ml-stack-lg">
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-variant shadow-lg rounded-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h4 className="font-title-md text-on-surface font-bold">Thông báo ({unreadCount})</h4>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Chặn sự kiện nổi bọt ảnh hưởng đếnDropdown
                        handleMarkAllAsRead();
                      }} 
                      className="text-[12px] text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Đã đọc hết
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Chặn sự kiện để khi bấm cài đặt không kích hoạt sự kiện cha
                      openSettings();
                    }} 
                    className="flex items-center text-on-surface-variant hover:text-primary bg-transparent border-none cursor-pointer"
                    title="Cài đặt thông báo"
                  >
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                  </button>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-sm">Không có thông báo mới</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={(e) => {
                        e.stopPropagation(); // Ngăn chặn sự kiện lan ra các thành phần giao diện khác
                        if (!notif.isRead) {
                          handleMarkAsRead(notif.id);
                        }
                      }}
                      className={`p-3 border-b border-outline-variant/50 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-surface-container-lowest ${notif.isRead ? 'opacity-60 bg-white' : 'bg-primary-container/10 border-l-4 border-l-primary'}`}
                    >
                      <h5 className={`text-sm text-on-surface ${!notif.isRead ? 'font-bold' : 'font-normal'}`}>
                        {notif.title}
                      </h5>
                      {/* Thay đổi từ .message thành .content để khớp với schema database backend */}
                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {notif.content || "Không có nội dung chi tiết"}
                      </p>
                      <span className="text-[10px] text-outline mt-1">{new Date(notif.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-stack-sm cursor-pointer hover:opacity-80 transition-opacity">
          <img
            alt="User profile avatar"
            className="w-10 h-10 rounded-full border border-outline-variant"
            src="https://ui-avatars.com/api/?name=User&background=0d9488&color=fff&size=80"
          />
          <div className="hidden lg:block">
            <p className="font-label-md text-label-md font-semibold text-on-surface">{userName}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{userRole}</p>
          </div>
        </div>
      </div>
      

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <h3 className="font-title-lg text-on-surface">Cài đặt thông báo</h3>
              <button onClick={() => setShowSettings(false)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {loadingSettings ? (
                <div className="text-center py-6 text-outline">Đang tải cấu hình...</div>
              ) : (
                <>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">Nhận thông báo qua Email</span>
                    <input type="checkbox" checked={settings.emailNotifications || false} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">Nhận thông báo Push</span>
                    <input type="checkbox" checked={settings.pushNotifications || false} onChange={(e) => setSettings({...settings, pushNotifications: e.target.checked})} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">Nhắc nhở hạn trả sách</span>
                    <input type="checkbox" checked={settings.dueDateReminders || false} onChange={(e) => setSettings({...settings, dueDateReminders: e.target.checked})} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">Email tin tức/Marketing</span>
                    <input type="checkbox" checked={settings.marketingEmails || false} onChange={(e) => setSettings({...settings, marketingEmails: e.target.checked})} />
                  </label>
                  
                  <button onClick={saveSettings} className="mt-4 w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-primary/90">
                    Lưu cài đặt
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}