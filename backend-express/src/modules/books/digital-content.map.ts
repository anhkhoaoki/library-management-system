/** @deprecated Dùng digital-content.service.ts — giữ re-export để seed không lỗi */
export {
  resolveContentForResource,
  findBookMediaConfig,
  BOOK_DIGITAL_MEDIA,
} from './digital-content.service';

import { resolveContentForResource } from './digital-content.service';

export function resolveDigitalContentUrl(
  bookTitle: string,
  resourceType: 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'VIDEO',
  fallback: string,
): string {
  const resolved = resolveContentForResource(bookTitle, resourceType);
  return resolved.embedUrl || resolved.streamUrl || fallback;
}

export function resolveDirectStreamUrl(
  bookTitle: string,
  resourceType: 'AUDIOBOOK' | 'VIDEO',
): string | null {
  const resolved = resolveContentForResource(bookTitle, resourceType);
  return resolved.streamUrl || null;
}
