import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function LibrarianDashboard() {
  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Header & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Tổng quan hôm nay</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-stack-sm">Chào buổi sáng, hệ thống đang hoạt động ổn định.</p>
          </div>
          <div className="flex gap-stack-sm">
            <button className="flex items-center gap-stack-sm px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm hover:shadow-md">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                qr_code_scanner
              </span>
              Mượn sách
            </button>
            <button className="flex items-center gap-stack-sm px-6 py-3 bg-surface-container-lowest text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm">
              <span className="material-symbols-outlined">keyboard_return</span>
              Trả sách
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Stat Card 1 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-primary-container rounded-lg text-on-primary-container">
                <span className="material-symbols-outlined">book</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Đang mượn</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">1,248</h3>
              <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +12% so với tuần trước
              </p>
            </div>
          </div>
          {/* Stat Card 2 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-error-container rounded-lg text-on-error-container">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Quá hạn</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">42</h3>
              <p className="font-label-sm text-label-sm text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +3 trường hợp mới
              </p>
            </div>
          </div>
          {/* Stat Card 3 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                <span className="material-symbols-outlined">event_seat</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Yêu cầu giữ chỗ</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">86</h3>
              <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                Cần xử lý: 15
              </p>
            </div>
          </div>
          {/* Stat Card 4 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-tertiary-container rounded-lg text-on-tertiary-container">
                <span className="material-symbols-outlined">local_shipping</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Mượn liên chi nhánh</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">24</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                Đang giao: 8
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area: AI Forecast & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* AI Forecast Section (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-stack-md relative overflow-hidden group hover:shadow-[0_0_20px_rgba(13,148,136,0.15)] transition-shadow">
            {/* Wisdom Glow Background Effect */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-fixed opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-stack-md">
              <div className="flex items-center gap-stack-sm">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Dự báo nhu cầu AI</h3>
              </div>
              <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded font-label-sm text-label-sm font-bold">
                AI Insight
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
              Các tựa sách sau được dự báo sẽ thiếu hụt trong 7 ngày tới dựa trên xu hướng mượn và phân tích học phần.
            </p>
            <div className="space-y-stack-sm">
              {/* AI Item 1 */}
              <div className="flex items-center justify-between p-stack-sm bg-surface rounded-lg border-l-4 border-secondary hover:shadow-md transition-shadow">
                <div className="flex items-center gap-stack-md">
                  <div className="w-12 h-16 bg-surface-variant rounded overflow-hidden">
                    <img
                      alt="Book Cover"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA30OxM-VAyjXk2T3NWijDZwQ2SHfRi-9i3QqfsiwqE8S4QttbMsqt8lAgDV8g3i6xPfv1iSlylPf9_A7mY-XWa5WJ10x2u5UFw2kggn2iotfhCc0j7xmN5H2Xi1Lbn2F2DLSzjWtr4_riuV9NuF0c4apDafL2yi-fnW1OCxx1W6LI7zVngyaAwyOuItyPMUj6Hs2sEVdrq01z2_Se2TZQAsxbjDDMEk1SN1T3ApRak4YR7s_GbI04xtN6cUadQ5z6vxC7Z7a-5I3bL"
                    />
                  </div>
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Cơ sở Dữ liệu Nâng cao</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Nguyễn Văn A</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-label-md text-label-md text-error">Tồn kho: 2</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Dự báo cần: 15</span>
                </div>
              </div>
              {/* AI Item 2 */}
              <div className="flex items-center justify-between p-stack-sm bg-surface rounded-lg border-l-4 border-secondary hover:shadow-md transition-shadow">
                <div className="flex items-center gap-stack-md">
                  <div className="w-12 h-16 bg-surface-variant rounded overflow-hidden">
                    <img
                      alt="Book Cover"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCzflHqFQLo0SJ05xw2sVWKwof4iuSsrDcSf2vtCBuTIRiChSmd4oNNCP1Xu3ytkShrYMNFMZaRzdIb0g08NQinuA9Q55xEALlDXsXVJ5XszoeNbcD5gy1FDgFTaaWCpuw05gDJrxR1tAJkL0RRA8NYfC0koZesGPDBslOOs2KghOWHmSxOyPjMrdoVKu_fl3-0hl4FgSuJlldTi1nwXjOKzMdPKjkFYDbi7I_FL5S6ngwM6QHKU34pVEI33AJWxzfCyqDSlEbqaok"
                    />
                  </div>
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Nhập môn Trí tuệ Nhân tạo</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Trần Thị B</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-label-md text-label-md text-error">Tồn kho: 0</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Dự báo cần: 8</span>
                </div>
              </div>
            </div>
          </div>
          {/* Recent Activities (1 column) */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-stack-md">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md">Hoạt động gần đây</h3>
            <div className="space-y-stack-md">
              {/* Activity Item */}
              <div className="flex gap-stack-sm relative">
                <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-surface-variant"></div>
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 z-10">
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">SV Nguyễn Trọng C đã trả sách</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Cấu trúc dữ liệu và giải thuật</p>
                  <p className="font-label-sm text-label-sm text-outline mt-1">10 phút trước</p>
                </div>
              </div>
              {/* Activity Item */}
              <div className="flex gap-stack-sm relative">
                <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-surface-variant"></div>
                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 z-10">
                  <span className="material-symbols-outlined text-[16px]">library_books</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">SV Lê Hoàng D mượn sách</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Kinh tế vĩ mô</p>
                  <p className="font-label-sm text-label-sm text-outline mt-1">45 phút trước</p>
                </div>
              </div>
              {/* Activity Item */}
              <div className="flex gap-stack-sm relative">
                <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0 z-10">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Cảnh báo quá hạn</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Lập trình Web nâng cao - SV Phạm E</p>
                  <p className="font-label-sm text-label-sm text-outline mt-1">2 giờ trước</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
