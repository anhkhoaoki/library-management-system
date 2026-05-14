import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';

export default function StudentSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Search Hero Section */}
        <section className="bg-white rounded-xl shadow-sm p-stack-lg relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#0d9488 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          ></div>
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h2 className="font-display-lg text-display-lg text-primary mb-stack-sm">Khám Phá Tri Thức</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg">
              Tra cứu tài liệu thư viện với sức mạnh của AI
            </p>

            {/* Smart Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline">search</span>
              </div>
              <input
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded-full py-4 pl-12 pr-32 focus:bg-white focus:ring-2 focus:ring-[#0d9488] focus:outline-none transition-all border-none shadow-sm"
                placeholder="Nhập tên sách, tác giả, hoặc chủ đề bạn quan tâm..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute inset-y-2 right-2 px-4 bg-gradient-to-r from-[#0d9488] to-blue-600 text-white rounded-full font-label-md text-label-md flex items-center gap-2 hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Tìm kiếm AI
              </button>
            </div>

            {/* Filters */}
            <div className="mt-stack-md flex flex-wrap justify-center gap-3">
              <select className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8">
                <option>Thể loại</option>
                <option>Khoa học</option>
                <option>Lịch sử</option>
                <option>Văn học</option>
              </select>
              <select className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8">
                <option>Tác giả</option>
                <option>A-Z</option>
              </select>
              <select className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md rounded-lg border-none focus:ring-2 focus:ring-primary py-2 pl-4 pr-8">
                <option>Năm xuất bản</option>
                <option>Mới nhất</option>
              </select>
              <button className="bg-white text-primary border border-primary font-label-md text-label-md rounded-lg py-2 px-4 hover:bg-surface-container-low transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">tune</span>
                Bộ lọc nâng cao
              </button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-gutter">
          {/* Standard Results (3 cols) */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-title-lg text-title-lg text-on-surface">Kết quả tìm kiếm (124)</h3>
              <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                <span>Sắp xếp theo:</span>
                <select className="bg-transparent border-none focus:ring-0 font-label-md text-label-md font-semibold text-primary p-0">
                  <option>Độ liên quan</option>
                  <option>Mới nhất</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
              {/* Book Card 1 */}
              <article className="bg-white rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0px_10px_15px_rgba(0,0,0,0.1)] transition-shadow p-stack-md flex flex-col h-full border border-surface-variant">
                <div className="relative h-48 mb-stack-sm rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
                  <img
                    alt="Book Cover"
                    className="object-cover w-full h-full"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYHUdogiJ-Eazyk7UKVu2yTpzSKvwcbv6lM8PTMFOvTtq-zl_bAWtzp8gRiVR4Aw9_7gEb-lyEMHyFZ_VGeSN6NX5lxoY78-Eg3kfOJcPQxdjb4zjQXqORKz96PvLEdvIME3Yeme_ELF73GzrFWJJvwWXRN7IcwnYAwxOsGbB2L3EbhpouXBqtixkhU61ImpW3iLVu0BBYRuopW7NjItLv2xevSAJuvFaCf_0CGgmesf4v8CcNb61X_QyVKxDNJzR4xflAPxn5dEEg"
                  />
                  <div className="absolute top-2 right-2 bg-[#006a61] text-[#ffffff] px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Có sẵn
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">
                    Sapiens: Lược sử loài người
                  </h4>
                  <p className="font-label-md text-label-md text-on-surface-variant mb-2">Yuval Noah Harari</p>
                  <div className="flex items-center gap-1 mb-stack-md text-[#f59e0b]">
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                    <span className="material-symbols-outlined text-[16px]">star_half</span>
                    <span className="text-on-surface-variant font-label-sm ml-1">(4.8)</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/student/borrowed-books')}
                    className="mt-auto w-full bg-primary text-on-primary font-label-md text-label-md py-2 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors"
                  >
                    Mượn sách
                  </button>
                </div>
              </article>

              {/* Book Card 2 */}
              <article className="bg-white rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0px_10px_15px_rgba(0,0,0,0.1)] transition-shadow p-stack-md flex flex-col h-full border border-surface-variant">
                <div className="relative h-48 mb-stack-sm rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
                  <img
                    alt="Book Cover"
                    className="object-cover w-full h-full"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3EtkfV1x2Txhwfpd2YoMEBL3pCjMdFFVQAWeWrZ7astFwqclMMYYoChkWACHlZFvPpXIYB-ORLs4VkKBH3TvRTHqbZKYBvUDO_H1EZOx22yhXNISrBnTpvQgI1PorpbhH8Gnzmn4t1-dfeob240O_0v3te2Ht7eC-dN9coxilgjCZpdyShoCphiRSCyesar1RNdCcMRwWuI0ldpvGcnKiUk7Le3pLi1qU2I_hSjtbrFqy5-ExY81VUo-9Io0FT-MW0JoLw6dIyZew"
                  />
                  <div className="absolute top-2 right-2 bg-[#ba1a1a] text-[#ffffff] px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    Hết sách
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">
                    Tư duy nhanh và chậm
                  </h4>
                  <p className="font-label-md text-label-md text-on-surface-variant mb-2">Daniel Kahneman</p>
                  <div className="flex items-center gap-1 mb-stack-md text-[#f59e0b]">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                    <span className="text-on-surface-variant font-label-sm ml-1">(5.0)</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/student/reservations')}
                    className="mt-auto w-full bg-transparent border border-primary text-primary font-label-md text-label-md py-2 rounded-lg hover:bg-surface-container-low transition-colors"
                  >
                    Đặt giữ chỗ
                  </button>
                </div>
              </article>

              {/* Book Card 3 */}
              <article className="bg-white rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0px_10px_15px_rgba(0,0,0,0.1)] transition-shadow p-stack-md flex flex-col h-full border border-surface-variant">
                <div className="relative h-48 mb-stack-sm rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
                  <img
                    alt="Book Cover"
                    className="object-cover w-full h-full"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiBleZj9jpWFZgnZI7esSLFBvf56JsE-G8vxDUaWfEFvJyLaK5MkfnwZKZn3bi1sucBzuir7L-0ImmgG9tq2oLVYf6bx2PT_9iynLqN16mEYFlOiNOpAnyROOesSW5H8gdfnbDUQZ8YKhdfmagj-AHULHjTFCXX0b_SnzLNuQ2Mf3U_tsHTBfpiHqQ4idnEJ3_Fpbfz3ognJUJx-sPe7Dlyab1PkqWvwYGpH3n7oxawYcaTN1h_mCquQTBpvDSfgXfHeNU4PRjmxGR"
                  />
                  <div className="absolute top-2 right-2 bg-[#006a61] text-[#ffffff] px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Có sẵn
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-title-lg text-title-lg text-on-surface mb-1 line-clamp-2">
                    Lược sử thời gian
                  </h4>
                  <p className="font-label-md text-label-md text-on-surface-variant mb-2">Stephen Hawking</p>
                  <div className="flex items-center gap-1 mb-stack-md text-[#f59e0b]">
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                    <span className="material-symbols-outlined text-[16px]">star_outline</span>
                    <span className="text-on-surface-variant font-label-sm ml-1">(4.2)</span>
                  </div>
                  <button className="mt-auto w-full bg-primary text-on-primary font-label-md text-label-md py-2 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors">
                    Mượn sách
                  </button>
                </div>
              </article>
            </div>
          </div>

          {/* AI Suggestions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface-bright rounded-xl p-stack-md h-full border-l-4 border-l-[#0d9488]" style={{ boxShadow: '0 0 15px rgba(13, 148, 136, 0.3)' }}>
              <div className="flex items-center gap-2 mb-stack-md">
                <span className="material-symbols-outlined text-[#0d9488]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <h3 className="font-title-lg text-title-lg font-bold" style={{ background: 'linear-gradient(90deg, #0d9488, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  AI Đề xuất
                </h3>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-stack-md">
                Dựa trên lịch sử mượn và phân tích ngữ nghĩa tìm kiếm của bạn.
              </p>
              <div className="flex flex-col gap-4">
                {/* AI Insight Card 1 */}
                <div className="bg-white rounded-lg p-3 shadow-sm border border-surface-variant relative">
                  <div className="absolute top-0 right-0 bg-[#0d9488] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    AI Match 98%
                  </div>
                  <div className="flex gap-3">
                    <div className="w-16 h-24 bg-surface-container-low rounded shrink-0 overflow-hidden">
                      <img
                        alt="Book Thumbnail"
                        className="object-cover w-full h-full"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ_vG35fBija37Ox3h4o4J9yYn4qnBn6T-mhW8v65NAvhQ50j_9V-Zueie0H3xkr3ftCRZ141IMhcaBuMcdKsv8NS2aJRpPlYstdSXTN7TvTxhWwxi4Y3IZmwbLQHaagV8dJSUg4SiX0GqEwvZSGGy00ZjmtNmu82qBZ21jhn9RDt-qahpeOcIwBStBOdpQFOIN5kmVBmtnY8FmahNWjipgwmftME5ObjohSfwL_j7auU5__pvIZBbpn5JDnmlvaLoYK99A8EA1GAj"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-label-md text-label-md text-on-surface font-semibold line-clamp-2 mb-1">
                        Deep Learning
                      </h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">Ian Goodfellow</p>
                      <button className="text-xs text-[#0d9488] font-semibold text-left hover:underline">
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
