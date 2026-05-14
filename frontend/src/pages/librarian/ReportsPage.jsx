import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function ReportsPage() {
  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md mb-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Báo cáo & Thống kê</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Tổng quan hoạt động và dự báo thư viện</p>
          </div>
          <div className="flex items-center gap-stack-sm">
            <div className="flex items-center bg-surface-container-low rounded-lg border border-outline-variant px-3 py-2 text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[20px] mr-2">calendar_month</span>
              <span className="font-label-md text-label-md">30 ngày qua</span>
              <span className="material-symbols-outlined text-[20px] ml-2">arrow_drop_down</span>
            </div>
            <button className="flex items-center bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[20px] mr-2">download</span>
              Xuất báo cáo
              <span className="material-symbols-outlined text-[20px] ml-1">arrow_drop_down</span>
            </button>
          </div>
        </div>

        {/* Overview Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">library_books</span>
              </div>
              <span className="flex items-center text-secondary font-label-md text-label-md bg-secondary-container/20 px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span> +12%
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">Lượt mượn sách</p>
            <h3 className="font-headline-md text-headline-md text-on-background mt-1">1,248</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">keyboard_return</span>
              </div>
              <span className="flex items-center text-secondary font-label-md text-label-md bg-secondary-container/20 px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span> +5%
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">Lượt trả sách</p>
            <h3 className="font-headline-md text-headline-md text-on-background mt-1">1,102</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-error-container/50 flex items-center justify-center text-error">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="flex items-center text-error font-label-md text-label-md bg-error-container/30 px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-[16px] mr-1">trending_down</span> -2%
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">Sách quá hạn</p>
            <h3 className="font-headline-md text-headline-md text-on-background mt-1 text-error">45</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">Độc giả tích cực</p>
            <h3 className="font-headline-md text-headline-md text-on-background mt-1">892</h3>
          </div>
        </div>

        {/* Standard Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
          {/* Borrow/Return Chart */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col min-h-[400px]">
            <h3 className="font-title-lg text-title-lg text-on-background mb-6">Biểu đồ Lượt mượn & Trả</h3>
            <div className="flex-1 flex items-end justify-between gap-2 border-b border-l border-outline-variant pb-2 pl-2 relative">
              {/* Chart Mockup */}
              <div className="w-full h-full absolute inset-0 flex flex-col justify-between pt-2 pb-6 opacity-10 pointer-events-none">
                <div className="border-b border-outline w-full"></div>
                <div className="border-b border-outline w-full"></div>
                <div className="border-b border-outline w-full"></div>
                <div className="border-b border-outline w-full"></div>
              </div>
              {/* Bars */}
              <div className="flex gap-1 w-full justify-around h-full items-end pb-2 pt-8 z-10">
                <div className="flex gap-1 h-[60%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[80%]"></div>
                </div>
                <div className="flex gap-1 h-[80%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[70%]"></div>
                </div>
                <div className="flex gap-1 h-[40%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[90%]"></div>
                </div>
                <div className="flex gap-1 h-[90%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[85%]"></div>
                </div>
                <div className="flex gap-1 h-[70%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[60%]"></div>
                </div>
                <div className="flex gap-1 h-[100%]">
                  <div className="w-4 bg-primary rounded-t-sm"></div>
                  <div className="w-4 bg-tertiary-container rounded-t-sm h-[95%]"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Mượn</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-tertiary-container rounded-full"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Trả</span>
              </div>
            </div>
          </div>
          {/* Top Books List */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
            <h3 className="font-title-lg text-title-lg text-on-background mb-4">Sách mượn nhiều nhất</h3>
            <ul className="flex flex-col gap-4">
              {[
                {
                  id: 1,
                  title: 'Tâm lý học hiện đại',
                  category: 'Khoa học Xã hội',
                  count: 124,
                  image:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCfzPGLMKKWGmeLxAZRafGbB9YN4x1mLGNDesyWqIrt-0B-dn-mgjFuLASP4guBgT9C4WLgJJkpycQ2dpJ-VjVjrE9rzJRNfDAlZ4cbp8IDoWo8M_AcYY_nh1KCKhlKTH3Vm3hpu5_HowWx-Fe3HrvoYNrCYvutKcBhaS9uark4Zq_Hn6V6Mm9QqqGddgg55yAv6ilVM8wY6D8-SF-rVqA9TPhei_eSjTkqAHhyxrc4R8MMI1jD9I1UWATYvUie_RhwnUqJjOvNPHSi',
                },
                {
                  id: 2,
                  title: 'Nhập môn Trí tuệ Nhân tạo',
                  category: 'Công nghệ Thông tin',
                  count: 98,
                  image:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDDI-FpwdlZa0SHwCNiE4-yEsOb15xq_dOUmYThj_IseVm2elOsRxU1k9OZNEziTLZq5OkwiBS22ICLE19ez04Iw3z3XP1OMrY1tHqi6R007DXgo2Q53_SXZIU8hTmj7ZGeuoh4-2F3ToJ3PTFoL07apvUJvy9AIOQEF2ydVJOv3DrAJzviWwr1rJ9B1Xhbcr0cLeIMaoMibR9pBqeWmqV1apG3Nmf_zJA9A9T3ldiHb2h12iDghps5_6bdkXcybuZVmiQKEQMeCFb_',
                },
                {
                  id: 3,
                  title: 'Lịch sử Triết học',
                  category: 'Triết học',
                  count: 85,
                  image:
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuDVREXFiKP5A_Xf9JKFmuYx-ORBvf8aA97FoyHJHkltJ1yv9s0Qyp6Lv0jO0B6-hcBuIo--xG2tp_r0lJtCikNq1Ts-mAgfYTRXVYTYfpYjDGuqCga3dfhh4bVfTTQ0kk7cvQoGQyICGXRqvLNLqqZZ-Qrim14uCAgDnvUwEuQyWeXxjYfPLUOCAXy8ef7Za29_b6les6PW9RVF73VOnSaTCnxcifRDVoJHYjdI-BnEStkvoXofNp-bDI8x6zzp8tBWfveMu07whNZz',
                },
              ].map((book) => (
                <li key={book.id} className="flex items-center gap-4 border-b border-outline-variant/30 pb-3">
                  <div className="w-12 h-16 bg-surface-container-highest rounded flex-shrink-0 overflow-hidden">
                    <img alt="Book cover" className="w-full h-full object-cover" src={book.image} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-label-md text-label-md font-semibold text-on-background truncate">{book.title}</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{book.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-headline-md text-headline-md text-primary">{book.count}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button className="mt-auto pt-4 text-primary font-label-md text-label-md text-center hover:underline w-full">Xem toàn bộ danh sách</button>
          </div>
        </div>

        {/* AI Demand Forecast Section */}
        <div className="relative bg-gradient-to-br from-surface-container-lowest to-secondary-container/10 p-6 rounded-xl shadow-sm border border-secondary-fixed-dim/50 overflow-hidden">
          {/* Wisdom Glow Background Effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container rounded-full mix-blend-multiply filter blur-[80px] opacity-20 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-title-lg text-title-lg text-on-background">Dự báo nhu cầu AI</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Phân tích xu hướng mượn sách 3 tháng tới để lên kế hoạch nhập liệu</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter relative z-10">
            {/* Forecast Chart */}
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-white/40 min-h-[250px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-label-md text-label-md font-semibold">Xu hướng thể loại</h4>
                <select className="bg-transparent border-none text-label-sm font-label-sm text-primary focus:ring-0 cursor-pointer">
                  <option>Tất cả thể loại</option>
                  <option>Khoa học máy tính</option>
                  <option>Kinh tế</option>
                </select>
              </div>
              <div className="flex-1 relative flex items-end">
                {/* Simple Line Chart Visualization */}
                <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path
                    className="drop-shadow-md"
                    d="M0,80 Q20,70 40,50 T80,30 T100,10"
                    fill="none"
                    stroke="#006a61"
                    strokeLinecap="round"
                    strokeWidth="3"
                  ></path>
                  <path d="M0,100 L0,80 Q20,70 40,50 T80,30 T100,10 L100,100 Z" fill="url(#ai-gradient)" opacity="0.3"></path>
                  <defs>
                    <linearGradient id="ai-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#86f2e4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex justify-between mt-2 font-label-sm text-label-sm text-on-surface-variant">
                <span>Hiện tại</span>
                <span>Tháng +1</span>
                <span>Tháng +2</span>
                <span>Tháng +3</span>
              </div>
            </div>
            {/* AI Insights List */}
            <div className="flex flex-col gap-3">
              <div className="bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(13,148,136,0.08)] border-l-2 border-secondary relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <span className="absolute top-2 right-2 font-label-sm text-[10px] bg-secondary-container/30 text-secondary px-1.5 py-0.5 rounded text-xs font-bold">
                  AI
                </span>
                <h5 className="font-label-md text-label-md font-semibold text-on-background mb-1">Tăng trưởng: Khoa học dữ liệu</h5>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Dự kiến nhu cầu tăng 35% trong kỳ thi sắp tới. Đề xuất nhập thêm 50 bản.</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(13,148,136,0.08)] border-l-2 border-primary relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <span className="absolute top-2 right-2 font-label-sm text-[10px] bg-primary-container/20 text-primary px-1.5 py-0.5 rounded text-xs font-bold">
                  AI
                </span>
                <h5 className="font-label-md text-label-md font-semibold text-on-background mb-1">Thiếu hụt: Sách Ngoại ngữ</h5>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Tỷ lệ sách trên giá quá thấp (&lt; 10%). Cần bổ sung tài liệu IELTS/TOEFL.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
