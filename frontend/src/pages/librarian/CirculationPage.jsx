import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function CirculationPage() {
  const [readerCode, setReaderCode] = useState('');
  const [reader, setReader] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReaderLookup = async () => {
    if (!readerCode) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/users/lookup/${readerCode}`);
      setReader(response.data.data);
    } catch (err) {
      setError('Không tìm thấy bạn đọc');
      setReader(null);
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

  const handleReturn = async () => {
    if (!barcode) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/circulation/return', { barcode });
      const result = response.data.data;
      setScannedItems([
        {
          id: Date.now(),
          barcode: barcode,
          title: result.bookTitle,
          type: 'return',
          status: result.fine ? result.fine.message : 'Trả sách thành công',
          fine: result.fine ? `${result.fine.amount.toLocaleString()}đ` : null,
          isError: !!result.fine,
        },
        ...scannedItems
      ]);
      setBarcode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi trả sách');
    }
    setLoading(false);
  };

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <header className="flex justify-between items-end pb-stack-sm border-b border-outline-variant">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Quản lý lưu thông</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit">Phiên làm việc: Ca sáng - Quầy 02</p>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            <span className="font-body-md">{error}</span>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* LEFT COLUMN: Reader Identification & Profile */}
          <div className="md:col-span-4 flex flex-col gap-stack-md">
            <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Định danh bạn đọc</h2>
                <span className="material-symbols-outlined text-outline">badge</span>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Quét thẻ hoặc nhập mã</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="Nhập mã sinh viên / Email..."
                    type="text"
                    value={readerCode}
                    onChange={(e) => setReaderCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleReaderLookup()}
                  />
                  <button 
                    onClick={handleReaderLookup}
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center justify-center hover:bg-on-primary-fixed-variant transition-colors"
                  >
                    <span className="material-symbols-outlined">{loading ? 'progress_activity' : 'search'}</span>
                  </button>
                </div>
              </div>
            </section>

            {reader && (
              <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden animate-fade-in">
                <div className="p-stack-md bg-surface-bright flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface-variant overflow-hidden border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center">
                    {reader.avatarUrl ? (
                      <img alt={reader.fullName} className="w-full h-full object-cover" src={reader.avatarUrl} />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-outline">account_circle</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-headline-md text-headline-md text-on-surface">{reader.fullName}</h3>
                    <span className="font-body-md text-body-md text-on-surface-variant">{reader.email}</span>
                    <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-full font-label-sm text-label-sm w-fit ${
                      reader.status === 'ACTIVE' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-error-container text-on-error-container'
                    }`}>
                      <span className="material-symbols-outlined text-[14px] mr-1">
                        {reader.status === 'ACTIVE' ? 'check_circle' : 'block'}
                      </span>
                      {reader.status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị khóa'}
                    </div>
                  </div>
                </div>
                <div className="px-stack-md py-stack-sm grid grid-cols-2 gap-4 border-t border-outline-variant">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Vai trò</span>
                    <span className="font-title-lg text-title-lg text-on-surface">{reader.role}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Mã số</span>
                    <span className="font-title-lg text-title-lg text-on-surface">{reader.studentId || 'N/A'}</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: Transaction & Processing */}
          <div className="md:col-span-8 flex flex-col gap-stack-md">
            <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-title-lg text-title-lg text-on-surface">Xử lý sách</h2>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-md bg-surface-bright">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline">barcode_scanner</span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-primary-fixed rounded-lg font-body-lg text-body-lg text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim transition-all shadow-inner"
                      placeholder="Quét mã vạch sách tại đây..."
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>
                  <button 
                    disabled={!reader || !barcode || loading}
                    onClick={handleBorrow}
                    className="bg-primary hover:bg-primary-container text-on-primary px-6 py-3 rounded-lg font-title-lg text-title-lg transition-colors flex items-center gap-2 shadow-[0_4px_6px_rgba(0,35,111,0.2)] disabled:opacity-50"
                  >
                    Mượn
                  </button>
                  <button 
                    disabled={!barcode || loading}
                    onClick={handleReturn}
                    className="bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low px-6 py-3 rounded-lg font-title-lg text-title-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    Trả
                  </button>
                </div>
              </div>
            </section>

            <section className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-outline-variant flex flex-col overflow-hidden">
              <div className="p-stack-md border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h2 className="font-title-lg text-title-lg text-on-surface">Phiên làm việc hiện tại</h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container py-1 px-2 rounded">
                  {scannedItems.length} mục được quét
                </span>
              </div>
              <div className="grid grid-cols-12 gap-4 px-stack-md py-stack-sm bg-surface-container-low border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <div className="col-span-2">Mã Vạch</div>
                <div className="col-span-5">Tựa sách</div>
                <div className="col-span-2">Thao tác</div>
                <div className="col-span-3 text-right">Trạng thái / Phí phạt</div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-[300px]">
                {scannedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-outline-variant py-10">
                    <span className="material-symbols-outlined text-6xl">inventory_2</span>
                    <p className="font-body-md mt-2">Chưa có hoạt động nào trong phiên này</p>
                  </div>
                ) : (
                  scannedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-12 gap-4 px-stack-md py-3 border-b border-outline-variant items-center hover:bg-surface-container-lowest transition-colors ${
                        item.isError ? 'bg-error-container/10' : ''
                      }`}
                    >
                      <div className="col-span-2 font-body-md text-on-surface">{item.barcode}</div>
                      <div className="col-span-5 flex flex-col">
                        <span className="font-title-lg text-[16px] leading-tight text-on-surface line-clamp-1">{item.title}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium ${
                            item.type === 'return' ? 'bg-surface-container-highest text-on-surface' : 'bg-primary-container text-on-primary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px] mr-1">{item.type === 'return' ? 'keyboard_return' : 'front_hand'}</span>
                          {item.type === 'return' ? 'Trả sách' : 'Mượn sách'}
                        </span>
                      </div>
                      <div className="col-span-3 flex flex-col items-end">
                        <span className={`font-label-md text-label-md flex items-center gap-1 ${item.isError ? 'text-error' : 'text-secondary'}`}>
                          {item.isError && <span className="material-symbols-outlined text-[16px]">warning</span>}
                          {item.status}
                        </span>
                        {item.fine && <span className="font-title-lg text-[16px] text-error font-bold">{item.fine}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-stack-md bg-surface border-t border-outline-variant flex justify-end">
                <button 
                  onClick={() => { setScannedItems([]); setReader(null); setReaderCode(''); setBarcode(''); }}
                  className="bg-primary text-on-primary px-8 py-3 rounded-lg font-title-lg text-title-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Kết thúc phiên
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
