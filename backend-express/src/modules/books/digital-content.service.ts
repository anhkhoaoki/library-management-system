/**
 * Nội dung số theo từng cuốn sách trong hệ thống (khớp digitalPlan seed).
 * PDF/EPUB: HTML tài liệu sinh từ metadata + mô tả sách trong DB.
 * Audiobook / Video: Archive.org (Librivox / MIT OCW) đúng chủ đề sách.
 */

export type BookMediaConfig = {
  ebook?: true;
  audiobook?: { embed: string; direct: string; label: string };
  video?: { embed: string; direct: string; label: string };
};

export const BOOK_DIGITAL_MEDIA: Record<string, BookMediaConfig> = {
  // ── E-book ──
  'Clean Code': { ebook: true },
  'Design Patterns': { ebook: true },
  'Introduction to Algorithms': { ebook: true },
  'JavaScript: The Good Parts': { ebook: true },
  'Giải tích 1': { ebook: true },
  'Giải tích 2': { ebook: true },
  'Nghệ thuật Học': { ebook: true },
  'Lập trình Python cơ bản': { ebook: true },
  'Cơ sở Dữ liệu': { ebook: true },
  'The Pragmatic Programmer': { ebook: true },
  'Đại số Tuyến tính': { ebook: true },
  'Vật lý Đại cương': { ebook: true },
  'Văn hóa Việt Nam': { ebook: true },
  'Lãnh đạo bằng Cảm xúc': { ebook: true },
  'Số Đỏ': { ebook: true },
  'Lịch sử Việt Nam': { ebook: true },
  'Learning Python': { ebook: true },

  // ── Audiobook (Librivox) ──
  'Nhà Giả Kim': {
    audiobook: {
      embed: 'https://archive.org/embed/the_alchemist_0908_librivox',
      direct: 'https://archive.org/download/the_alchemist_0908_librivox/alchemist_01_coelho_128kb.mp3',
      label: 'Audiobook Nhà Giả Kim — Paulo Coelho (Librivox)',
    },
  },
  'Great Expectations': {
    audiobook: {
      embed: 'https://archive.org/embed/great_expectations_1310_librivox',
      direct: 'https://archive.org/download/great_expectations_1310_librivox/greatexpectations_01_dickens_128kb.mp3',
      label: 'Audiobook Great Expectations — Charles Dickens (Librivox)',
    },
  },
  "Man's Search for Meaning": {
    audiobook: {
      embed: 'https://archive.org/embed/MansSearchForMeaning',
      direct: 'https://archive.org/download/MansSearchForMeaning/MansSearchForMeaning.mp3',
      label: "Audiobook Man's Search for Meaning — Viktor Frankl",
    },
  },

  // ── Video (MIT OCW / bài giảng) ──
  'Học máy với Python': {
    video: {
      embed: 'https://archive.org/embed/MIT6_034S17_Lec1',
      direct: 'https://archive.org/download/MIT6_034S17_Lec1/MIT6_034S17_Lec1_300k.mp4',
      label: 'Bài giảng Machine Learning — MIT 6.034',
    },
  },
  'Trí tuệ Nhân tạo': {
    video: {
      embed: 'https://archive.org/embed/MIT6_034S17_Lec1',
      direct: 'https://archive.org/download/MIT6_034S17_Lec1/MIT6_034S17_Lec1_300k.mp4',
      label: 'Bài giảng Trí tuệ nhân tạo — MIT 6.034',
    },
  },
  'Hands-On Machine Learning': {
    video: {
      embed: 'https://archive.org/embed/MITRES_18-065S17_Lec01',
      direct: 'https://archive.org/download/MITRES_18-065S17_Lec01/MITRES_18-065S17_Lec01_300k.mp4',
      label: 'Bài giảng Deep Learning — MIT RES.18-065',
    },
  },
  'Xác suất Thống kê': {
    video: {
      embed: 'https://archive.org/embed/MIT18_650F16_Lec1',
      direct: 'https://archive.org/download/MIT18_650F16_Lec1/MIT18_650F16_Lec1_300k.mp4',
      label: 'Bài giảng Xác suất thống kê — MIT 18.650',
    },
  },
  'Tư duy Phản biện': {
    video: {
      embed: 'https://archive.org/embed/MIT24_00S17_Lec1',
      direct: 'https://archive.org/download/MIT24_00S17_Lec1/MIT24_00S17_Lec1_300k.mp4',
      label: 'Video Tư duy phản biện — MIT 24.00',
    },
  },
  'Mạng Máy Tính': {
    video: {
      embed: 'https://archive.org/embed/MIT6_829S17_Lec1',
      direct: 'https://archive.org/download/MIT6_829S17_Lec1/MIT6_829S17_Lec1_300k.mp4',
      label: 'Bài giảng Mạng máy tính — MIT 6.829',
    },
  },
};

