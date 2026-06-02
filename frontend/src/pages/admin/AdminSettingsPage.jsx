import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/system-config');
      if (response.data.success) {
        setConfigs(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching configs:', err);
      setError('Không thể tải cấu hình hệ thống. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleInputChange = (key, newValue) => {
    setConfigs(prev => prev.map(config => 
      config.key === key ? { ...config, value: newValue } : config
    ));
    // Clear success message when user makes changes
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const updates = configs.map(c => ({ key: c.key, value: c.value }));
      const response = await api.put('/admin/system-config', { updates });
      if (response.data.success) {
        setSuccessMsg('Đã lưu cấu hình thành công!');
        // Refresh to ensure we have latest DB state
        fetchConfigs();
      }
    } catch (err) {
      console.error('Error saving configs:', err);
      setError('Lỗi khi lưu cấu hình: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Helper to format keys if description is missing
  const formatKeyName = (key) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
          <div className="flex flex-col gap-unit">
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Cấu hình hệ thống</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Thiết lập các tham số vận hành, quy định mượn trả và cấu hình bảo mật hệ thống.
            </p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || loading || configs.length === 0}
            className="bg-primary text-on-primary font-label-md text-label-md px-stack-md py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-[20px]">save</span>
            )}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </header>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <p className="font-body-md text-body-md">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="font-body-md text-body-md">{successMsg}</p>
          </div>
        )}

        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex flex-col min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full flex-1 min-h-[300px]">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 font-body-md text-on-surface-variant">Đang tải cấu hình...</p>
            </div>
          ) : configs.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center h-full flex-1 min-h-[300px] text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-50">settings_off</span>
              <p className="font-body-md text-body-md">Chưa có dữ liệu cấu hình nào trong hệ thống.</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col divide-y divide-outline-variant/30">
              {configs.map((config) => (
                <div key={config.id || config.key} className="p-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-stack-md hover:bg-surface-container-lowest/50 transition-colors">
                  <div className="flex-1 max-w-2xl">
                    <h3 className="font-title-md text-title-md text-on-surface mb-1">
                      {config.description || formatKeyName(config.key)}
                    </h3>
                    <p className="font-label-sm text-label-sm text-outline font-mono bg-surface-container-high inline-block px-1.5 py-0.5 rounded">
                      {config.key}
                    </p>
                  </div>
                  <div className="w-full md:w-1/3 min-w-[250px]">
                    <input
                      type="text"
                      className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-shadow"
                      value={config.value}
                      onChange={(e) => handleInputChange(config.key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </form>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
