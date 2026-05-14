import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function DigitalResourcesPage() {
  const [resources] = useState([
    {
      id: 1,
      title: 'Sapiens: Lược sử loài người',
      author: 'Yuval Noah Harari',
      type: 'E-book',
      status: 'available',
      accessCount: '2/5',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0-SeTtYaeUAItv5yQwD4iS8AQJn5Kfn-8s5eMSO3W9nI0szhntFAwHGAavvmdJjW_RF2-y2_zWmx0qatFhKlwBPIvzuv4xCFwJUNqAtT8HiRvtp6wmQ3xPF1bExHo1UTutL_9W5iUpr8xtk7cHBByr1OmHgGdz04JgtO6-G7HwSNazfiNnMyphUwMcY2-n2_ugXlQf8a2jHr7PkmKq2w2KWq4v0yHnSxt7CcjpZ7OkPUwFhgv-qp1uG0dXiArAgGksk_K3NrJhpzB',
    },
    {
      id: 2,
      title: 'Nghệ thuật quản trị',
      author: 'Peter Drucker',
      type: 'Audio',
      status: 'full',
      accessCount: '10/10',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC92mcDZQOwtzVBAVwgnS3JQT7Cj9vzvxFgQ2YDc_KDHu3y2-toQk9IZol2BdjPhrSe9kau5fUfitBCh6ryaTyUbDlMiss3becOmYaorWvBlpqmODBSjX3BjA7RcuONvfJyCW4jc0IHgdpVmdxTQ-pG_lrOZxLYvrqPHbqX0prAit6KiON5vwUgDr3oi2Cag5Aoy03j9bUWXkevpOG4JzvL3mCihg2ZswIS008TPSwmZcSDaqQjJqil1YYlvdt-vAoqKkIE1OIl-85e',
    },
    {
      id: 3,
      title: 'Nhà giả kim',
      author: 'Paulo Coelho',
      type: 'EPUB',
      status: 'available',
      accessCount: '1/50',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfFxJ8NBhu4c1_IbXUc5s8l67qKrwgnHcXADLjbnwokw8BNb1RsZbBFmaGw9fbQdARkUH3KvpzWSUa3QLsqUNfAtFon28dDXX2fURuubS_FvPP5NeLpyg-A034sTDNG7AFkw7iaGbkwGZhr7emgUBeVnzS-9NcRL7hflTIHwr6YXFyXRYd1OzXW-U9RO9wK3cHYNZ3fS7AHoWAmdsLH7p52WZMmQx2LVsTzEIn3ZcjfPmK6C5PNpgmPz3UWC7zfZMZZMtgIU-kyEQv',
    },
    {
      id: 4,
      title: 'Tư duy nhanh và chậm',
      author: 'Daniel Kahneman',
      type: 'Audio',
      status: 'available',
      accessCount: '5/20',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJN_ObwVzWj4jqn2z9STXb4X_EmysHFPs_GBLC7UonBOcY7NnRZtN2jDrOQvc4w6AvsRPZhvsL-0kzGc2tLIkVIHq4LgnllZ75ixaB1wPIsYMUU2MP5y1Nku-xFX9DdeFzuVqquMn7C2PViKTwVpiW-LQup6Je-Z8-yQT_xYjuHzGcL_mAphbwiX2pVz-dTlNq5oSQTBbFiD6t1UKZcNDEhumHZTlXjxkgB8o_LUSFLRewsgeVBxErg6LjTszdF73uR1Nh2E9pIdL',
    },
    {
      id: 5,
      title: 'Tạp chí Khoa học & Đời sống',
      author: 'Số 45 - 2023',
      type: 'E-book',
      status: 'full',
      accessCount: '2/2',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAewEAtCxZmtj-4RZYG2EbEgffj1LyTZAhcknsKOHrvkl6_hvMV_Vcrsk-eAtaGG5HeSWzv7JM-ysizKgFX6zEBLznY64LVndbuuSgihf5rA2sp3Va6TI0Qi1BZpWqKb-Z5_87Q9U1uz0PKuRwusI-asxKsPcCv-OGpcyoXQRvcsBkrNC270AMCDethA0Z1FrJH1vGMqlxZK8MYLynCkNcTIAtNXv8JwizMYOwTduZwL5ItXPJwJL1MKbDypeHfhkHYDjLGQOgh6wWV',
    },
  ]);

  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-unit">Tài nguyên số</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Khám phá và truy cập trực tuyến kho sách điện tử & sách nói.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-4 py-2 rounded-lg hover:bg-surface-container-low transition-all font-label-md text-label-md text-on-surface">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Lọc dữ liệu
            </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Integrated Player/Viewer Card */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider font-semibold">Đang Phát</span>
                <span className="bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  Truy cập: 4/10
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">open_in_full</span>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start flex-1">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden shadow-sm flex-shrink-0 relative group-hover:shadow-md transition-shadow">
                <img
                  alt="Audiobook cover"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKhYRy709r6IjdllcJSkTIvkF7oZWShubPZ05k_LwJbY9llYY3gH_eS7vfHih_-bqZF3O2_rZchxM9x-p5mipAkSgYYXVTH0GTvKNexiFxGJbjUCi7ToaaX-Kx4sx9Ap4xsAKGrXY290ZckQsns9G77YjSFZBiU6kNQ-HlXkFVr5MV6lM8pA8PDfpze3osc3Q7qrBbY8oo7UoK2pQjQYu7iHHK8DmojtFCi_Nc51MdAb9KfGABdJzoGIS5a8LWazWzswzpYCmebaM-"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
                </div>
              </div>
              <div className="flex flex-col w-full">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Thiết kế của vạn vật</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">Tác giả: Don Norman • Giọng đọc: Hoàng Nam</p>
                <div className="w-full mb-2">
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[45%] rounded-full relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 font-label-sm text-label-sm text-outline">
                    <span>02:15:30</span>
                    <span>08:45:00</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[28px]">replay_10</span>
                  </button>
                  <button className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm hover:shadow-md transition-all hover:scale-105">
                    <span className="material-symbols-outlined fill-icon text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
                  </button>
                  <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[28px]">forward_30</span>
                  </button>
                </div>
                <div className="mt-auto pt-4 border-t border-outline-variant flex justify-between items-center text-label-sm text-outline">
                  <span>Bản quyền: NXB Trẻ (Hợp đồng #2023-Audio)</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">volume_up</span>
                    <div className="w-16 h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-outline w-3/4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 border border-secondary shadow-[0_0_15px_rgba(13,148,136,0.08)] relative flex flex-col">
            <div className="absolute top-4 right-4 bg-secondary-container text-on-secondary-container px-2 py-1 rounded-md font-label-sm text-label-sm flex items-center gap-1 shadow-sm">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span> AI Đề xuất
            </div>
            <h3 className="font-title-lg text-title-lg text-on-surface mb-2">Tiếp tục nghiên cứu</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">Dựa trên lịch sử mượn sách "Khoa học Dữ liệu", AI đề xuất ấn bản PDF này cho bạn.</p>
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-28 bg-surface-container rounded shadow-sm overflow-hidden flex-shrink-0">
                <img
                  alt="Book cover data science"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBItVdAp8rp744PceQoMX9FSVYtcgOOGsOoL78255GCR0zPFWQwK1CerLJq4cb_KfMryfmBKQapMuBOAv7uAzJdl_UoNKakv5e1os1PhKiLv0F-eC6F8OocSsv1ghXDgyxLtsHBBlsMAgYsumt4MWoBLy-U38kytvNK3_NivBTwA9O-gPCdcVy2A0jA1P83xncawUtaFMbq13mYUmiOJNYiLSnK35oa1KHQQnbUOFO4-enLAGtzXQgmm_9XLgPu70audHPvj4M4P-rH"
                />
              </div>
              <div>
                <h4 className="font-title-lg text-title-lg text-on-surface leading-tight mb-1">Mạng Nơ-ron Nhận tạo</h4>
                <p className="font-label-md text-label-md text-on-surface-variant mb-2">Ian Goodfellow</p>
                <span className="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span> E-book
                </span>
              </div>
            </div>
            <button className="mt-auto w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              Đọc ngay (Còn 2 slot)
            </button>
          </div>
        </div>

        {/* Tabs/Filters for Grid */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button className="px-4 py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md whitespace-nowrap shadow-sm">Tất cả tài nguyên</button>
          <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md whitespace-nowrap transition-colors">E-book (PDF/EPUB)</button>
          <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md whitespace-nowrap transition-colors">Audiobook</button>
          <button className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low font-label-md text-label-md whitespace-nowrap transition-colors">Tạp chí Khoa học</button>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-gutter">
          {resources.map((item) => (
            <div key={item.id} className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
              <div className="h-48 md:h-64 bg-surface-container-low relative overflow-hidden">
                <img alt="Book cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={item.image} />
                <div
                  className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-1 rounded shadow-sm font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                    item.status === 'available' ? 'bg-white/90 text-secondary' : 'bg-error-container/90 text-on-error-container'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'available' ? 'bg-secondary' : 'bg-error'}`}></span>
                  {item.status === 'available' ? 'Sẵn sàng' : 'Đã đầy'}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded backdrop-blur text-label-sm font-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    {item.type === 'Audio' ? 'headphones' : item.type === 'EPUB' ? 'book' : 'picture_as_pdf'}
                  </span>
                  {item.type}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h4 className="font-title-lg text-[16px] md:text-title-lg leading-tight text-on-surface mb-1 line-clamp-2">{item.title}</h4>
                <p className="font-body-md text-[14px] md:text-body-md text-on-surface-variant mb-3 line-clamp-1">{item.author}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className={`font-label-sm text-label-sm ${item.status === 'full' ? 'text-error' : 'text-outline'}`}>Truy cập: {item.accessCount}</span>
                  {item.status === 'available' ? (
                    <button className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[18px]">{item.type === 'Audio' ? 'play_arrow' : 'menu_book'}</span>
                    </button>
                  ) : (
                    <button className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded font-label-sm text-label-sm hover:bg-outline-variant transition-colors">Đăng ký</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