export function findBookMediaConfig(bookTitle: string): BookMediaConfig | null {
  for (const [key, config] of Object.entries(BOOK_DIGITAL_MEDIA)) {
    if (bookTitle.toLowerCase().includes(key.toLowerCase())) {
      return config;
    }
  }
  return null;
}

export function buildAudiobookHtml(book: {
  title: string;
  authorNames: string[];
  description?: string | null;
}): string {
  const authors = book.authorNames?.join(', ') || 'Chưa rõ';
  const intro = `${book.title}. Tác giả: ${authors}.`;
  const body = book.description || 'Nội dung đang được cập nhật.';
  const fullText = `${intro} ${body}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(book.title)} — Audiobook</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .player {
      background: #fff; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,.3); text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 12px; }
    h1 { font-size: 1.25rem; color: #1a1a2e; margin-bottom: 4px; }
    .authors { color: #666; font-size: 0.9rem; margin-bottom: 20px; }
    .controls { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
    button {
      padding: 12px 28px; border: none; border-radius: 999px; font-size: 1rem;
      font-weight: 700; cursor: pointer; transition: transform .15s;
    }
    button:active { transform: scale(.96); }
    #playBtn { background: #1a1a2e; color: #fff; }
    #stopBtn { background: #eee; color: #333; }
    .progress { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
    .progress-bar { height: 100%; background: #1a1a2e; width: 0%; transition: width .3s; }
    .status { font-size: 0.85rem; color: #888; }
    .excerpt {
      margin-top: 20px; padding: 16px; background: #f8f8f8; border-radius: 8px;
      text-align: left; font-size: 0.85rem; line-height: 1.6; color: #444; max-height: 160px; overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="player">
    <div class="icon">🎧</div>
    <h1>${escapeHtml(book.title)}</h1>
    <p class="authors">${escapeHtml(authors)}</p>
    <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
    <div class="controls">
      <button id="playBtn">▶ Phát</button>
      <button id="stopBtn">⏹ Dừng</button>
    </div>
    <p class="status" id="status">Sẵn sàng phát audiobook</p>
    <div class="excerpt">${escapeHtml(body.slice(0, 400))}${body.length > 400 ? '…' : ''}</div>
  </div>
  <script>
    const text = ${JSON.stringify(fullText)};
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    let utterance = null;

    function getVoice() {
      const voices = speechSynthesis.getVoices();
      return voices.find(v => v.lang.startsWith('vi')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    speechSynthesis.onvoiceschanged = () => getVoice();

    playBtn.addEventListener('click', () => {
      speechSynthesis.cancel();
      utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = getVoice();
      utterance.rate = 0.95;
      utterance.onstart = () => { status.textContent = 'Đang phát…'; playBtn.textContent = '⏸ Tạm dừng'; };
      utterance.onend = () => { status.textContent = 'Phát xong'; playBtn.textContent = '▶ Phát lại'; progressBar.style.width = '100%'; };
      utterance.onboundary = (e) => { if (e.charIndex) progressBar.style.width = Math.min(99, (e.charIndex / text.length) * 100) + '%'; };
      speechSynthesis.speak(utterance);
    });

    stopBtn.addEventListener('click', () => {
      speechSynthesis.cancel();
      status.textContent = 'Đã dừng';
      playBtn.textContent = '▶ Phát';
      progressBar.style.width = '0%';
    });
  </script>
</body>
</html>`;
}

