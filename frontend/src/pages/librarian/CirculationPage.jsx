import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function CirculationPage() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [readerCode, setReaderCode] = useState(location.state?.readerCode || '');
  const [reader, setReader] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [readerReservations, setReaderReservations] = useState([]);
  const [readerBorrows, setReaderBorrows] = useState([]);
  const [readerFines, setReaderFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick Book Lookup State
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Selected reservation details for quick borrow processing
  const [selectedResId, setSelectedResId] = useState(null);
  const [availableCopies, setAvailableCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);

  useEffect(() => {
    if (location.state?.readerCode) {
      handleReaderLookup();
    }
  }, []);

  const handleReaderLookup = async () => {
    const code = readerCode || location.state?.readerCode;
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/users/lookup/${code}`);
      const userData = response.data.data;
      setReader(userData);
      
      // Fetch reservations, active borrows, and fines for this reader
      const [resResponse, borrowResponse, finesResponse] = await Promise.all([
        api.get(`/users/me/reservations?userId=${userData.id}`),
        api.get(`/users/me/borrow-history?userId=${userData.id}&status=ACTIVE`),
        api.get(`/users/me/fines?userId=${userData.id}`)
      ]);
      
      setReaderReservations(resResponse.data.data.filter(r => 
        r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP'
      ));
      setReaderBorrows(borrowResponse.data.data);
      setReaderFines(finesResponse.data.data.filter(f => f.status === 'PENDING'));
    } catch (err) {
      setError('Không tìm thấy bạn đọc hoặc lỗi tải dữ liệu');
      setReader(null);
      setReaderReservations([]);
      setReaderBorrows([]);
      setReaderFines([]);
    }
    setLoading(false);
  };

  const handleQuickLookup = async () => {
    if (!lookupBarcode) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const response = await api.get(`/circulation/lookup/${lookupBarcode}`);
      setLookupResult(response.data.data);
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Không tìm thấy ấn phẩm');
    }
    setLookupLoading(false);
  };

  const handlePayFine = async (fineId) => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/circulation/fines/${fineId}/pay`);
      await handleReaderLookup();
      setScannedItems(prev => [
        {
          id: Date.now(),
          barcode: 'N/A',
          title: 'Thu tiền phạt quá hạn',
          type: 'return',
          status: 'Thanh toán thành công',
          isError: false,
        },
        ...prev
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi thanh toán phí phạt');
    }
    setLoading(false);
  };

  const handleSelectReservation = async (res) => {
    setSelectedResId(res.id);
    setLoadingCopies(true);
    setAvailableCopies([]);
    try {
      const response = await api.get(`/books/${res.bookId}`);
      const copies = response.data.data.physicalCopies || [];
      // Only show copies that are AVAILABLE or RESERVED (which can be assigned to this user)
      const validCopies = copies.filter(c => c.status === 'AVAILABLE' || c.status === 'RESERVED');
      setAvailableCopies(validCopies);
    } catch (err) {
      setError('Lỗi khi tải danh sách bản sao vật lý khả dụng');
    }
    setLoadingCopies(false);
  };

  const handleConfirmBorrowReservation = async (barcodeVal) => {
    if (!reader || !barcodeVal) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/circulation/borrow', {
        userId: reader.id,
        barcode: barcodeVal
      });
      const result = response.data.data;
      setScannedItems(prev => [
        {
          id: Date.now(),
          barcode: result.barcode,
          title: result.bookTitle,
          type: 'borrow',
          status: `Hạn trả: ${new Date(result.dueDate).toLocaleDateString('vi-VN')}`,
          isError: false,
        },
        ...prev
      ]);
      setSelectedResId(null);
      setAvailableCopies([]);
      await handleReaderLookup();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi mượn sách');
    }
    setLoading(false);
  };

  const handleBorrow = async () => {
    if (!reader || !barcode) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/circulation/borrow', {
        userId: reader.id,
        barcode: barcode
      });
      const result = response.data.data;
      setScannedItems([
        {
          id: Date.now(),
          barcode: result.barcode,
          title: result.bookTitle,
          type: 'borrow',
          status: `Hạn trả: ${new Date(result.dueDate).toLocaleDateString('vi-VN')}`,
          isError: false,
        },
        ...scannedItems
      ]);
      setBarcode('');
      // Refresh reader details so borrowing lists and counts are up to date!
      await handleReaderLookup();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi mượn sách');
    }
    setLoading(false);
  };

  const handleReturn = async (recordId = null) => {
    const idToReturn = recordId || barcode;
    if (!idToReturn) return;
    setLoading(true);
    setError('');
    try {
      // Try return by ID first if we have it, otherwise try barcode then ID
      let response;
      if (recordId) {
        response = await api.post('/circulation/return-by-id', { recordId });
      } else {
        try {
          response = await api.post('/circulation/return', { barcode: idToReturn });
        } catch (e) {
          response = await api.post('/circulation/return-by-id', { recordId: idToReturn });
        }
      }
      
      const result = response.data.data || response.data; // Handle different response formats
      setScannedItems([
        {
          id: Date.now(),
          barcode: idToReturn,
          title: result.bookTitle || 'Tài liệu',
          type: 'return',
          status: result.fine ? result.fine.message : 'Trả sách thành công',
          fine: result.fine ? `${result.fine.amount.toLocaleString()}đ` : null,
          isError: !!result.fine,
        },
        ...scannedItems
      ]);
      setBarcode('');
      // Refresh reader data after return
      if (reader) handleReaderLookup();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi trả sách');
    }
    setLoading(false);
  };

  return (
    <MainLayout role="librarian" userName={user?.fullName} userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <header className="flex justify-between items-end pb-stack-sm border-b border-outline-variant">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Quản lý lưu thông</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit">Cán bộ: {user?.fullName}</p>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            <span className="font-body-md">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Reader Profile */}
          <div className="md:col-span-4 flex flex-col gap-stack-md">
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Định danh bạn đọc</h2>
                <span className="material-symbols-outlined text-outline">badge</span>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-sm">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-md"
                    placeholder="Mã SV / Email..."
                    type="text"
                    value={readerCode}
                    onChange={(e) => setReaderCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleReaderLookup()}
                  />
                  <button onClick={handleReaderLookup} className="bg-primary text-on-primary px-4 py-2 rounded-lg">
                    <span className="material-symbols-outlined">{loading ? 'progress_activity' : 'search'}</span>
                  </button>
                </div>
              </div>
            </section>

            {reader && (
              <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-in fade-in slide-in-from-left-4">
                <div className="p-stack-md bg-surface-bright flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl shadow-sm">
                    {reader.fullName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-on-surface">{reader.fullName}</h3>
                    <span className="text-sm text-on-surface-variant">{reader.email}</span>
                    <span className={`mt-2 text-xs px-2 py-0.5 rounded-full w-fit ${reader.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {reader.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </div>
                </div>
                <div className="px-stack-md py-stack-sm grid grid-cols-2 gap-4 border-t border-outline-variant bg-surface-container-lowest">
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Mã số</span>
                    <span className="font-bold">{reader.studentId || reader.readerCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Sách đang mượn</span>
                    <span className="font-bold">{readerBorrows.length}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Book Lookup Widget */}
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Tra cứu sách nhanh</h2>
                <span className="material-symbols-outlined text-outline">search</span>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-sm">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-md"
                    placeholder="Nhập mã vạch sách..."
                    type="text"
                    value={lookupBarcode}
                    onChange={(e) => setLookupBarcode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickLookup()}
                  />
                  <button onClick={handleQuickLookup} className="bg-secondary text-on-secondary px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors">
                    <span className="material-symbols-outlined">{lookupLoading ? 'progress_activity' : 'barcode_scanner'}</span>
                  </button>
                </div>
                
                {lookupError && (
                  <p className="text-sm text-error mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {lookupError}
                  </p>
                )}
                
                {lookupResult && (
                  <div className="mt-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-lg animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="font-bold text-sm text-on-surface mb-1">{lookupResult.book.title}</h4>
                    <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
                      <span className="flex items-center justify-between">
                        Mã vạch: <span className="font-bold">{lookupResult.barcode}</span>
                      </span>
                      <span className="flex items-center justify-between">
                        Trạng thái: 
                        <span className={`font-bold uppercase ${lookupResult.status === 'AVAILABLE' ? 'text-success' : lookupResult.status === 'BORROWED' ? 'text-error' : 'text-warning'}`}>
                          {lookupResult.status === 'AVAILABLE' ? 'Sẵn có' : lookupResult.status === 'BORROWED' ? 'Đã mượn' : 'Khác'}
                        </span>
                      </span>
                      <span className="flex items-center justify-between">
                        Chi nhánh: <span>{lookupResult.branch.name}</span>
                      </span>
                      {lookupResult.location && (
                        <span className="flex items-center justify-between">
                          Vị trí: <span>{lookupResult.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Reader Unpaid Fines */}
            {reader && readerFines.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-error/30 overflow-hidden animate-in fade-in slide-in-from-left-4">
                <div className="p-stack-md border-b border-error/20 bg-error/5 flex items-center justify-between">
                  <h2 className="font-title-md text-error flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-error">payments</span>
                    Khoản phạt chưa thanh toán ({readerFines.length})
                  </h2>
                </div>
                <div className="divide-y divide-outline-variant">
                  {readerFines.map(fine => (
                    <div key={fine.id} className="p-stack-md flex flex-col gap-2 bg-error/[0.01]">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-on-surface leading-tight">
                          {fine.borrowRecord?.physicalCopy?.book?.title || 'Tài liệu'}
                        </span>
                        <span className="text-xs font-bold text-error">
                          {Number(fine.totalAmount).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <div className="flex flex-col text-on-surface-variant">
                          <span>Quá hạn: {fine.daysOverdue} ngày</span>
                          <span className="text-[10px] text-outline">Đơn giá: {Number(fine.dailyRate).toLocaleString('vi-VN')}đ/ngày</span>
                        </div>
                        <button 
                          onClick={() => handlePayFine(fine.id)}
                          className="bg-error text-white px-3 py-1 rounded-md font-bold text-xs hover:bg-error-container hover:text-on-error-container transition-all"
                        >
                          Thu tiền
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {reader && readerBorrows.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-in fade-in slide-in-from-left-4">
                <div className="p-stack-md border-b border-outline-variant bg-primary-container/10 flex items-center justify-between">
                  <h2 className="font-title-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">book_2</span>
                    Sách đang mượn ({readerBorrows.length})
                  </h2>
                </div>
                <div className="divide-y divide-outline-variant">
                  {readerBorrows.map(borrow => (
                    <div key={borrow.id} className="p-stack-md flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-on-surface leading-tight">{borrow.physicalCopy.book.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${borrow.status === 'OVERDUE' ? 'bg-error text-white' : 'bg-primary text-white'}`}>
                          {borrow.status === 'OVERDUE' ? 'Quá hạn' : 'Đang mượn'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">Hạn trả: {new Date(borrow.dueDate).toLocaleDateString('vi-VN')}</span>
                          <span className="text-[10px] text-outline">ID phiếu: {borrow.id}</span>
                        </div>
                        <button 
                          onClick={() => handleReturn(borrow.id)}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-md font-bold text-xs hover:bg-primary/20 transition-all"
                        >
                          Trả sách
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {reader && readerReservations.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-in fade-in slide-in-from-left-4">
                <div className="p-stack-md border-b border-outline-variant bg-secondary-container/10 flex items-center justify-between">
                  <h2 className="font-title-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">event_seat</span>
                    Sách đang đặt chỗ ({readerReservations.length})
                  </h2>
                </div>
                <div className="divide-y divide-outline-variant">
                  {readerReservations.map(res => {
                    const isSelected = selectedResId === res.id;
                    return (
                      <div key={res.id} className={`p-stack-md flex flex-col gap-2 transition-all ${isSelected ? 'bg-primary-container/5 border-l-4 border-primary' : ''}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-on-surface leading-tight">{res.book.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${res.status === 'READY_FOR_PICKUP' ? 'bg-success text-white' : 'bg-warning text-on-warning'}`}>
                            {res.status === 'READY_FOR_PICKUP' ? 'Sẵn sàng' : 'Đang chờ'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-on-surface-variant">ISBN: {res.book.isbn || 'N/A'}</span>
                          {res.status === 'READY_FOR_PICKUP' && !isSelected && (
                            <button 
                              onClick={() => handleSelectReservation(res)}
                              className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_circle_right</span>
                              Xử lý mượn
                            </button>
                          )}
                          {isSelected && (
                            <button 
                              onClick={() => { setSelectedResId(null); setAvailableCopies([]); }}
                              className="text-on-surface-variant font-bold text-xs hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">cancel</span>
                              Hủy
                            </button>
                          )}
                        </div>

                        {/* List of physical copies if selected */}
                        {isSelected && (
                          <div className="mt-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                              Chọn bản sao vật lý:
                            </h4>
                            {loadingCopies ? (
                              <div className="flex items-center gap-2 justify-center py-4 text-xs text-outline">
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                Đang tải bản sao...
                              </div>
                            ) : availableCopies.length === 0 ? (
                              <p className="text-xs italic text-error py-2">Không tìm thấy bản sao khả dụng nào.</p>
                            ) : (
                              <div className="space-y-2">
                                {availableCopies.map(copy => (
                                  <div key={copy.id} className="flex justify-between items-center bg-white p-2 rounded border border-outline-variant hover:border-primary transition-all text-xs">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-on-surface">{copy.barcode}</span>
                                      <span className="text-[10px] text-on-surface-variant">
                                        {copy.branch.name} {copy.location ? ` - Kệ: ${copy.location}` : ''}
                                      </span>
                                      <span className={`text-[9px] font-bold uppercase mt-0.5 ${copy.status === 'AVAILABLE' ? 'text-success' : 'text-warning'}`}>
                                        {copy.status === 'AVAILABLE' ? 'Sẵn có' : 'Giữ chỗ'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleConfirmBorrowReservation(copy.barcode)}
                                      className="bg-primary text-on-primary px-2.5 py-1 rounded font-bold hover:bg-primary-container transition-all text-[11px]"
                                    >
                                      Chọn mượn
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Transaction Processing */}
          <div className="md:col-span-8 flex flex-col gap-stack-md">
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-title-lg text-on-surface">Thao tác mượn/trả</h2>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-md bg-surface-bright">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline">barcode_scanner</span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-primary/20 rounded-xl font-body-lg focus:border-primary focus:ring-0 transition-all"
                      placeholder="Mã vạch sách hoặc ID phiếu..."
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>
                  <button 
                    disabled={!reader || !barcode || loading}
                    onClick={handleBorrow}
                    className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-primary-container transition-all disabled:opacity-50"
                  >
                    Mượn
                  </button>
                  <button 
                    disabled={!barcode || loading}
                    onClick={handleReturn}
                    className="bg-white border-2 border-primary text-primary px-8 py-3 rounded-xl font-bold hover:bg-primary/5 transition-all disabled:opacity-50"
                  >
                    Trả
                  </button>
                </div>
              </div>
            </section>

            <section className="flex-1 bg-white rounded-xl shadow-sm border border-outline-variant flex flex-col overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h2 className="font-bold text-on-surface">Hoạt động trong phiên</h2>
                <span className="text-xs bg-white py-1 px-3 rounded-full border border-outline-variant">
                  {scannedItems.length} thao tác
                </span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-[400px]">
                {scannedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-on-surface-variant/40 py-20">
                    <span className="material-symbols-outlined text-6xl">receipt_long</span>
                    <p className="mt-2 font-bold">Chưa có giao dịch nào được thực hiện</p>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-variant">
                    {scannedItems.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-container-lowest transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${item.type === 'borrow' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                            <span className="material-symbols-outlined">
                              {item.type === 'borrow' ? 'how_to_reg' : 'keyboard_return'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-on-surface">{item.title}</h4>
                            <p className="text-xs text-on-surface-variant">Mã: {item.barcode}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`block font-bold text-sm ${item.isError ? 'text-error' : 'text-success'}`}>
                            {item.status}
                          </span>
                          {item.fine && <span className="text-xs text-error font-bold">{item.fine}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-outline-variant flex justify-end">
                <button 
                  onClick={() => { setScannedItems([]); setReader(null); setReaderCode(''); setBarcode(''); }}
                  className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg font-bold hover:bg-surface-container-highest transition-all"
                >
                  Xóa phiên làm việc
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
