import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States dành cho Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null); // null = Thêm mới, object = Sửa
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    managerId: '' // Chứa UUID của Quản lý nếu có
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // 1. API: Lấy danh sách chi nhánh
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/branches');
      if (response.data.success) {
        setBranches(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Không thể tải danh sách chi nhánh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Mở modal tạo mới
  const handleAddBranchClick = () => {
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '', managerId: '' });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa và đổ dữ liệu cũ vào form
  const handleEditBranchClick = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      managerId: branch.managerId || ''
    });
    setIsModalOpen(true);
  };

  // 2 & 3. API: Xử lý Submit Form (Thêm mới HOẶC Cập nhật)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      alert('Tên chi nhánh và Địa chỉ là bắt buộc.');
      return;
    }

    setSubmitLoading(true);
    try {
      if (editingBranch) {
        // Thực hiện CALL API PUT: Cập nhật thông tin chi nhánh
        const response = await api.put(`/admin/branches/${editingBranch.id}`, formData);
        if (response.data.success) {
          // Cập nhật lại state cục bộ để UI thay đổi lập tức
          setBranches(branches.map(b => b.id === editingBranch.id ? response.data.data : b));
          setIsModalOpen(false);
        }
      } else {
        // Thực hiện CALL API POST: Tạo chi nhánh mới
        const response = await api.post('/admin/branches', formData);
        if (response.data.success) {
          // Thêm chi nhánh mới vừa tạo vào danh sách hiển thị
          setBranches([...branches, response.data.data]);
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving branch:', err);
      alert('Lỗi xử lý hệ thống: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  // 4. API: Xóa chi nhánh
  const handleDeleteBranch = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chi nhánh này?')) {
      try {
        const response = await api.delete(`/admin/branches/${id}`);
        if (response.data.success) {
          setBranches(branches.filter(b => b.id !== id));
        }
      } catch (err) {
        alert('Lỗi khi xóa chi nhánh: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Quản lý chi nhánh</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit max-w-2xl">
              Giám sát và cấu hình các điểm thư viện vệ tinh trong mạng lưới. Trạng thái đồng bộ và phân bổ tài nguyên được quản lý tự động.
            </p>
          </div>
          <button 
            onClick={handleAddBranchClick}
            className="bg-primary text-on-primary px-stack-md py-[10px] rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-fixed-variant transition-colors shadow-sm hover:shadow-md shrink-0 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm chi nhánh mới
          </button>
        </div>

        {/* Bento Grid of Branches */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-error">
            <span className="material-symbols-outlined text-[48px] mb-2">error</span>
            <p>{error}</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant bg-surface-container-lowest rounded-xl border border-outline-variant">
            <span className="material-symbols-outlined text-[48px] mb-2">domain_disabled</span>
            <p>Chưa có chi nhánh nào được cấu hình</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {branches.map((branch) => (
              <article
                key={branch.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group"
              >
                <div className={`absolute top-0 left-0 w-full h-1 z-10 ${branch.isActive !== false ? 'bg-secondary' : 'bg-outline'}`}></div>
                <div className="h-32 w-full bg-surface-container-high relative flex items-center justify-center overflow-hidden">
                  {branch.image ? (
                    <>
                      <img alt={branch.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" src={branch.image} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-primary-container/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary/40 text-[64px]">domain</span>
                    </div>
                  )}
                  <div className="absolute bottom-stack-sm left-stack-md right-stack-md flex justify-between items-end">
                    {branch.isActive !== false ? (
                      <span className="bg-secondary/90 text-on-secondary px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Hoạt động
                      </span>
                    ) : (
                      <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 border border-outline-variant shadow-sm backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[14px]">pause_circle</span>
                        Tạm dừng
                      </span>
                    )}
                  </div>
                </div>
                <div className={`p-stack-md flex flex-col flex-1 gap-stack-sm ${branch.isActive === false ? 'opacity-70' : ''}`}>
                  <h3 className="font-title-lg text-title-lg text-on-surface">{branch.name}</h3>
                  <div className="flex flex-col gap-2 mt-2 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-outline mt-[2px] text-[20px]">location_on</span>
                      <span className="font-body-md text-body-md text-on-surface-variant">{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline text-[20px]">call</span>
                      <span className="font-body-md text-body-md text-on-surface-variant">{branch.phone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline text-[20px]">badge</span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        {branch.manager?.fullName || branch.manager?.name || 'Đang tuyển dụng'} (Quản lý)
                      </span>
                    </div>
                  </div>
                  {/* Card Actions */}
                  <div className="mt-stack-md pt-stack-sm border-t border-surface-variant flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      {branch.isActive !== false ? (
                        <>
                          <span className="material-symbols-outlined text-secondary-fixed-dim text-[16px]">cloud_sync</span>
                          <span className="font-label-sm text-label-sm text-secondary">Đồng bộ 100%</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-outline text-[16px]">sync_problem</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Tạm ngưng kết nối</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditBranchClick(branch)}
                        className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="p-2 rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* COMPONENT MODAL: Thêm / Sửa Chi Nhánh */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-title-lg text-title-lg text-on-surface">
                {editingBranch ? 'Cập nhật chi nhánh' : 'Thêm chi nhánh mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-stack-md flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Tên chi nhánh *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg bg-background text-on-background focus:outline-none focus:border-primary"
                  placeholder="Ví dụ: Thư viện Cơ sở 3"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Địa chỉ *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg bg-background text-on-background focus:outline-none focus:border-primary"
                  placeholder="Nhập địa chỉ chi tiết"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg bg-background text-on-background focus:outline-none focus:border-primary"
                  placeholder="Nhập số điện thoại liên hệ"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface">Mã định danh Quản lý (Manager ID)</label>
                <input
                  type="text"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg bg-background text-on-background focus:outline-none focus:border-primary"
                  placeholder="Nhập chuỗi UUID của Quản lý (nếu có)"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  disabled={submitLoading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg font-label-md hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-fixed-variant transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitLoading && <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>}
                  {editingBranch ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}