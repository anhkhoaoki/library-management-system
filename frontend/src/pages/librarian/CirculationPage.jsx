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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      // Fetch reservations and active borrows for this reader
      const [resResponse, borrowResponse] = await Promise.all([
        api.get(`/users/me/reservations?userId=${userData.id}`),
        api.get(`/users/me/borrow-history?userId=${userData.id}&status=ACTIVE`)
      ]);
      
      setReaderReservations(resResponse.data.data.filter(r => 
        r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP'
      ));
      setReaderBorrows(borrowResponse.data.data);
    } catch (err) {
      setError('Không tìm thấy bạn đọc hoặc lỗi tải dữ liệu');
      setReader(null);
      setReaderReservations([]);
      setReaderBorrows([]);
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
                    <span className="font-bold">N/A</span>
                  </div>
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
                  {readerReservations.map(res => (
                    <div key={res.id} className="p-stack-md flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-on-surface leading-tight">{res.book.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${res.status === 'READY_FOR_PICKUP' ? 'bg-success text-white' : 'bg-warning text-on-warning'}`}>
                          {res.status === 'READY_FOR_PICKUP' ? 'Sẵn sàng' : 'Đang chờ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-on-surface-variant">ISBN: {res.book.isbn || 'N/A'}</span>
                        {res.status === 'READY_FOR_PICKUP' && (
                          <button 
                            onClick={() => {
                              setError(`Vui lòng nhập/quét mã vạch cho sách: ${res.book.title}`);
                              // Pre-fill if possible? No, we need a barcode
                            }}
                            className="text-primary font-bold text-xs hover:underline"
                          >
                            Xử lý mượn
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
