import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    authorNames: '',
    isbn: '',
    publisher: '',
    publishYear: '',
    categoryId: '',
    description: '',
    language: 'vi',
    coverImageUrl: '',
    copiesByBranch: {},
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [physicalCopies, setPhysicalCopies] = useState([]);
  const [newCopy, setNewCopy] = useState({
    barcode: '',
    branchId: '',
    location: '',
    condition: 'GOOD'
  });
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [page, searchQuery, selectedCategory]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/books/search', {
        params: { 
          q: searchQuery, 
          categoryId: selectedCategory || undefined,
          page, 
          limit: 12 
        }
      });
      setBooks(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/books/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/admin/branches');
      setBranches(response.data.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchBookCopies = async (bookId) => {
    try {
      const response = await api.get(`/books/${bookId}`);
      setPhysicalCopies(response.data.data.physicalCopies || []);
    } catch (err) {
      console.error('Error fetching book copies:', err);
    }
  };

  const handleAddCopy = async () => {
    if (!editingBook || !newCopy.barcode || !newCopy.branchId) {
      alert('Vui lòng điền mã vạch và chọn cơ sở');
      return;
    }
    try {
      await api.post(`/books/${editingBook.id}/copies`, newCopy);
      alert('Thêm bản sao thành công');
      setNewCopy({ barcode: '', branchId: '', location: '', condition: 'GOOD' });
      fetchBookCopies(editingBook.id);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi thêm bản sao');
    }
  };

  const handleUpdateCopy = async (copyId, updatedData) => {
    try {
      await api.put(`/books/copies/${copyId}`, updatedData);
      alert('Cập nhật bản sao thành công');
      fetchBookCopies(editingBook.id);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật bản sao');
    }
  };

  const handleDeleteCopy = async (copyId, barcode) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản sao "${barcode}"?`)) return;
    try {
      await api.delete(`/books/copies/${copyId}`);
      alert('Xóa bản sao thành công');
      fetchBookCopies(editingBook.id);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa bản sao');
    }
  };

  const handleCopyFieldChange = (copyId, field, value) => {
    setPhysicalCopies(prev => prev.map(c => c.id === copyId ? { ...c, [field]: value } : c));
  };

  const handleIsbnFill = async () => {
    if (!formData.isbn) return;
    setIsbnLoading(true);
    try {
      const response = await api.get(`/books/isbn/${formData.isbn}`);
      const info = response.data.data;
      setFormData({
        ...formData,
        title: info.title || formData.title,
        authorNames: info.authorNames?.join(', ') || formData.authorNames,
        publisher: info.publisher || formData.publisher,
        publishYear: info.publishYear || formData.publishYear,
        description: info.description || formData.description,
        language: info.language || formData.language,
        coverImageUrl: info.coverImageUrl || formData.coverImageUrl,
      });
    } catch (error) {
      console.error('Error fetching book info by ISBN:', error);
      const message = error.response?.data?.message || 'Không tìm thấy thông tin sách hoặc lỗi kết nối máy chủ';
      alert(message);
    }
    setIsbnLoading(false);
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmImport = window.confirm(`Bạn có chắc chắn muốn nhập dữ liệu từ file "${file.name}"?`);
    if (!confirmImport) return;

    setImportLoading(true);
    const formDataImport = new FormData();
    formDataImport.append('file', file);

    try {
      const response = await api.post('/books/import', formDataImport, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const result = response.data.data;
      alert(`Nhập dữ liệu thành công: ${result.success} thành công, ${result.failed} thất bại.`);
      fetchBooks();
    } catch (error) {
      alert('Lỗi khi nhập file Excel');
    }
    setImportLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      authorNames: formData.authorNames.split(',').map(a => a.trim()),
      publishYear: formData.publishYear ? parseInt(formData.publishYear) : undefined,
    };

    try {
      if (editingBook) {
        await api.put(`/books/${editingBook.id}`, payload);
      } else {
        await api.post('/books', payload);
      }
      setIsModalOpen(false);
      fetchBooks();
    } catch (error) {
      alert('Lỗi khi lưu thông tin sách: ' + (error.response?.data?.message || error.message));
    }
  };

  const openAddModal = () => {
    setEditingBook(null);
    setPhysicalCopies([]);
    setFormData({
      title: '',
      authorNames: '',
      isbn: '',
      publisher: '',
      publishYear: '',
      categoryId: '',
      description: '',
      language: 'vi',
      coverImageUrl: '',
      copiesByBranch: {},
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (book) => {
    setIsModalOpen(true);
    setEditingBook(book);
    setPhysicalCopies([]);
    setFormData({
      title: book.title,
      authorNames: book.authorNames?.join(', ') || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      publishYear: book.publishYear || '',
      categoryId: book.category?.id || '',
      description: book.description || '',
      language: book.language || 'vi',
      coverImageUrl: book.coverImageUrl || '',
      copiesByBranch: {},
    });

    try {
      const response = await api.get(`/books/${book.id}`);
      const fullBook = response.data.data;
      setPhysicalCopies(fullBook.physicalCopies || []);
      
      const copiesByBranch = {};
      branches.forEach(br => {
        copiesByBranch[br.id] = { quantity: 0, location: '' };
      });
      
      fullBook.physicalCopies?.forEach(copy => {
        if (!copiesByBranch[copy.branchId]) {
          copiesByBranch[copy.branchId] = { quantity: 0, location: '' };
        }
        copiesByBranch[copy.branchId].quantity += 1;
        if (copy.location) {
          copiesByBranch[copy.branchId].location = copy.location;
        }
      });

      setFormData(prev => ({
        ...prev,
        copiesByBranch
      }));
    } catch (error) {
      console.error('Error fetching full book details:', error);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa cuốn sách "${title}" khỏi thư viện?`)) return;
    try {
      await api.delete(`/books/${id}`);
      alert(`Đã xóa cuốn sách "${title}" thành công!`);
      fetchBooks();
    } catch (error) {
      alert('Lỗi khi xóa sách: ' + (error.response?.data?.message || error.message));
    }
  };

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
            <label className="flex items-center justify-center px-4 py-2 bg-surface text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer flex-1 md:flex-none">
              <span className="material-symbols-outlined mr-2 text-[20px]">upload_file</span>
              {importLoading ? 'Đang xử lý...' : 'Nhập hàng loạt'}
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} disabled={importLoading} />
            </label>
            <button 
              onClick={openAddModal}
              className="flex items-center justify-center px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed-variant transition-colors flex-1 md:flex-none shadow-[0_4px_6px_rgba(0,0,0,0.1)]"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
              Thêm mới
            </button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-stack-md border border-surface-container-highest">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full pl-10 pr-12 py-2.5 bg-surface-container-low border-transparent focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface transition-all"
                placeholder="Tìm kiếm theo tiêu đề, tác giả, ISBN..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:col-span-4 relative">
              <select
                className="w-full pl-4 pr-10 py-2.5 bg-surface-container-low border border-transparent focus:border-secondary focus:bg-white focus:ring-1 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface transition-all cursor-pointer appearance-none"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Tất cả thể loại</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">keyboard_arrow_down</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Data Table / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-stack-lg">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)] transition-shadow border border-surface-container-highest overflow-hidden flex flex-col relative"
                >
                  <div className="relative h-48 w-full bg-surface-container-high flex-shrink-0">
                    {book.coverImageUrl ? (
                      <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-outline-variant">
                        <span className="material-symbols-outlined text-6xl">menu_book</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center shadow-sm z-10">
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-secondary"></span>
                      {book.availableCopies > 0 ? 'Sẵn sàng' : 'Hết sách'}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-title-lg text-title-lg text-on-surface line-clamp-2">{book.title}</h3>
                      <div className="flex space-x-1 ml-2 flex-shrink-0">
                        <button onClick={() => openEditModal(book)} className="text-outline hover:text-primary transition-colors p-1">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(book.id, book.title)} className="text-outline hover:text-error transition-colors p-1">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-1">
                      {book.authorNames?.join(', ')} • {book.category?.name}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-container-highest">
                      <span className="font-label-sm text-label-sm text-outline">ISBN: {book.isbn || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-surface-container-highest">
              <span className="font-body-md text-body-md text-on-surface-variant">Trang {page} / {totalPages}</span>
              <div className="flex space-x-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 border border-surface-container-highest rounded-lg text-outline hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2 border border-surface-container-highest rounded-lg text-outline hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-small text-headline-small text-on-surface">
                  {editingBook ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu mới'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Cover Preview & Image Path */}
                  <div className="md:col-span-1 flex flex-col items-center justify-start space-y-4">
                    <label className="font-label-md text-label-md text-on-surface-variant w-full text-left font-semibold">Ảnh bìa tài liệu</label>
                    <div className="w-full aspect-[3/4] rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden shadow-inner relative">
                      {formData.coverImageUrl ? (
                        <img src={formData.coverImageUrl} alt="Book cover preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-outline-variant flex flex-col items-center p-4 text-center">
                          <span className="material-symbols-outlined text-6xl text-outline/55">image</span>
                          <span className="text-[12px] font-label-sm mt-2 text-outline-variant">Chưa có ảnh bìa</span>
                        </div>
                      )}
                    </div>
                    <div className="w-full space-y-1">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">Đường dẫn ảnh bìa (URL)</label>
                      <input
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-[13px]"
                        value={formData.coverImageUrl}
                        onChange={(e) => setFormData({...formData, coverImageUrl: e.target.value})}
                        placeholder="https://example.com/cover.jpg"
                      />
                    </div>
                  </div>

                  {/* Right Column: Book Details */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ISBN - full width in right column */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Mã ISBN</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                          value={formData.isbn}
                          onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                          placeholder="Ví dụ: 978..."
                        />
                        <button
                          type="button"
                          onClick={handleIsbnFill}
                          disabled={isbnLoading || !formData.isbn}
                          className="px-4 py-2 bg-secondary text-on-secondary rounded-lg hover:bg-secondary-fixed transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 font-label-md"
                        >
                          <span className="material-symbols-outlined text-[18px]">{isbnLoading ? 'progress_activity' : 'auto_fix'}</span>
                          {isbnLoading ? 'Đang lấy...' : 'Tự động điền'}
                        </button>
                      </div>
                    </div>

                    {/* Title - full width in right column */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Tiêu đề</label>
                      <input
                        required
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    {/* AuthorNames - full width in right column */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Tác giả (ngăn cách bằng dấu phẩy)</label>
                      <input
                        required
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.authorNames}
                        onChange={(e) => setFormData({...formData, authorNames: e.target.value})}
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Danh mục</label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Language */}
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Ngôn ngữ</label>
                      <select
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.language}
                        onChange={(e) => setFormData({...formData, language: e.target.value})}
                      >
                        <option value="vi">Tiếng Việt (vi)</option>
                        <option value="en">Tiếng Anh (en)</option>
                        <option value="ja">Tiếng Nhật (ja)</option>
                        <option value="fr">Tiếng Pháp (fr)</option>
                        <option value="zh">Tiếng Trung (zh)</option>
                      </select>
                    </div>

                    {/* Publisher */}
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Nhà xuất bản</label>
                      <input
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.publisher}
                        onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                      />
                    </div>

                    {/* PublishYear */}
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Năm xuất bản</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        value={formData.publishYear}
                        onChange={(e) => setFormData({...formData, publishYear: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-semibold">Mô tả</label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                {editingBook ? (
                  // Advanced Physical Copy Management for existing books
                  <div className="border-t border-outline-variant pt-4 space-y-4">
                    <h4 className="font-title-medium text-title-medium text-on-surface font-bold">
                      Quản lý chi tiết từng bản sao vật lý
                    </h4>
                    
                    {/* List of copies */}
                    {physicalCopies.length === 0 ? (
                      <p className="text-sm italic text-on-surface-variant bg-surface-container-low p-4 rounded-lg text-center">
                        Đầu sách này chưa có bản sao vật lý nào. Hãy thêm bản sao mới bên dưới.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-outline-variant rounded-lg">
                        <table className="w-full border-collapse text-left text-xs bg-white">
                          <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                            <tr>
                              <th className="p-3">Mã vạch (Barcode)</th>
                              <th className="p-3">Cơ sở</th>
                              <th className="p-3">Vị trí kệ</th>
                              <th className="p-3">Tình trạng</th>
                              <th className="p-3">Trạng thái</th>
                              <th className="p-3 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant">
                            {physicalCopies.map(copy => (
                              <tr key={copy.id} className="hover:bg-surface-container-lowest transition-colors">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                    value={copy.barcode}
                                    onChange={(e) => handleCopyFieldChange(copy.id, 'barcode', e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={copy.branchId}
                                    onChange={(e) => handleCopyFieldChange(copy.id, 'branchId', e.target.value)}
                                  >
                                    {branches.map(br => (
                                      <option key={br.id} value={br.id}>{br.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={copy.location || ''}
                                    onChange={(e) => handleCopyFieldChange(copy.id, 'location', e.target.value)}
                                    placeholder="Kệ A1"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={copy.condition || 'GOOD'}
                                    onChange={(e) => handleCopyFieldChange(copy.id, 'condition', e.target.value)}
                                  >
                                    <option value="GOOD">Tốt (GOOD)</option>
                                    <option value="FAIR">Bình thường (FAIR)</option>
                                    <option value="POOR">Kém (POOR)</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <select
                                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary font-bold text-primary"
                                    value={copy.status}
                                    onChange={(e) => handleCopyFieldChange(copy.id, 'status', e.target.value)}
                                  >
                                    <option value="AVAILABLE">Sẵn có</option>
                                    <option value="BORROWED">Đang mượn</option>
                                    <option value="RESERVED">Đặt chỗ</option>
                                    <option value="TRANSFERRING">Luân chuyển</option>
                                    <option value="DAMAGED">Hỏng (DAMAGED)</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <div className="flex justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCopy(copy.id, {
                                        barcode: copy.barcode,
                                        branchId: copy.branchId,
                                        location: copy.location,
                                        condition: copy.condition,
                                        status: copy.status
                                      })}
                                      className="p-1 text-primary hover:bg-primary/10 rounded"
                                      title="Lưu thay đổi"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">save</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCopy(copy.id, copy.barcode)}
                                      disabled={copy.status === 'BORROWED'}
                                      className="p-1 text-error hover:bg-error/10 rounded disabled:opacity-30"
                                      title="Xóa bản sao"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Form to add new copy */}
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
                      <h5 className="font-bold text-xs text-on-surface flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-primary">add_circle</span>
                        Thêm một bản sao vật lý mới
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-on-surface-variant">Mã vạch (Barcode)</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                            value={newCopy.barcode}
                            onChange={(e) => setNewCopy({ ...newCopy, barcode: e.target.value })}
                            placeholder="Ví dụ: BK-..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-on-surface-variant">Cơ sở chi nhánh</label>
                          <select
                            className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                            value={newCopy.branchId}
                            onChange={(e) => setNewCopy({ ...newCopy, branchId: e.target.value })}
                          >
                            <option value="">Chọn cơ sở</option>
                            {branches.map(br => (
                              <option key={br.id} value={br.id}>{br.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-on-surface-variant">Vị trí kệ sách</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                            value={newCopy.location}
                            onChange={(e) => setNewCopy({ ...newCopy, location: e.target.value })}
                            placeholder="Kệ A1"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-medium text-on-surface-variant">Tình trạng vật lý</label>
                          <select
                            className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                            value={newCopy.condition}
                            onChange={(e) => setNewCopy({ ...newCopy, condition: e.target.value })}
                          >
                            <option value="GOOD">Tốt (GOOD)</option>
                            <option value="FAIR">Bình thường (FAIR)</option>
                            <option value="POOR">Kém (POOR)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleAddCopy}
                          className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-fixed-variant transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Xác nhận thêm bản sao
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Simple quantity initialization for new books
                  <div className="border-t border-outline-variant pt-4 space-y-3">
                    <h4 className="font-title-medium text-title-medium text-on-surface font-bold">
                      Khởi tạo bản sao vật lý theo cơ sở
                    </h4>
                    <div className="space-y-3">
                      {branches.map(br => (
                        <div key={br.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                          <div className="font-semibold text-on-surface text-sm md:col-span-4">
                            {br.name}
                          </div>
                          <div className="md:col-span-3 space-y-1">
                            <label className="block text-[11px] font-medium text-on-surface-variant">Số lượng bản sao</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                              value={formData.copiesByBranch?.[br.id]?.quantity || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setFormData({
                                  ...formData,
                                  copiesByBranch: {
                                    ...formData.copiesByBranch,
                                    [br.id]: {
                                      ...formData.copiesByBranch?.[br.id],
                                      quantity: val
                                    }
                                  }
                                });
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="md:col-span-5 space-y-1">
                            <label className="block text-[11px] font-medium text-on-surface-variant">Vị trí kệ sách</label>
                            <input
                              className="w-full px-3 py-1.5 bg-white border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                              value={formData.copiesByBranch?.[br.id]?.location || ''}
                              onChange={(e) => {
                                setFormData({
                                  ...formData,
                                  copiesByBranch: {
                                    ...formData.copiesByBranch,
                                    [br.id]: {
                                      ...formData.copiesByBranch?.[br.id],
                                      location: e.target.value
                                    }
                                  }
                                });
                              }}
                              placeholder="Ví dụ: Kệ A1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-fixed-variant transition-colors"
                  >
                    Lưu lại
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
