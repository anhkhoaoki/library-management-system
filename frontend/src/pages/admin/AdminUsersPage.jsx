import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminUsersPage() {
  const users = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      role: 'Bạn đọc',
      status: 'active',
      initials: 'NV',
    },
    {
      id: 2,
      name: 'Trần Thị B',
      email: 'tranthib.lib@example.com',
      role: 'Thủ thư',
      status: 'active',
      initials: 'TB',
    },
    {
      id: 3,
      name: 'Lê Văn C',
      email: 'levanc@example.com',
      role: 'Bạn đọc',
      status: 'locked',
      initials: 'LC',
    },
    {
      id: 4,
      name: 'System Admin',
      email: 'admin@intellectualheritage.com',
      role: 'Admin',
      status: 'active',
      initials: 'AD',
      isAdmin: true,
    },
  ];

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
            <button className="flex items-center gap-unit bg-primary text-on-primary font-label-md text-label-md px-stack-md py-2 rounded-lg hover:shadow-md transition-shadow">
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
            />
          </div>
          <div className="flex gap-stack-sm w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <select className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest cursor-pointer min-w-[140px]">
              <option value="">Tất cả Vai trò</option>
              <option value="admin">Admin</option>
              <option value="librarian">Thủ thư</option>
              <option value="reader">Bạn đọc</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-lg py-2.5 px-4 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest cursor-pointer min-w-[140px]">
              <option value="">Tất cả Trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* User Data Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant/30 overflow-hidden flex-1">
          <div className="overflow-x-auto">
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
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-surface-container-low/50 transition-colors group ${user.isAdmin ? 'bg-primary-fixed/10' : ''}`}>
                    <td className="p-stack-md">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            user.isAdmin ? 'bg-primary text-on-primary shadow-sm' : user.role === 'Thủ thư' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container'
                          } ${user.status === 'locked' ? 'opacity-70' : ''}`}
                        >
                          {user.initials}
                        </div>
                        <span className={`font-medium ${user.isAdmin ? 'text-primary' : user.status === 'locked' ? 'text-on-surface-variant' : ''}`}>{user.name}</span>
                      </div>
                    </td>
                    <td className={`p-stack-md text-on-surface-variant ${user.status === 'locked' ? 'opacity-80' : ''}`}>{user.email}</td>
                    <td className="p-stack-md">
                      {user.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">shield_person</span>
                          Admin
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full font-label-sm text-label-sm ${
                            user.role === 'Thủ thư'
                              ? 'bg-primary-container/20 text-primary border border-primary-container'
                              : 'bg-surface-container-high text-on-surface'
                          } ${user.status === 'locked' ? 'opacity-80' : ''}`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-stack-md">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm border ${
                          user.status === 'active'
                            ? 'bg-secondary-container/30 text-on-secondary-container border-secondary-container'
                            : 'bg-error-container/30 text-on-error-container border-error-container'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-secondary' : 'bg-error'}`}></span>
                        {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="p-stack-md text-right">
                      {user.isAdmin ? (
                        <span className="text-label-sm text-outline italic">Không thể thao tác</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-md transition-colors"
                            title="Chỉnh sửa vai trò"
                          >
                            <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                          </button>
                          {user.status === 'active' ? (
                            <button
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
                              title="Khóa tài khoản"
                            >
                              <span className="material-symbols-outlined text-[20px]">lock</span>
                            </button>
                          ) : (
                            <button
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
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-stack-md border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest">
            <span className="font-body-md text-body-md text-on-surface-variant">Hiển thị 1-4 trong số 120 người dùng</span>
            <div className="flex items-center gap-1">
              <button className="p-1 text-outline hover:text-on-surface disabled:opacity-50 transition-colors rounded" disabled>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary-container text-on-primary-container font-label-md">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant font-label-md transition-colors">
                2
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant font-label-md transition-colors">
                3
              </button>
              <span className="px-1 text-outline">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant font-label-md transition-colors">
                12
              </button>
              <button className="p-1 text-on-surface-variant hover:text-on-surface transition-colors rounded">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
