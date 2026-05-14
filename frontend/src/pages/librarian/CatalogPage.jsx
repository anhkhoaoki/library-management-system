import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function CatalogPage() {
  const [books] = useState([
    {
      id: 1,
      title: 'Cấu trúc dữ liệu và giải thuật',
      author: 'Nguyễn Văn A',
      category: 'Khoa học máy tính',
      isbn: '978-604-1-11111-1',
      branch: 'CN Trung tâm',
      status: 'available',
    },
    {
      id: 2,
      title: 'Lược sử loài người',
      author: 'Yuval Noah Harari',
      category: 'Lịch sử',
      isbn: '978-604-1-22222-2',
      branch: 'CN Nam',
      status: 'borrowed',
      isAiCataloged: true,
      aiSummary: 'Tóm tắt AI: Khám phá toàn diện về lịch sử tiến hóa và phát triển của loài người (Homo sapiens) từ thời kỳ đồ đá đến thế kỷ 21.',
    },
    {
      id: 3,
      title: 'Mạng máy tính cơ bản',
      author: 'Trần Văn B',
      category: 'CNTT',
      isbn: '978-604-1-33333-3',
      branch: 'CN Trung tâm',
      status: 'available',
    },
  ]);

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-unit">Quản lý danh mục tài liệu</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Quản lý, thêm mới và phân loại sách trong thư viện.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button className="flex items-center justify-center px-4 py-2 bg-surface text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors flex-1 md:flex-none">
              <span className="material-symbols-outlined mr-2 text-[20px]">upload_file</span>
              Nhập hàng loạt
            </button>
            <button className="flex items-center justify-center px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed-variant transition-colors flex-1 md:flex-none shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
              <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
              Thêm mới
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-stack-md border border-surface-container-highest">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input with AI */}
            <div className="md:col-span-5 relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full pl-10 pr-12 py-2.5 bg-surface-container-low border-transparent focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface transition-all"
                placeholder="Tìm kiếm theo tiêu đề, tác giả, ISBN..."
                type="text"
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed transition-colors"
                title="Smart Search"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </button>
            </div>
            {/* Filters */}
            <div className="md:col-span-7 flex flex-wrap md:flex-nowrap gap-3">
              <select className="flex-1 bg-surface-container-low border-transparent focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary rounded-lg py-2.5 px-3 font-body-md text-body-md text-on-surface-variant appearance-none">
                <option value="">Tất cả thể loại</option>
                <option value="khoahoc">Khoa học</option>
                <option value="vanhoc">Văn học</option>
                <option value="lichsu">Lịch sử</option>
              </select>
              <select className="flex-1 bg-surface-container-low border-transparent focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary rounded-lg py-2.5 px-3 font-body-md text-body-md text-on-surface-variant appearance-none">
                <option value="">Tất cả chi nhánh</option>
                <option value="cn1">Chi nhánh Trung tâm</option>
                <option value="cn2">Chi nhánh Nam</option>
              </select>
              <select className="flex-1 bg-surface-container-low border-transparent focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary rounded-lg py-2.5 px-3 font-body-md text-body-md text-on-surface-variant appearance-none">
                <option value="">Trạng thái</option>
                <option value="available">Sẵn sàng</option>
                <option value="borrowed">Đang mượn</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-stack-lg">
          {books.map((book) => (
            <div
              key={book.id}
              className={`bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)] transition-shadow border overflow-hidden flex flex-col relative ${
                book.isAiCataloged ? 'border-[#0D9488]' : 'border-surface-container-highest'
              }`}
            >
              {book.isAiCataloged && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-[#0D9488] to-secondary-container text-white px-3 py-1 rounded-bl-lg font-label-sm text-label-sm flex items-center z-10 shadow-sm">
                  <span className="material-symbols-outlined text-[14px] mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                  AI Biên mục
                </div>
              )}
              <div className="relative h-48 w-full bg-surface-container-high flex-shrink-0">
                <div className="absolute inset-0 flex items-center justify-center text-outline-variant">
                  <span className="material-symbols-outlined text-6xl">menu_book</span>
                </div>
                {/* Status Chip */}
                <div
                  className={`absolute top-3 left-3 px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center shadow-sm z-10 ${
                    book.status === 'available' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${book.status === 'available' ? 'bg-secondary' : 'bg-error'}`}></span>
                  {book.status === 'available' ? 'Sẵn sàng' : 'Đã mượn'}
                </div>
              </div>
              <div className={`p-4 flex flex-col flex-1 ${book.isAiCataloged ? 'bg-[rgba(13,148,136,0.03)]' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-title-lg text-title-lg text-on-surface line-clamp-2">{book.title}</h3>
                  <div className="flex space-x-1 ml-2 flex-shrink-0">
                    <button className="text-outline hover:text-primary transition-colors p-1">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button className="text-outline hover:text-error transition-colors p-1">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-1">
                  {book.author} • {book.category}
                </p>
                {book.aiSummary && (
                  <div className="mb-4 bg-white p-2 rounded border border-[#0D9488] border-opacity-30">
                    <p className="font-label-sm text-label-sm text-secondary line-clamp-2 italic">{book.aiSummary}</p>
                  </div>
                )}
                <div
                  className={`flex items-center justify-between mt-auto pt-3 border-t ${
                    book.isAiCataloged ? 'border-[#0D9488] border-opacity-20' : 'border-surface-container-highest'
                  }`}
                >
                  <span className="font-label-sm text-label-sm text-outline">ISBN: {book.isbn}</span>
                  <span className="font-label-sm text-label-sm text-outline">{book.branch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-surface-container-highest">
          <span className="font-body-md text-body-md text-on-surface-variant">Hiển thị 1-10 của 1,240 sách</span>
          <div className="flex space-x-2">
            <button className="p-2 border border-surface-container-highest rounded-lg text-outline hover:bg-surface-container-low transition-colors disabled:opacity-50">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="px-3 py-1.5 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md">1</button>
            <button className="px-3 py-1.5 hover:bg-surface-container-low text-on-surface-variant rounded-lg font-label-md text-label-md transition-colors">
              2
            </button>
            <button className="px-3 py-1.5 hover:bg-surface-container-low text-on-surface-variant rounded-lg font-label-md text-label-md transition-colors">
              3
            </button>
            <span className="px-2 py-1.5 text-on-surface-variant">...</span>
            <button className="p-2 border border-surface-container-highest rounded-lg text-outline hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
