import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const response = await api.get(`/admin/users?${params}`);
      if (response.data.success) {
        // Handle different possible response structures
        setUsers(response.data.users || response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalUsers(response.data.totalUsers || response.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Không thể tải danh sách người dùng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const response = await api.patch(`/admin/users/${id}/status`, { status: newStatus });
      if (response.data.success) {
        setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
      }
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleChangeRole = async (id, currentRole) => {
    const roles = ['READER', 'LIBRARIAN', 'ADMIN'];
    const currentIndex = roles.indexOf(currentRole);
    const newRole = roles[(currentIndex + 1) % roles.length];
    
    if (window.confirm(`Bạn có chắc muốn đổi vai trò thành ${newRole}?`)) {
      try {
        const response = await api.patch(`/admin/users/${id}/role`, { role: newRole });
        if (response.data.success) {
          setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        }
      } catch (err) {
        alert('Lỗi khi phân quyền: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const displayRole = (role) => {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'LIBRARIAN') return 'Thủ thư';
    return 'Bạn đọc';
  };

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-unit">Quản lý tài khoản người dùng</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Quản lý danh sách, phân quyền và trạng thái hoạt động của người dùng hệ thống.
            </p>
          </div>
          <div className="flex gap-stack-sm">
            <button 
              className="flex items-center gap-unit bg-primary text-on-primary font-label-md text-label-md px-stack-md py-2 rounded-lg hover:shadow-md transition-shadow"
              onClick={() => alert('Tính năng thêm người dùng đang phát triển.')}
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              Thêm người dùng
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant/30 flex flex-col md:flex-row gap-stack-md items-center justify-between">
          <div className="flex-1 w-full max-w-md relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-lg py-2.5 pl-10 pr-4 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all"
              placeholder="Tìm kiếm theo tên, email..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />
          </div>
          <div className="flex gap-stack-sm w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <select 
              className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest cursor-pointer min-w-[140px]"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả Vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="LIBRARIAN">Thủ thư</option>
              <option value="READER">Bạn đọc</option>
            </select>
            <select 
              className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest cursor-pointer min-w-[140px]"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả Trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="SUSPENDED">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* User Data Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant/30 overflow-hidden flex-1">
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-error">
                <span className="material-symbols-outlined text-[48px] mb-2">error</span>
                <p>{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] mb-2">person_search</span>
                <p>Không tìm thấy người dùng nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md border-b border-outline-variant/50">
                    <th className="p-stack-md font-medium">Họ tên</th>
                    <th className="p-stack-md font-medium">Email</th>
                    <th className="p-stack-md font-medium">Vai trò</th>
                    <th className="p-stack-md font-medium">Trạng thái</th>
                    <th className="p-stack-md font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/30">
                  {users.map((user) => {
                    const isAdmin = user.role === 'ADMIN';
                    const isLocked = user.status === 'SUSPENDED';
                    const roleLabel = displayRole(user.role);
                    
                    return (
                    <tr key={user.id} className={`hover:bg-surface-container-low/50 transition-colors group ${isAdmin ? 'bg-primary-fixed/10' : ''}`}>
                      <td className="p-stack-md">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              isAdmin ? 'bg-primary text-on-primary shadow-sm' : user.role === 'LIBRARIAN' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container'
                            } ${isLocked ? 'opacity-70' : ''}`}
                          >
                            {getInitials(user.fullName || user.name)}
                          </div>
                          <span className={`font-medium ${isAdmin ? 'text-primary' : isLocked ? 'text-on-surface-variant' : ''}`}>
                            {user.fullName || user.name}
                          </span>
                        </div>
                      </td>
                      <td className={`p-stack-md text-on-surface-variant ${isLocked ? 'opacity-80' : ''}`}>{user.email}</td>
                      <td className="p-stack-md">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">shield_person</span>
                            Admin
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full font-label-sm text-label-sm ${
                              user.role === 'LIBRARIAN'
                                ? 'bg-primary-container/20 text-primary border border-primary-container'
                                : 'bg-surface-container-high text-on-surface'
                            } ${isLocked ? 'opacity-80' : ''}`}
                          >
                            {roleLabel}
                          </span>
                        )}
                      </td>
                      <td className="p-stack-md">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm border ${
                            !isLocked
                              ? 'bg-secondary-container/30 text-on-secondary-container border-secondary-container'
                              : 'bg-error-container/30 text-on-error-container border-error-container'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${!isLocked ? 'bg-secondary' : 'bg-error'}`}></span>
                          {!isLocked ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="p-stack-md text-right">
                        {isAdmin ? (
                          <span className="text-label-sm text-outline italic">Không thể thao tác</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleChangeRole(user.id, user.role)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md transition-colors"
                              title="Chỉnh sửa vai trò"
                            >
                              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                            </button>
                            {!isLocked ? (
                              <button
                                onClick={() => handleToggleStatus(user.id, user.status)}
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
                                title="Khóa tài khoản"
                              >
                                <span className="material-symbols-outlined text-[20px]">lock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(user.id, user.status)}
                                className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-container/30 rounded-md transition-colors"
                                title="Mở khóa tài khoản"
                              >
                                <span className="material-symbols-outlined text-[20px]">lock_open</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && !error && users.length > 0 && (
            <div className="p-stack-md border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest">
              <span className="font-body-md text-body-md text-on-surface-variant">
                Hiển thị {((page - 1) * 10) + 1}-{Math.min(page * 10, totalUsers)} trong số {totalUsers} người dùng
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors rounded"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded font-label-md transition-colors ${
                      page === p 
                        ? 'bg-primary-container text-on-primary-container' 
                        : 'hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors rounded"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
