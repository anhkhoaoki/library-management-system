import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function DigitalResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  
  // 1. THÊM STATE ĐỂ QUẢN LÝ TAB ĐANG CHỌN (Mặc định là 'ALL')
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    const fetchDigitalResources = async () => {
      try {
        const res = await api.get('/books?limit=100');
        const allBooks = res.data.data || [];
        // Lọc ra các sách có tài nguyên số
        const digitalBooks = allBooks.filter(b => b.digitalResources && b.digitalResources.length > 0);
        
        const mappedResources = digitalBooks.map(book => {
          const resType = book.digitalResources[0]?.resourceType || 'PDF';
          
          // Xác định chữ hiển thị hiển thị ra giao diện dựa trên Enum chuẩn của DB
          let displayType = 'E-book';
          if (resType === 'AUDIOBOOK') {
            displayType = 'Audio';
          } else if (resType === 'VIDEO') {
            displayType = 'Tạp chí'; // Dùng tạm VIDEO hoặc ông có thể quy ước ấn bản điện tử là VIDEO/PDF
          } else if (resType === 'EPUB') {
            displayType = 'EPUB';
          }

          return {
            id: book.id,
            resourceId: book.digitalResources[0]?.id,
            title: book.title,
            author: book.authorNames && book.authorNames.length > 0 ? book.authorNames.join(', ') : 'Chưa rõ',
            type: displayType, // Truyền displayType đã ép chuẩn vào đây
            status: 'available',
            accessCount: '0/10',
            image: book.coverImageUrl || 'https://via.placeholder.com/400x600?text=No+Cover',
          };
        });
        setResources(mappedResources);
      } catch (err) {
        console.error('Lỗi tải tài nguyên số:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDigitalResources();
  }, []);

  const handleAccessResource = async (bookId, resourceId) => {
    try {
      const res = await api.get(`/books/${bookId}/digital/${resourceId}`);
      if (res.data.success) {
        alert('Truy cập thành công! Bắt đầu tính thời gian phiên đọc...');
        setActiveSession(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi truy cập tài nguyên');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await api.patch(`/books/digital/sessions/${activeSession.accessLogId}/end`);
      alert('Đã kết thúc phiên đọc và ghi nhận thời gian.');
      setActiveSession(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi kết thúc phiên');
    }
  };

  // 2. LOGIC LỌC TÀI NGUYÊN ĐỘNG THEO TAB ĐANG CHỌN
  const filteredResources = resources.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'EBOOK') return item.type === 'E-book' || item.type === 'EPUB';
    if (activeTab === 'AUDIOBOOK') return item.type === 'Audio';
    if (activeTab === 'JOURNAL') return item.type === 'Journal' || item.type === 'Tạp chí'; // Dự phòng nếu sau này có loại tạp chí
    return true;
  });

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
                  src="https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400"
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
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>recommend</span> Gợi ý cho bạn
            </div>
            <h3 className="font-title-lg text-title-lg text-on-surface mb-2">Tiếp tục nghiên cứu</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">Dựa trên lịch sử mượn sách "Khoa học Dữ liệu", chúng tôi đề xuất ấn bản PDF này cho bạn.</p>
            <div className="flex gap-4 items-start mb-6">
              <div className="w-20 h-28 bg-surface-container rounded shadow-sm overflow-hidden flex-shrink-0">
                <img
                  alt="Book cover data science"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400"
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

        {/* 3. ĐÃ SỬA CÁC TABS: THÊM LỚP DỰA TRÊN STATE VÀ BỔ SUNG ONCLICK ĐỂ CHUYỂN TAB ĐỘNG */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap shadow-sm transition-colors ${
              activeTab === 'ALL'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Tất cả tài nguyên
          </button>
          
          <button 
            onClick={() => setActiveTab('EBOOK')}
            className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
              activeTab === 'EBOOK'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            E-book (PDF/EPUB)
          </button>
          
          <button 
            onClick={() => setActiveTab('AUDIOBOOK')}
            className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
              activeTab === 'AUDIOBOOK'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Audiobook
          </button>
          
          <button 
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
              activeTab === 'JOURNAL'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            Tạp chí Khoa học
          </button>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-gutter">
          {loading ? (
            <div className="col-span-full py-10 text-center text-on-surface-variant font-body-md">
              Đang tải tài nguyên số...
            </div>
          ) : filteredResources.length === 0 ? ( // 4. THAY "resources" THÀNH MẢNG ĐÃ LỌC "filteredResources"
            <div className="col-span-full py-10 text-center text-on-surface-variant font-body-md">
              Không tìm thấy tài liệu số phù hợp cho mục này.
            </div>
          ) : filteredResources.map((item) => ( // 5. RENDER THEO MẢNG ĐÃ LỌC
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
                    <button 
                      onClick={() => handleAccessResource(item.id, item.resourceId)}
                      className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                      title="Truy cập tài nguyên"
                    >
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

      {/* Floating Active Session Bar */}
      {activeSession && (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-on-primary shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-[24px]">
                  {activeSession.resourceType === 'AUDIO' ? 'headphones' : 'menu_book'}
                </span>
              </div>
              <div>
                <p className="font-label-sm uppercase tracking-wider text-white/80">Đang {activeSession.resourceType === 'AUDIO' ? 'nghe' : 'đọc'} tài liệu số</p>
                <h4 className="font-title-md font-bold">{activeSession.bookTitle}</h4>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <a 
                href={activeSession.fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 md:flex-none px-6 py-2.5 rounded-lg bg-white text-primary font-bold hover:bg-white/90 transition-colors text-center"
              >
                Mở file ({activeSession.resourceType})
              </a>
              <button 
                onClick={handleEndSession}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-lg border-2 border-white/30 text-white font-bold hover:bg-white/10 transition-colors text-center"
              >
                Kết thúc phiên
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}