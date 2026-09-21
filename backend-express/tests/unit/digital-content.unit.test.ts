import {
  findBookMediaConfig,
  resolveContentForResource,
  buildEbookHtml,
  buildAudiobookHtml,
} from '../../src/modules/books/digital-content.service';

describe('digital-content.service — hàm thuần (không I/O)', () => {
  describe('findBookMediaConfig', () => {
    it('khớp tiêu đề chứa key cấu hình (không phân biệt hoa thường)', () => {
      const config = findBookMediaConfig('Sách Clean Code (bản dịch)');
      expect(config).toEqual({ ebook: true });
    });

    it('trả null khi không có cấu hình', () => {
      expect(findBookMediaConfig('Cuốn sách không tồn tại XYZ')).toBeNull();
    });
  });

  describe('resolveContentForResource', () => {
    it('PDF/EPUB luôn dùng chế độ ebook-html', () => {
      expect(resolveContentForResource('Clean Code', 'PDF')).toEqual({ mode: 'ebook-html' });
      expect(resolveContentForResource('Unknown Book', 'EPUB')).toEqual({ mode: 'ebook-html' });
    });

    it('AUDIOBOOK Nhà Giả Kim dùng embed Librivox', () => {
      const result = resolveContentForResource('Nhà Giả Kim', 'AUDIOBOOK');
      expect(result.mode).toBe('audiobook-embed');
      expect(result.embedUrl).toContain('archive.org');
      expect(result.streamUrl).toContain('.mp3');
    });

    it('AUDIOBOOK không có Librivox thì fallback HTML TTS', () => {
      const result = resolveContentForResource('Sách lạ 123', 'AUDIOBOOK');
      expect(result).toEqual({
        mode: 'audiobook-html',
        label: 'Audiobook — Sách lạ 123',
      });
    });

    it('VIDEO có cấu hình MIT thì trả embed + stream', () => {
      const result = resolveContentForResource('Trí tuệ Nhân tạo', 'VIDEO');
      expect(result.mode).toBe('video-embed');
      expect(result.embedUrl).toBeTruthy();
      expect(result.label).toMatch(/MIT/);
    });

    it('VIDEO không cấu hình thì dùng bài giảng mặc định', () => {
      const result = resolveContentForResource('Video không map', 'VIDEO');
      expect(result.mode).toBe('video-embed');
      expect(result.embedUrl).toContain('MIT18_01F09');
    });
  });

  describe('buildEbookHtml / buildAudiobookHtml', () => {
    it('escape HTML trong tiêu đề để chống XSS', () => {
      const html = buildEbookHtml({
        title: '<script>alert(1)</script>',
        authorNames: ['A & B'],
        description: 'Hello',
        resourceType: 'PDF',
      });
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('A &amp; B');
      expect(html).toContain('PDF — Thư viện số');
    });

    it('buildAudiobookHtml chứa tiêu đề và đoạn mô tả', () => {
      const html = buildAudiobookHtml({
        title: 'Nhà Giả Kim',
        authorNames: ['Paulo Coelho'],
        description: 'Hành trình của Santiago.',
      });
      expect(html).toContain('Nhà Giả Kim');
      expect(html).toContain('Hành trình của Santiago.');
      expect(html).toContain('speechSynthesis');
    });
  });
});