export function buildEbookHtml(book: {
  title: string;
  authorNames: string[];
  description?: string | null;
  publisher?: string | null;
  publishYear?: number | null;
  isbn?: string | null;
  coverImageUrl?: string | null;
  resourceType: string;
}): string {
  const authors = book.authorNames?.join(', ') || 'Chưa rõ';
  const desc = book.description || 'Nội dung đang được cập nhật.';
  const meta = [
    book.publisher && `NXB: ${book.publisher}`,
    book.publishYear && `Năm XB: ${book.publishYear}`,
    book.isbn && `ISBN: ${book.isbn}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const paragraphs = desc
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(book.title)} — E-book</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #525659; padding: 24px; }
    .page {
      max-width: 820px; margin: 0 auto; background: #fff;
      box-shadow: 0 4px 24px rgba(0,0,0,.35); min-height: 90vh; padding: 48px 56px;
    }
    .cover { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #1a1a2e; }
    .cover img { max-height: 200px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 16px; }
    h1 { font-size: 1.75rem; color: #1a1a2e; line-height: 1.3; margin-bottom: 8px; }
    .authors { font-size: 1rem; color: #555; font-style: italic; margin-bottom: 8px; }
    .meta { font-size: 0.8rem; color: #888; }
    .badge {
      display: inline-block; margin-top: 12px; padding: 4px 12px;
      background: #1a1a2e; color: #fff; border-radius: 4px; font-size: 0.75rem;
      font-family: sans-serif; letter-spacing: .05em;
    }
    .content { margin-top: 32px; }
    .content h2 { font-size: 1.1rem; color: #1a1a2e; margin-bottom: 16px; font-family: sans-serif; }
    .content p { font-size: 1rem; line-height: 1.85; color: #222; margin-bottom: 14px; text-align: justify; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 0.75rem; color: #aaa; text-align: center; font-family: sans-serif; }
  </style>
</head>
<body>
  <div class="page">
    <div class="cover">
      ${book.coverImageUrl ? `<img src="${escapeHtml(book.coverImageUrl)}" alt="Bìa sách" />` : ''}
      <h1>${escapeHtml(book.title)}</h1>
      <p class="authors">${escapeHtml(authors)}</p>
      ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ''}
      <span class="badge">${book.resourceType === 'EPUB' ? 'EPUB' : 'PDF'} — Thư viện số</span>
    </div>
    <div class="content">
      <h2>Nội dung tài liệu</h2>
      ${bodyHtml}
    </div>
    <div class="footer">Thư viện Đại học — Tài nguyên số · ${escapeHtml(book.title)}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LIBRIVOX_AUDIOBOOK_KEYS = ['Nhà Giả Kim', 'Great Expectations', "Man's Search for Meaning"];

export function resolveContentForResource(
  bookTitle: string,
  resourceType: 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'VIDEO',
): {
  mode: 'ebook-html' | 'audiobook-html' | 'audiobook-embed' | 'video-embed';
  embedUrl?: string;
  streamUrl?: string;
  label?: string;
} {
  const config = findBookMediaConfig(bookTitle);

  if (resourceType === 'PDF' || resourceType === 'EPUB') {
    return { mode: 'ebook-html' };
  }

  if (resourceType === 'AUDIOBOOK') {
    const useLibrivox = LIBRIVOX_AUDIOBOOK_KEYS.some((key) =>
      bookTitle.toLowerCase().includes(key.toLowerCase()),
    );
    const audio = config?.audiobook;
    if (useLibrivox && audio) {
      return {
        mode: 'audiobook-embed',
        embedUrl: audio.embed,
        streamUrl: audio.direct,
        label: audio.label,
      };
    }
    return {
      mode: 'audiobook-html',
      label: `Audiobook — ${bookTitle}`,
    };
  }

  if (resourceType === 'VIDEO') {
    const video = config?.video;
    if (video) {
      return {
        mode: 'video-embed',
        embedUrl: video.embed,
        streamUrl: video.direct,
        label: video.label,
      };
    }
    return {
      mode: 'video-embed',
      embedUrl: 'https://archive.org/embed/MIT18_01F09_Lec01',
      streamUrl: 'https://archive.org/download/MIT18_01F09_Lec01/MIT18_01F09_Lec01_300k.mp4',
      label: `Video bài giảng — ${bookTitle}`,
    };
  }

  return { mode: 'ebook-html' };
}
