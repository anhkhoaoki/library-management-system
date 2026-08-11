import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const TYPE_LABELS = {
  PDF: 'E-book (PDF)',
  EPUB: 'E-book (EPUB)',
  AUDIOBOOK: 'Audiobook',
  VIDEO: 'Video',
};

const TYPE_ICONS = {
  PDF: 'picture_as_pdf',
  EPUB: 'book',
  AUDIOBOOK: 'headphones',
  VIDEO: 'play_circle',
};

const TAB_TO_TYPE = {
  ALL: null,
  EBOOK: ['PDF', 'EPUB'],
  AUDIOBOOK: ['AUDIOBOOK'],
  VIDEO: ['VIDEO'],
};

function formatDuration(seconds) {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isEbookType(type) {
  return type === 'PDF' || type === 'EPUB';
}

function DigitalContentViewer({ session }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  const needsHtmlFetch =
    isEbookType(session.resourceType) || session.contentMode === 'audiobook-html';

  useEffect(() => {
    if (!needsHtmlFetch) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setHtmlContent('');

    api
      .get(session.viewUrl, { responseType: 'text' })
      .then((res) => {
        if (!cancelled) setHtmlContent(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || 'Không tải được nội dung');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [session.resourceId, session.resourceType, session.contentMode, session.viewUrl, needsHtmlFetch]);

  const openInNewTab = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  if (isEbookType(session.resourceType)) {
    return (
      <div className="flex flex-col h-full min-h-[560px]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-on-surface">
            {TYPE_LABELS[session.resourceType]} — {session.bookTitle}
          </p>
          <button
            type="button"
            onClick={openInNewTab}
            disabled={!htmlContent}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Mở tab mới
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center bg-surface-container-low rounded-xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="flex-1 flex items-center justify-center bg-error/5 rounded-xl p-6 text-error text-sm">
            {loadError}
          </div>
        )}

        {!loading && !loadError && htmlContent && (
          <iframe
            title={session.bookTitle}
            srcDoc={htmlContent}
            className="flex-1 w-full min-h-[560px] rounded-xl border border-outline-variant bg-white shadow-inner"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
    );
  }

  if (session.resourceType === 'AUDIOBOOK' && session.contentMode === 'audiobook-html') {
    return (
      <div className="flex flex-col h-full min-h-[560px]">
        <p className="text-sm font-medium text-on-surface mb-3">
          {session.contentLabel || `Audiobook — ${session.bookTitle}`}
        </p>

        {loading && (
          <div className="flex-1 flex items-center justify-center bg-surface-container-low rounded-xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="flex-1 flex items-center justify-center bg-error/5 rounded-xl p-6 text-error text-sm">
            {loadError}
          </div>
        )}

        {!loading && !loadError && htmlContent && (
          <iframe
            title={session.bookTitle}
            srcDoc={htmlContent}
            className="flex-1 w-full min-h-[560px] rounded-xl border border-outline-variant bg-white shadow-inner"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
    );
  }

  if (session.resourceType === 'AUDIOBOOK') {
    return (
      <div className="flex flex-col h-full min-h-[560px]">
        <p className="text-sm font-medium text-on-surface mb-3">
          {session.contentLabel || `Audiobook — ${session.bookTitle}`}
        </p>

        {!useEmbedFallback && session.streamUrl && (
          <div className="bg-surface-container-low rounded-xl p-6 mb-4">
            <audio
              controls
              autoPlay
              className="w-full"
              src={session.streamUrl}
              onError={() => setUseEmbedFallback(true)}
            >
              Trình duyệt không hỗ trợ phát audio.
            </audio>
          </div>
        )}

        {session.embedUrl && (
          <iframe
            title={session.bookTitle}
            src={session.embedUrl}
            className="flex-1 w-full min-h-[480px] rounded-xl border border-outline-variant bg-white"
            allow="autoplay"
          />
        )}
      </div>
    );
  }

  if (session.resourceType === 'VIDEO') {
    return (
      <div className="flex flex-col h-full min-h-[560px]">
        <p className="text-sm font-medium text-on-surface mb-3">
          {session.contentLabel || `Video — ${session.bookTitle}`}
        </p>

        {!useEmbedFallback && session.streamUrl && (
          <video
            controls
            autoPlay
            className="w-full max-h-[320px] rounded-xl bg-black mb-4"
            src={session.streamUrl}
            onError={() => setUseEmbedFallback(true)}
          >
            Trình duyệt không hỗ trợ phát video.
          </video>
        )}

        {session.embedUrl && (
          <iframe
            title={session.bookTitle}
            src={session.embedUrl}
            className="flex-1 w-full min-h-[480px] rounded-xl border border-outline-variant bg-black"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        )}
      </div>
    );
  }

  return null;
}

export default function DigitalResourcesPage() {
  const { user } = useContext(AuthContext);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [contentOpened, setContentOpened] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [lastCompletedSession, setLastCompletedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [accessingId, setAccessingId] = useState(null);
  const timerRef = useRef(null);

  const fetchResources = useCallback(async () => {
    try {
      const res = await api.get('/books/digital-resources?limit=100');
      setResources(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải tài nguyên số:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    if (!sessionStartedAt) {
      setSessionElapsed(0);
      return undefined;
    }
    const tick = () => setSessionElapsed(Math.floor((Date.now() - sessionStartedAt) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionStartedAt]);

  const handleStartSession = async (bookId, resourceId) => {
    if (lastCompletedSession) {
      alert('Vui lòng bấm "Xóa thông báo phiên" trước khi bắt đầu phiên truy cập mới.');
      return;
    }
    setAccessingId(resourceId);
    setContentOpened(false);
    try {
      const res = await api.get(`/books/${bookId}/digital/${resourceId}`);
      if (res.data.success) {
        setActiveSession(res.data.data);
        setSessionStartedAt(Date.now());
        setSessionElapsed(0);
        fetchResources();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi bắt đầu phiên truy cập');
    } finally {
      setAccessingId(null);
    }
  };

  const handleDismissCompletedSession = () => {
    setLastCompletedSession(null);
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      const res = await api.patch(`/books/digital/sessions/${activeSession.accessLogId}/end`);
      const result = res.data.data || {};
      setLastCompletedSession({
        bookTitle: result.bookTitle || activeSession.bookTitle,
        resourceType: result.resourceType || activeSession.resourceType,
        durationSeconds: result.durationSeconds ?? sessionElapsed,
      });
      setActiveSession(null);
      setContentOpened(false);
      setSessionStartedAt(null);
      setSessionElapsed(0);
      fetchResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi kết thúc phiên');
    }
  };

  const filteredResources = resources.filter((item) => {
    const types = TAB_TO_TYPE[activeTab];
    if (types && !types.includes(item.resourceType)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const title = item.book?.title?.toLowerCase() || '';
      const authors = (item.book?.authorNames || []).join(' ').toLowerCase();
      if (!title.includes(q) && !authors.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: resources.length,
    available: resources.filter((r) => r.isAvailable).length,
    ebook: resources.filter((r) => ['PDF', 'EPUB'].includes(r.resourceType)).length,
    audio: resources.filter((r) => r.resourceType === 'AUDIOBOOK').length,
    video: resources.filter((r) => r.resourceType === 'VIDEO').length,
  };

  return (
    <MainLayout role="student" userName={user?.fullName} userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        <div>
          <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-unit">Tài nguyên số</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Khám phá và truy cập trực tuyến kho sách điện tử & sách nói ({stats.total} tài liệu).
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {[
            { label: 'Tổng tài liệu', value: stats.total, icon: 'library_books' },
            { label: 'Sẵn sàng truy cập', value: stats.available, icon: 'check_circle' },
            { label: 'E-book', value: stats.ebook, icon: 'menu_book' },
            { label: 'Audiobook', value: stats.audio, icon: 'headphones' },
            { label: 'Video', value: stats.video, icon: 'smart_display' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-lowest rounded-xl p-4 border border-surface-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">{s.icon}</span>
              <div>
                <p className="font-display-md text-on-surface">{s.value}</p>
                <p className="text-xs text-on-surface-variant">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Vùng phiên truy cập — trái: thông tin | phải: nội dung lớn */}
        {activeSession ? (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-primary/30">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cột trái: bìa + meta + nút */}
              <div className="lg:col-span-4 flex flex-col">
                <img
                  src={activeSession.coverImageUrl || 'https://via.placeholder.com/200x280?text=No+Cover'}
                  alt={activeSession.bookTitle}
                  className="w-full max-w-[200px] h-56 object-cover rounded-lg shadow-sm border border-outline-variant mb-4"
                />

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-semibold uppercase">
                    Phiên đang hoạt động
                  </span>
                  <span className="bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    {formatDuration(sessionElapsed)}
                  </span>
                </div>

                <h3 className="font-headline-md text-on-surface mb-1">{activeSession.bookTitle}</h3>
                <p className="text-sm text-on-surface-variant mb-2">
                  {(activeSession.authorNames || []).join(', ') || 'Chưa rõ tác giả'}
                </p>
                <p className="text-xs text-outline mb-1">{TYPE_LABELS[activeSession.resourceType]}</p>
                <p className="text-xs text-outline mb-4">
                  Lượt truy cập: {activeSession.accessCount}/{activeSession.maxConcurrentUsers}
                </p>

                <div className="flex flex-wrap gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => setContentOpened(true)}
                    disabled={contentOpened}
                    className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isEbookType(activeSession.resourceType) ? 'menu_book' : 'play_arrow'}
                    </span>
                    {contentOpened ? 'Đã mở tài liệu' : 'Mở tài liệu số'}
                  </button>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="px-5 py-2.5 rounded-lg border-2 border-error/30 text-error font-bold hover:bg-error/5 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                    Kết thúc phiên
                  </button>
                </div>
              </div>

              {/* Cột phải: viewer lớn */}
              <div className="lg:col-span-8 bg-surface-container-low rounded-xl p-4 min-h-[600px] flex flex-col">
                {contentOpened ? (
                  <DigitalContentViewer session={activeSession} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <span className="material-symbols-outlined text-5xl text-outline mb-3">
                      {TYPE_ICONS[activeSession.resourceType] || 'description'}
                    </span>
                    <p className="text-on-surface-variant text-sm max-w-sm">
                      Nhấn <strong>Mở tài liệu số</strong> để xem nội dung{' '}
                      {TYPE_LABELS[activeSession.resourceType]?.toLowerCase()} của cuốn sách này tại đây.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : lastCompletedSession ? (
          <div className="bg-success/5 rounded-xl p-6 border border-success/20">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-success text-2xl">check_circle</span>
                <div>
                  <h3 className="font-title-md text-on-surface">Phiên truy cập đã kết thúc</h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Tài liệu: <strong>{lastCompletedSession.bookTitle}</strong>
                    {' '}({TYPE_LABELS[lastCompletedSession.resourceType] || lastCompletedSession.resourceType})
                  </p>
                  <p className="text-sm font-bold text-success mt-2">
                    Thời gian phiên: {formatDuration(lastCompletedSession.durationSeconds)}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Bấm &quot;Xóa thông báo phiên&quot; để giải phóng slot trước khi mở phiên mới.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissCompletedSession}
                className="px-5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-bold hover:bg-surface-container-low transition-colors text-sm flex items-center gap-2 shrink-0 self-start"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Xóa thông báo phiên
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-10 border border-dashed border-outline-variant text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-2 block">menu_book</span>
            <p className="text-on-surface-variant text-sm">
              Chọn tài liệu bên dưới và bấm bắt đầu phiên truy cập.
            </p>
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'EBOOK', label: 'E-book' },
              { key: 'AUDIOBOOK', label: 'Audiobook' },
              { key: 'VIDEO', label: 'Video' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full font-label-md whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm tài liệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-gutter">
          {loading ? (
            <div className="col-span-full py-10 text-center text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary block mb-2">progress_activity</span>
              Đang tải tài nguyên số...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="col-span-full py-10 text-center text-on-surface-variant">
              Không tìm thấy tài liệu số phù hợp.
            </div>
          ) : (
            filteredResources.map((item) => {
              const isFull = !item.isAvailable;
              const typeLabel = TYPE_LABELS[item.resourceType] || item.resourceType;
              const typeIcon = TYPE_ICONS[item.resourceType] || 'description';
              const isActive = activeSession?.resourceId === item.id;
              const accessCount = item.accessCount ?? 0;

              return (
                <div
                  key={item.id}
                  className={`bg-surface-container-lowest rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow group flex flex-col ${
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-surface-variant'
                  }`}
                >
                  <div className="h-48 md:h-56 bg-surface-container-low relative overflow-hidden">
                    <img
                      alt={item.book?.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={item.book?.coverImageUrl || 'https://via.placeholder.com/400x600?text=No+Cover'}
                    />
                    <div className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-1 rounded shadow-sm text-label-sm font-semibold flex items-center gap-1 ${
                      isFull ? 'bg-error-container/90 text-on-error-container' : 'bg-white/90 text-secondary'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-error' : 'bg-secondary'}`} />
                      {isFull ? 'Đã đầy' : 'Sẵn sàng'}
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded backdrop-blur text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">{typeIcon}</span>
                      {typeLabel}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h4 className="font-title-lg text-[16px] leading-tight text-on-surface mb-1 line-clamp-2">{item.book?.title}</h4>
                    <p className="text-[14px] text-on-surface-variant mb-1 line-clamp-1">
                      {(item.book?.authorNames || []).join(', ') || 'Chưa rõ'}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className={`text-label-sm ${isFull ? 'text-error' : 'text-outline'}`} title="Số lần truy cập / Giới hạn">
                        Truy cập: {accessCount}/{item.maxConcurrentUsers}
                      </span>
                      {!isFull ? (
                        <button
                          type="button"
                          onClick={() => handleStartSession(item.bookId, item.id)}
                          disabled={
                            accessingId === item.id
                            || activeSession
                            || lastCompletedSession
                          }
                          className="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary hover:text-white transition-colors disabled:opacity-40"
                          title="Bắt đầu phiên truy cập"
                        >
                          {accessingId === item.id ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">
                              {item.resourceType === 'AUDIOBOOK' || item.resourceType === 'VIDEO' ? 'play_arrow' : 'menu_book'}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-on-surface-variant italic">Thử lại sau</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
