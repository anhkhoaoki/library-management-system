import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminBranchesPage() {
  const branches = [
    {
      id: 1,
      name: 'Chi nhánh Trung tâm',
      address: '123 Đại lộ Trí Tuệ, Quận 1, TP. HCM',
      phone: '(028) 3812 3456',
      manager: 'Trần Mai Anh',
      status: 'active',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAixle242mnfrCtuXThiWbddhKR8ZJgmFVz9xVbsyz4hE8M5RN3D_RhFQ7Bxkoh2w8L9jikBWEj9RFve6V_CNAUe_zrHwhcmlUv-sUYBx-3qfaGy8nAvuzi7bbTMhEfO6i0DtNodacgvNMc3R-VzU503zwWRsrzPLV2THMnCIgtgDlB9DtPVp27a8-86o3Vo89nBbxemldy8VEsYP7_mt8H3apq6-PPwU2S9iBANneD-V2B0tI75kfk4YR6c_Z1yihZGSmcHmQVndwF',
      aiSync: '100%',
    },
    {
      id: 2,
      name: 'Chi nhánh Khu Công Nghệ',
      address: 'Tòa nhà Innovation, Khu CNC Thủ Đức',
      phone: '(028) 3999 8888',
      manager: 'Lê Hải Đăng',
      status: 'active',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDs694w3SmnyZWa2V-aDR_aL_PG20u70Npam8JWXeHUVptAo88esx37Ph0PyxG9OWPPh2mMH3_Gj0BTne14ZAcHXokaGzHFimj2mLjjZ_o2BNEJRWXUxxRroJgadaI-gCVwr3UR5jwvI7hMq46kV3XoCDD8Y3XNku1C9Trps26XGERasqKaQxqWgUbMajD3h4H9iWjlecxNVATC6sT3fwzyTyFih5lVjbAZs_SGaFSWYRvnJ6L7vkd-up9hw0z3-OV9l4lU495aqVj5',
      aiSync: '100%',
    },
    {
      id: 3,
      name: 'Chi nhánh Nam Sài Gòn',
      address: '45 Nguyễn Văn Linh, Quận 7, TP. HCM',
      phone: 'Chưa cập nhật',
      manager: 'Đang tuyển dụng',
      status: 'maintenance',
      image: null,
      aiSync: null,
    },
  ];

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Quản lý chi nhánh</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit max-w-2xl">
              Giám sát và cấu hình các điểm thư viện vệ tinh trong mạng lưới. Trạng thái đồng bộ và phân bổ tài nguyên tự động được quản lý bằng AI.
            </p>
          </div>
          <button className="bg-primary text-on-primary px-stack-md py-[10px] rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-fixed-variant transition-colors shadow-sm hover:shadow-md shrink-0 w-full sm:w-auto">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm chi nhánh mới
          </button>
        </div>

        {/* Bento Grid of Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {branches.map((branch) => (
            <article
              key={branch.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group"
            >
              <div className={`absolute top-0 left-0 w-full h-1 z-10 ${branch.status === 'active' ? 'bg-secondary' : 'bg-outline'}`}></div>
              <div className="h-32 w-full bg-surface-container-high relative flex items-center justify-center">
                {branch.image ? (
                  <>
                    <img alt={branch.name} className="w-full h-full object-cover opacity-80 mix-blend-multiply" src={branch.image} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </>
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-[48px]">domain_disabled</span>
                )}
                <div className="absolute bottom-stack-sm left-stack-md right-stack-md flex justify-between items-end">
                  {branch.status === 'active' ? (
                    <span className="bg-secondary/90 text-on-secondary px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Hoạt động
                    </span>
                  ) : (
                    <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 border border-outline-variant shadow-sm backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[14px]">pause_circle</span>
                      Đang bảo trì
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-stack-md flex flex-col flex-1 gap-stack-sm ${branch.status !== 'active' ? 'opacity-70' : ''}`}>
                <h3 className="font-title-lg text-title-lg text-on-surface">{branch.name}</h3>
                <div className="flex flex-col gap-2 mt-2 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-outline mt-[2px] text-[20px]">location_on</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">call</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[20px]">badge</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">{branch.manager} (Quản lý)</span>
                  </div>
                </div>
                {/* Card Actions */}
                <div className="mt-stack-md pt-stack-sm border-t border-surface-variant flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    {branch.aiSync ? (
                      <>
                        <span className="material-symbols-outlined text-secondary-fixed-dim text-[16px]">auto_awesome</span>
                        <span className="font-label-sm text-label-sm text-secondary">Đồng bộ AI {branch.aiSync}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-outline text-[16px]">sync_problem</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Tạm ngưng kết nối</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button className="p-2 rounded-full text-on-surface-variant hover:bg-error-container hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
