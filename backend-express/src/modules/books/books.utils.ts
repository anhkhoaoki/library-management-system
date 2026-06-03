import axios from 'axios';

export interface ExternalBookInfo {
  title: string;
  authorNames: string[];
  publisher?: string;
  publishYear?: number;
  language?: string;
  description?: string;
  coverImageUrl?: string;
  isbn?: string;
}

export const fetchBookInfoByIsbn = async (isbn: string): Promise<ExternalBookInfo | null> => {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  console.log(`--- [Bắt đầu tra cứu ISBN: ${cleanIsbn}] ---`);

  const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY?.replace(/['"]/g, '').trim();

  // 1. Try Google Books API 
  try {
    const params: any = { q: `isbn:${cleanIsbn}` };
    if (GOOGLE_KEY) params.key = GOOGLE_KEY;

    console.log(`[Google Books Request]: https://www.googleapis.com/books/v1/volumes`, { params });
    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', { 
      params,
      timeout: 5000 
    });
    const data = response.data;

    if (data.totalItems > 0) {
      const info = data.items[0].volumeInfo;
      console.log(`✅ [Google Books] Tìm thấy: "${info.title}"`);
      return {
        title: info.title,
        authorNames: info.authors || [],
        publisher: info.publisher,
        publishYear: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : undefined,
        language: info.language,
        description: info.description,
        coverImageUrl: info.imageLinks?.thumbnail
          ? info.imageLinks.thumbnail.replace(/^http:/, 'https:').replace(/[&?]edge=curl/, '')
          : `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
        isbn: isbn,
      };
    }
    console.log(`ℹ️ [Google Books] Không có dữ liệu.`);
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    console.warn(`❌ [Google Books] Lỗi ${status || ''}: ${errorData?.message || error.message}`);
    if (errorData?.errors) {
      console.warn('Chi tiết lỗi:', JSON.stringify(errorData.errors, null, 2));
    }
  }

  // 2. Try Open Library API
  try {
    const olResponse = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`, { timeout: 5000 });
    const olData = olResponse.data[`ISBN:${cleanIsbn}`];
    
    if (olData) {
      console.log(`✅ [Open Library] Tìm thấy: "${olData.title}"`);
      return {
        title: olData.title,
        authorNames: olData.authors?.map((a: any) => a.name) || [],
        publisher: olData.publishers?.map((p: any) => p.name).join(', '),
        publishYear: olData.publish_date ? parseInt(olData.publish_date.match(/\d{4}/)?.[0]) : undefined,
        language: undefined,
        description: typeof olData.notes === 'string' ? olData.notes : undefined,
        coverImageUrl: olData.cover?.medium || olData.cover?.large,
        isbn: isbn,
      };
    }
    console.log(`ℹ️ [Open Library] Không có dữ liệu.`);
  } catch (error) {
    console.warn(`❌ [Open Library] Lỗi: ${(error as any).message}`);
  }

  // 3. Try IT Bookstore API
  try {
    const itResponse = await axios.get(`https://api.itbook.store/1.0/books/${cleanIsbn}`, { timeout: 5000 });
    const itData = itResponse.data;

    if (itData && itData.error === "0") {
      console.log(`✅ [IT Bookstore] Tìm thấy: "${itData.title}"`);
      return {
        title: itData.title,
        authorNames: itData.authors ? itData.authors.split(',').map((a: string) => a.trim()) : [],
        publisher: itData.publisher,
        publishYear: itData.year ? parseInt(itData.year) : undefined,
        language: 'en',
        description: itData.desc,
        coverImageUrl: itData.image,
        isbn: isbn,
      };
    }
    console.log(`ℹ️ [IT Bookstore] Không có dữ liệu.`);
  } catch (error) {
    console.warn(`❌ [IT Bookstore] Lỗi: ${(error as any).message}`);
  }

  // 4. Try Library of Congress
  try {
    const locResponse = await axios.get(`https://www.loc.gov/books/?q=${cleanIsbn}&fo=json`, { timeout: 5000 });
    if (locResponse.data.results && locResponse.data.results.length > 0) {
      const item = locResponse.data.results[0];
      console.log(`✅ [Library of Congress] Tìm thấy: "${item.title}"`);
      return {
        title: item.title,
        authorNames: item.contributor || [],
        publisher: undefined,
        publishYear: item.date ? parseInt(item.date) : undefined,
        language: undefined,
        description: item.description?.[0] || undefined,
        coverImageUrl: item.image_url?.[0],
        isbn: isbn,
      };
    }
    console.log(`ℹ️ [Library of Congress] Không có dữ liệu.`);
  } catch (error) {
    console.warn(`❌ [Library of Congress] Lỗi: ${(error as any).message}`);
  }

  console.log(`⚠️ [Kết thúc] Không tìm thấy thông tin cho ISBN ${isbn} từ bất kỳ nguồn nào.`);
  return null;
};
