import axios from 'axios';
import { fetchBookInfoByIsbn } from '../../src/modules/books/books.utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('books.utils.fetchBookInfoByIsbn — kiểm thử đơn vị tra cứu ISBN', () => {
  const isbn = '978-0-13-235088-4';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_BOOKS_API_KEY;
    
    // Mock console để terminal gọn gàng, không bị rác bởi các log báo lỗi API dự kiến
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('chuẩn hóa ISBN (bỏ dấu gạch) và lấy từ Google Books', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: 'Clean Code',
              authors: ['Robert C. Martin'],
              publisher: 'Prentice Hall',
              publishedDate: '2008-08-01',
              language: 'en',
              description: 'A handbook',
              imageLinks: { thumbnail: 'http://example.com/cover.jpg?edge=curl' },
            },
          },
        ],
      },
    });

    const info = await fetchBookInfoByIsbn(isbn);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes',
      expect.objectContaining({
        params: { q: 'isbn:9780132350884' },
      }),
    );
    expect(info?.title).toBe('Clean Code');
    expect(info?.authorNames).toEqual(['Robert C. Martin']);
    expect(info?.publishYear).toBe(2008);
    expect(info?.coverImageUrl).toMatch(/^https:/);
    expect(info?.coverImageUrl).not.toContain('edge=curl');
  });

  it('fallback Open Library khi Google không có dữ liệu', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { totalItems: 0 } }) // Google trả về 0 kết quả
      .mockResolvedValueOnce({ // Open Library trả về dữ liệu
        data: {
          'ISBN:9780132350884': {
            title: 'Clean Code OL',
            authors: [{ name: 'Uncle Bob' }],
            publishers: [{ name: 'PH' }],
            publish_date: 'August 2008',
            notes: 'note',
            cover: { medium: 'https://covers.openlibrary.org/x.jpg' },
          },
        },
      });

    const info = await fetchBookInfoByIsbn(isbn);
    expect(info?.title).toBe('Clean Code OL');
    expect(info?.authorNames).toEqual(['Uncle Bob']);
    expect(info?.publishYear).toBe(2008);
  });

  it('fallback IT Bookstore khi Google và Open Library thất bại', async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error('Google API timeout'))   // Google sập
      .mockRejectedValueOnce(new Error('Open Library 500'))     // Open Library sập
      .mockResolvedValueOnce({                                  // IT Bookstore thành công
        data: {
          error: "0",
          title: 'Clean Code IT Bookstore',
          authors: 'Robert Martin, Uncle Bob',
          publisher: 'IT Pub',
          year: '2008',
          image: 'https://itbook.store/img/books/9780132350884.png',
          desc: 'Programming book'
        }
      });

    const info = await fetchBookInfoByIsbn(isbn);
    expect(info?.title).toBe('Clean Code IT Bookstore');
    expect(info?.authorNames).toEqual(expect.arrayContaining(['Robert Martin', 'Uncle Bob']));
    expect(info?.publishYear).toBe(2008);
    expect(info?.coverImageUrl).toContain('itbook.store');
  });

  it('fallback Library of Congress khi cả 3 nguồn trên đều thất bại', async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error('Google Error'))         // Google sập
      .mockRejectedValueOnce(new Error('Open Library Error'))   // Open Library sập
      .mockRejectedValueOnce(new Error('IT Bookstore Error'))   // IT Bookstore sập
      .mockResolvedValueOnce({                                  // Library of Congress thành công
        data: {
          results: [
            {
              title: 'Clean Code LoC',
              contributor: ['Martin, Robert C.'],
              date: '2008'
            }
          ]
        }
      });

    const info = await fetchBookInfoByIsbn(isbn);
    expect(info?.title).toBe('Clean Code LoC');
    expect(info).not.toBeNull();
  });

  it('trả null khi mọi nguồn (bao gồm cả LoC) đều thất bại', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error on all APIs'));
    const info = await fetchBookInfoByIsbn('0000000000000');
    expect(info).toBeNull();
  });
});