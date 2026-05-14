import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function CirculationPage() {
  const [readerId, setReaderId] = useState('SV-20214059');
  const [sessionItems] = useState([
    {
      id: 1,
      barcode: '893523642...',
      title: 'Thiết kế hệ thống dữ liệu quy mô lớn',
      author: 'Martin Kleppmann',
      type: 'return',
      status: 'Quá hạn 2 ngày',
      fine: '+10,000đ',
      isError: true,
    },
    {
      id: 2,
      barcode: '893606669...',
      title: 'Sapiens: Lược sử loài người',
      author: 'Yuval Noah Harari',
      type: 'borrow',
      status: 'Hạn trả: 24/11/2023',
      fine: null,
      isError: false,
    },
  ]);

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <header className="flex justify-between items-end pb-stack-sm border-b border-outline-variant">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Quản lý lưu thông</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit">Phiên làm việc: Ca sáng - Quầy 02</p>
          </div>
          <div className="hidden md:flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg font-label-md text-label-md transition-colors">
              <span className="material-symbols-outlined text-[20px]">print</span>
              In biên lai
            </button>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* LEFT COLUMN: Reader Identification & Profile (4 Columns) */}
          <div className="md:col-span-4 flex flex-col gap-stack-md">
            {/* Card 1: Scan Reader ID */}
            <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Định danh bạn đọc</h2>
                <span className="material-symbols-outlined text-outline">badge</span>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Quét thẻ hoặc nhập mã (UC-CIR-01)</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="Nhập mã sinh viên / CMND..."
                    type="text"
                    value={readerId}
                    onChange={(e) => setReaderId(e.target.value)}
                  />
                  <button className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center justify-center hover:bg-on-primary-fixed-variant transition-colors">
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Card 2: Reader Profile Summary */}
            <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden">
              <div className="p-stack-md bg-surface-bright flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-variant overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                  <img
                    alt="Reader Portrait"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiPrCWmlibcGr8MaatLI4m00BFJy3Phi347kS55DPbWpsVxMz5FI2ZcZVpkflLdSYwQVErjOf7ZVF7gy0u7bFHNLS-dKEft7sa2Y6WzGwsvP3O3XD1ppS5cMrTmsV3lVKwIpEa6NaOkJ9MyJgxSYGSTw53lvU-cyBcAmyTukR6cHOOVwsciE_RGjGwLnatzvh551Rzu8OBzAXazEaLimUTnWyN8nhS033ZXSsuU8vMpFBIQ0kp50RzNPgrsfT-W92M7HM4TvqwQW3W"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Nguyễn Thị Mai</h3>
                  <span className="font-body-md text-body-md text-on-surface-variant">Kỹ thuật Phần mềm - K66</span>
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm w-fit">
                    <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
                    Đang hoạt động
                  </div>
                </div>
              </div>
              <div className="px-stack-md py-stack-sm grid grid-cols-2 gap-4 border-t border-outline-variant">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Hạn mức mượn</span>
                  <span className="font-title-lg text-title-lg text-on-surface">3/5 cuốn</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Phí phạt nợ</span>
                  <span className="font-title-lg text-title-lg text-error">0 VNĐ</span>
                </div>
              </div>
            </section>

            {/* AI Insight Card */}
            <div className="relative p-[1px] rounded-xl bg-gradient-to-br from-secondary-container to-transparent opacity-90">
              <section className="bg-surface-container-lowest rounded-xl h-full p-stack-md shadow-[0_0_15px_rgba(134,242,228,0.15)] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-secondary">
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    <h4 className="font-label-md text-label-md font-bold">Gợi ý từ AI</h4>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                  Bạn đọc này thường mượn sách chuyên ngành AI. Đề xuất: "Machine Learning cơ bản" hiện đang có sẵn trên kệ A2.
                </p>
              </section>
            </div>
          </div>

          {/* RIGHT COLUMN: Transaction & Processing (8 Columns) */}
          <div className="md:col-span-8 flex flex-col gap-stack-md">
            {/* Card 3: Scan Book Barcode */}
            <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Xử lý sách (UC-CIR-02)</h2>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-md bg-surface-container-highest font-label-sm text-label-sm text-on-surface">Chế độ tự động</button>
                </div>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-md bg-surface-bright">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline">barcode_scanner</span>
                    </div>
                    <input
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-primary-fixed rounded-lg font-body-lg text-body-lg text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim transition-all shadow-inner"
                      placeholder="Quét mã vạch sách tại đây..."
                      type="text"
                    />
                  </div>
                  <button className="bg-primary hover:bg-primary-container text-on-primary px-6 py-3 rounded-lg font-title-lg text-title-lg transition-colors flex items-center gap-2 shadow-[0_4px_6px_rgba(0,35,111,0.2)]">
                    Mượn
                  </button>
                  <button className="bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low px-6 py-3 rounded-lg font-title-lg text-title-lg transition-colors flex items-center gap-2">
                    Trả
                  </button>
                </div>
              </div>
            </section>

            {/* Card 4 & 5: Current Session Table & Fines */}
            <section className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h2 className="font-title-lg text-title-lg text-on-surface">Phiên làm việc hiện tại</h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container py-1 px-2 rounded">2 mục được quét</span>
              </div>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-stack-md py-stack-sm bg-surface-container-low border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <div className="col-span-2">Mã Vạch</div>
                <div className="col-span-5">Tựa sách</div>
                <div className="col-span-2">Thao tác</div>
                <div className="col-span-3 text-right">Trạng thái / Phí phạt</div>
              </div>
              {/* Table Body */}
              <div className="flex-1 overflow-y-auto">
                {sessionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 gap-4 px-stack-md py-3 border-b border-outline-variant items-center hover:bg-surface-container-lowest transition-colors ${
                      item.isError ? 'bg-error-container/10' : ''
                    }`}
                  >
                    <div className="col-span-2 font-body-md text-on-surface">{item.barcode}</div>
                    <div className="col-span-5 flex flex-col">
                      <span className="font-title-lg text-[16px] leading-tight text-on-surface line-clamp-1">{item.title}</span>
                      <span className="font-label-sm text-label-sm text-outline">{item.author}</span>
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                          item.type === 'return' ? 'bg-surface-container-highest text-on-surface' : 'bg-primary-container text-on-primary-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] mr-1">{item.type === 'return' ? 'keyboard_return' : 'front_hand'}</span>
                        {item.type === 'return' ? 'Trả sách' : 'Mượn sách'}
                      </span>
                    </div>
                    <div className="col-span-3 flex flex-col items-end">
                      <span className={`font-label-md text-label-md flex items-center gap-1 ${item.isError ? 'text-error' : 'text-secondary'}`}>
                        {item.isError && <span className="material-symbols-outlined text-[16px]">warning</span>}
                        {item.status}
                      </span>
                      {item.fine && <span className="font-title-lg text-[16px] text-error font-bold">{item.fine}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Checkout Summary Footer */}
              <div className="p-stack-md bg-surface border-t border-outline-variant flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tổng thu phí phạt (UC-CIR-03)</span>
                    <span className="font-headline-md text-headline-md text-error">10,000 VNĐ</span>
                  </div>
                </div>
                <button className="bg-primary text-on-primary px-8 py-3 rounded-lg font-title-lg text-title-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  Hoàn tất phiên
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
