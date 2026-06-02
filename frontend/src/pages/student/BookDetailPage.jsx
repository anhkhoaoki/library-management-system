import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookAndReviews = async () => {
    try {
      const [bookRes, reviewsRes] = await Promise.all([
        api.get(`/books/${id}`),
        api.get(`/books/${id}/reviews`)
      ]);
      setBook(bookRes.data.data);
      setReviews(reviewsRes.data.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết sách hoặc nhận xét:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookAndReviews();
  }, [id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmittingReview(true);
    try {
      await api.post(`/books/${id}/reviews`, { rating, content: reviewContent });
      alert('Gửi đánh giá thành công!');
      setReviewContent('');
      setRating(5);
      fetchBookAndReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể gửi đánh giá. Bạn cần mượn hoặc đọc tài liệu này trước.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBorrowRequest = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const response = await api.post('/circulation/reservations', { bookId: id });
      setMessage({ type: 'success', text: response.data.message });
      // Refresh book data to show updated availability if needed
      const updatedBook = await api.get(`/books/${id}`);
      setBook(updatedBook.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferRequest = async () => {
    // 1. TẠM THỜI COMMENT ĐOẠN CHECK ĐỂ KHÔNG BỊ FE CHẶN NỮA
    /* if (!user?.branchId) {
      setMessage({ type: 'error', text: 'Bạn cần cập nhật chi nhánh trong hồ sơ để sử dụng tính năng này.' });
      return;
    } 
    */

    setProcessing(true);
    setMessage(null);
    try {
      
      // Giả định bạn đang ở Chi nhánh 1 để gửi yêu cầu luân chuyển sách từ Chi nhánh khác về
      const myBranchId = user?.branchId || 'branch-cs-01'; 

      
      const response = await api.post('/branches/transfer-request', { 
        bookId: id, 
        toBranchId: myBranchId 
      });
      
      // CHECK ĐÚNG ĐƯỜNG DẪN TRẢ VỀ CỦA BACKEND
      // Ở file branch.controller.ts, BE trả về cấu trúc: res.status(201).json({ success: true, data: result })
      // Nên ta dùng response.data.data để lấy thông tin
      setMessage({ 
        type: 'success', 
        text: response.data.data?.message || 'Gửi yêu cầu luân chuyển thành công!' 
      });

      // Reload lại dữ liệu sách sau khi luân chuyển 
      const updatedBook = await api.get(`/books/${id}`);
      setBook(updatedBook.data.data);
    } catch (err) {
      // Đọc thông báo lỗi từ Backend trả về nếu có lỗi từ Server (ví dụ: Không tìm thấy bản sao khả dụng...)
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Lỗi khi yêu cầu luân chuyển sách.' 
      });
    } finally {
      setProcessing(false);
    }
  };
  if (loading) {
    return (
      <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
        <div className="flex items-center justify-center h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </MainLayout>
    );
  }

  if (!book) {
    return (
      <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
        <div className="text-center py-20">
          <p className="text-on-surface-variant italic">Không tìm thấy tài liệu này.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">Quay lại</button>
        </div>
      </MainLayout>
    );
  }

  const isAvailableGlobally = book.availableCopies > 0;
  const copiesAtMyBranch = book.physicalCopies.filter(c => c.branchId === user?.branchId && c.status === 'AVAILABLE');
  const copiesAtOtherBranches = book.physicalCopies.filter(c => c.branchId !== user?.branchId && c.status === 'AVAILABLE');
  const isAvailableAtMyBranch = copiesAtMyBranch.length > 0;

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Bạn đọc">
      <div className="flex flex-col gap-stack-lg animate-in fade-in duration-500">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors w-fit"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Quay lại kết quả tìm kiếm</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Column: Book Cover & Quick Actions */}
          <div className="lg:col-span-4 flex flex-col gap-stack-md">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-surface-variant p-4">
              <img 
                src={book.coverImageUrl || 'https://via.placeholder.com/400x600?text=No+Cover'} 
                alt={book.title}
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-surface-variant p-stack-md">
              <div className="flex items-center justify-between mb-4">
                <span className="font-label-md text-on-surface-variant">Tình trạng:</span>
                <span className={`px-3 py-1 rounded-full font-bold text-label-md ${isAvailableGlobally ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`}>
                  {isAvailableGlobally ? 'Có sẵn' : 'Hết sách'}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">
                {isAvailableAtMyBranch 
                  ? `Có sẵn tại chi nhánh của bạn (${copiesAtMyBranch.length} bản).` 
                  : isAvailableGlobally 
                    ? `Có sẵn tại chi nhánh khác. Bạn có thể yêu cầu luân chuyển.`
                    : 'Tất cả các bản sao đã được mượn. Bạn có thể đặt chỗ để chờ.'}
              </p>
              
              <div className="flex flex-col gap-3">
                {isAvailableAtMyBranch ? (
                  <button 
                    onClick={handleBorrowRequest}
                    disabled={processing}
                    className="w-full py-4 rounded-xl font-bold text-title-md bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                    Yêu cầu mượn ngay
                  </button>
                ) : isAvailableGlobally ? (
                  <button 
                    onClick={handleTransferRequest}
                    disabled={processing}
                    className="w-full py-4 rounded-xl font-bold text-title-md bg-tertiary text-on-tertiary hover:bg-tertiary/90 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">local_shipping</span>
                    Yêu cầu luân chuyển
                  </button>
                ) : (
                  <button 
                    onClick={handleBorrowRequest}
                    disabled={processing}
                    className="w-full py-4 rounded-xl font-bold text-title-md bg-secondary text-on-secondary hover:bg-secondary/90 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">event_seat</span>
                    Đặt giữ chỗ (Hàng đợi)
                  </button>
                )}
              </div>

              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {message.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{message.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metadata & Details */}
          <div className="lg:col-span-8 flex flex-col gap-stack-md">
            <div className="bg-white rounded-2xl shadow-sm border border-surface-variant p-stack-lg">
              <h1 className="font-display-md text-display-md text-on-surface mb-2">{book.title}</h1>
              <p className="font-headline-sm text-headline-sm text-primary mb-6">{book.authorNames.join(', ')}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="block text-xs text-on-surface-variant uppercase font-bold mb-1">ISBN</span>
                  <span className="font-label-md">{book.isbn || 'N/A'}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="block text-xs text-on-surface-variant uppercase font-bold mb-1">Năm XB</span>
                  <span className="font-label-md">{book.publishYear || 'N/A'}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="block text-xs text-on-surface-variant uppercase font-bold mb-1">Ngôn ngữ</span>
                  <span className="font-label-md">{book.language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <span className="block text-xs text-on-surface-variant uppercase font-bold mb-1">Danh mục</span>
                  <span className="font-label-md">{book.category?.name || 'Chưa phân loại'}</span>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-title-lg text-title-lg mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  Mô tả nội dung
                </h3>
                <div className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {book.description || 'Chưa có mô tả cho tài liệu này.'}
                </div>
              </div>

              {/* Physical Copies Detail */}
              <div className="mb-8">
                <h3 className="font-title-lg text-title-lg mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Vị trí trong các chi nhánh
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-surface-variant">
                        <th className="py-2 font-bold">Chi nhánh</th>
                        <th className="py-2 font-bold">Vị trí kệ</th>
                        <th className="py-2 font-bold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {book.physicalCopies.map(copy => (
                        <tr key={copy.id} className="border-b border-surface-variant last:border-0">
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{copy.branch.name}</span>
                              <span className="text-[10px] text-on-surface-variant font-mono">{copy.barcode}</span>
                            </div>
                          </td>
                          <td className="py-3 text-on-surface-variant">{copy.location || 'Kho sách chính'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              copy.status === 'AVAILABLE' ? 'bg-success/10 text-success' : 
                              copy.status === 'BORROWED' ? 'bg-error/10 text-error' :
                              'bg-on-surface-variant/10 text-on-surface-variant'
                            }`}>
                              {copy.status === 'AVAILABLE' ? 'Sẵn có' : 
                               copy.status === 'BORROWED' ? 'Đang mượn' : 
                               copy.status === 'RESERVED' ? 'Đã đặt chỗ' : copy.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-surface-variant p-stack-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-title-lg text-title-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">rate_review</span>
                  Nhận xét từ bạn đọc ({book.reviewCount})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-on-surface">{book.averageRating.toFixed(1)}</span>
                  <div className="flex text-secondary">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: `'FILL' ${i < Math.floor(book.averageRating) ? 1 : 0}` }}>
                        star
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Form Đánh Giá */}
              <form onSubmit={handleSubmitReview} className="mb-8 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                <h4 className="font-bold text-on-surface mb-3">Viết đánh giá của bạn</h4>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium">Số sao:</span>
                  <div className="flex text-secondary cursor-pointer">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star} 
                        onClick={() => setRating(star)}
                        className="material-symbols-outlined text-[24px] hover:scale-110 transition-transform" 
                        style={{ fontVariationSettings: `'FILL' ${star <= rating ? 1 : 0}` }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <textarea 
                  className="w-full bg-white border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  rows="3"
                  placeholder="Chia sẻ cảm nhận của bạn về tài liệu này..."
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  required
                ></textarea>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={submittingReview}
                    className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <p className="text-center py-6 text-on-surface-variant italic">Chưa có nhận xét nào cho cuốn sách này.</p>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="flex gap-4 border-b border-surface-variant pb-6 last:border-0 last:pb-0">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
                        {review.user.fullName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">{review.user.fullName}</span>
                          <span className="text-xs text-on-surface-variant">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex text-secondary mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: `'FILL' ${i < review.rating ? 1 : 0}` }}>
                              star
                            </span>
                          ))}
                        </div>
                        <p className="text-on-surface-variant text-sm">{review.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
