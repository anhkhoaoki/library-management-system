import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function StudentDashboard() {
  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden bg-primary text-on-primary p-stack-lg md:p-[48px] shadow-md">
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000)',
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display-lg text-display-lg mb-stack-sm">Xin chào Minh Tuấn,</h2>
            <p className="font-headline-md text-headline-md font-normal text-primary-fixed-dim mb-stack-lg">
              Hôm nay bạn muốn khám phá điều gì?
            </p>
            <div className="flex flex-wrap gap-stack-md">
              <button className="bg-secondary text-on-secondary px-6 py-3 rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-secondary-container hover:text-on-secondary-container transition-colors shadow-sm">
                <span className="material-symbols-outlined">explore</span>
                Khám phá sách mới
              </button>
              <button className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-lg font-label-md text-label-md hover:bg-white/20 transition-colors">
                Tiếp tục đọc
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* AI Recommendations */}
          <section className="lg:col-span-8 flex flex-col gap-stack-md">
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Gợi ý riêng cho bạn</h3>
              </div>
              <a href="#" className="font-label-md text-label-md text-primary hover:underline">
                Xem tất cả
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              {/* Book Card 1 */}
              <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-secondary p-stack-md flex gap-stack-md hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)] transition-shadow relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI
                </div>
                <img
                  alt="Book cover"
                  className="w-24 h-36 object-cover rounded shadow-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmG3D8mVTIpX9SC9nZ0-AIcE1IMcMpQrTvBqG39QlkFmFPSdLrQdlGQbNtuxRM_YmJr5sGwyVL5XSt1tLFiC3f1YsVxjgPuTDxjHykYiNhBQqt0hlV5Tv9ZyTqDKudn79m2fQFLx1ko8pYn4ye1oH6BPhIg4Y2yV5PASPRUSATwJfhrNYP3JJnONbgHDxM9nkV8ARPlCoPR9j1k1YY10YOPde7lByV_d11LQoQfFAsjJTmvw5lrKYf3qA6XwK_OKcxQdAplILpI80z"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-label-sm text-label-sm text-secondary font-medium mb-1">Vì bạn thích Công nghệ</span>
                  <h4 className="font-title-lg text-[18px] leading-snug text-on-surface mb-1">Tương Lai Của Trí Tuệ Nhân Tạo</h4>
                  <p className="font-body-md text-sm text-on-surface-variant mb-auto">Martin Ford</p>
                  <div className="flex items-center justify-between mt-stack-sm">
                    <span className="bg-surface-bright text-secondary font-label-sm text-label-sm px-2 py-1 rounded-full border border-secondary/20">
                      Sẵn sàng mượn
                    </span>
                    <button className="bg-primary text-white p-2 rounded-lg hover:bg-primary-container transition-colors">
                      <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Book Card 2 */}
              <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l-4 border-secondary p-stack-md flex gap-stack-md hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)] transition-shadow relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI
                </div>
                <img
                  alt="Book cover"
                  className="w-24 h-36 object-cover rounded shadow-sm"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDAuBScQOdMbzHNENQI8Zpz3YHY8chCrgsMwbVXeinP30yC4NF3LJKj0bTcrxqiiybIFI16no-hmMn93-OVjRexlR4HMtQa-cx-SOwI_aB-9_cuSgSXxz713l1sa_Gq9R-3M8V9hE0uuFK2_EYp6xcWsXcRrM4o7eVnrZ1BvslX5S5-ke9Pl90biZYj5BmSu-OMqlkTWQFcKAt-uzEac8q3TbKccatSKOKsgZ7WxE7s4t5r3GtUNJUqsJhNaWldq_j8dfPJU70Somc"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-label-sm text-label-sm text-secondary font-medium mb-1">Dựa trên lịch sử mượn</span>
                  <h4 className="font-title-lg text-[18px] leading-snug text-on-surface mb-1">Thiết Kế Giao Diện Người Dùng</h4>
                  <p className="font-body-md text-sm text-on-surface-variant mb-auto">Everett N. McKay</p>
                  <div className="flex items-center justify-between mt-stack-sm">
                    <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-1 rounded-full">
                      Đang được mượn
                    </span>
                    <button className="border border-primary text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors font-label-sm text-label-sm">
                      Đặt chỗ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Current Loans */}
          <section className="lg:col-span-4 flex flex-col gap-stack-md">
            <div className="flex items-center justify-between mb-stack-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">book</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Đang mượn (2)</h3>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-stack-md flex flex-col gap-stack-md">
              {/* Loan Item 1 */}
              <div className="flex gap-stack-sm items-center border-b border-outline-variant pb-stack-sm">
                <div className="w-12 h-16 bg-surface-variant rounded shrink-0 overflow-hidden">
                  <img
                    alt="Book thumb"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhI1b_eBCEd2tnc1N92jsQGGvh7iamUgf32UP-etoi7A4keXxu4H-H2rcS7YRa2hc5fjWNS26Bcmg1QwLd4Fs1IzOAvkfFP1JBdaI37oYqSkVc-ce_Dck2IrjycQWwgJvhe8p5YNnSvbAf8_y9EnXnga9Ep4f5aVhILdDRZgA_Bll6jxbri83RjSf9e9wsuS8iTsodJLE6NRWQFYRJmUAe136RlhW8m5MHodoNa7qAraEXKn8roHFHOPLFHZ2RwJafNZrSIqjtlwf0"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-label-md text-label-md text-on-surface truncate">Nghệ Thuật Tư Duy Rành Mạch</h5>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Rolf Dobelli</p>
                  <div className="mt-1 flex items-center gap-1 text-secondary">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span className="font-label-sm text-label-sm">Còn 5 ngày</span>
                  </div>
                </div>
                <button className="text-primary hover:bg-surface-container p-2 rounded-full transition-colors" title="Gia hạn nhanh">
                  <span className="material-symbols-outlined">update</span>
                </button>
              </div>

              {/* Loan Item 2 */}
              <div className="flex gap-stack-sm items-center">
                <div className="w-12 h-16 bg-surface-variant rounded shrink-0 overflow-hidden">
                  <img
                    alt="Book thumb"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2tSXa9sRvG6w9AfyCcgSshvDhlf0eK9YKAScgmBg3D6GfsyyTCD9E0LHmZpTXvCx0Hb_9aXZr6PjVJmOW5RPgi4cAcU01sa5uwxQvU4eV7YKn8c8r_bnh-Cj-Ov1VV_QR9khIrlJeuCqhComII8SrHEDrfgj3pkz7v5heB86X13ZcWwCktlwllyMZwwDkf_HfB-Ba3h96r1tyGz2pScSutLEvbjmsLe_M2Qje76vDB6l45VuFt7wFNY9tgexj9Zpn4pHVM4rO3Fzl"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-label-md text-label-md text-on-surface truncate">Sapiens: Lược Sử Loài Người</h5>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Yuval Noah Harari</p>
                  <div className="mt-1 flex items-center gap-1 text-error">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span className="font-label-sm text-label-sm">Quá hạn 1 ngày</span>
                  </div>
                </div>
                <button className="bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-container transition-colors font-label-sm text-label-sm shrink-0">
                  Gia hạn
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
