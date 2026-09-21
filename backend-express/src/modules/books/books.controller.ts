import { Request, Response, NextFunction } from 'express';
import * as booksService from './books.service';
import axios from 'axios';

// ─── Helper: Trigger AI embedding cache refresh (fire-and-forget) ─
// Gọi sau khi thêm/sửa/xóa sách để AI Semantic Search luôn index sách mới nhất.
const triggerEmbeddingRefresh = () => {
  axios
    .post('http://localhost:8000/search/refresh-cache', {}, { timeout: 5000 })
    .catch(() => { /* silent fail — không để lỗi cache chặn response chính */ });
};

// UC-EXP-01
export const searchBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, field, categoryId, page, limit } = req.query;
    const result = await booksService.searchBooks({
      q: q as string,
      field: field as 'title' | 'author' | 'isbn' | 'all',
      categoryId: categoryId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 12,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

// UC-CAT-01 / UC-EXP-01
export const getBookById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await booksService.getBookById(req.params.id);
    res.status(200).json({ success: true, data: book });
  } catch (err) { next(err); }
};

// UC-CAT-01
export const createBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await booksService.createBook({
      ...req.body,
      createdById: req.user!.userId,
    });
    res.status(201).json({ success: true, data: book });
    triggerEmbeddingRefresh(); // cập nhật embedding index sau khi thêm sách mới
  } catch (err) { next(err); }
};

export const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await booksService.updateBook(req.params.id, req.body);
    res.status(200).json({ success: true, data: book });
    triggerEmbeddingRefresh(); // cập nhật embedding index sau khi sửa sách
  } catch (err) { next(err); }
};

export const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.deleteBook(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// UC-EXP-03
export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, content } = req.body;
    if (!rating) { res.status(400).json({ success: false, message: 'rating là bắt buộc' }); return; }
    const review = await booksService.submitReview(req.user!.userId, req.params.id, { rating, content });
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
};

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await booksService.getBookById(req.params.id);
    res.status(200).json({ success: true, data: (book as { reviews: unknown[] }).reviews });
  } catch (err) { next(err); }
};

export const listDigitalResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resourceType, q, page, limit } = req.query;
    const result = await booksService.listDigitalResources({
      resourceType: resourceType as string,
      q: q as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getActiveDigitalSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await booksService.getUserActiveDigitalSession(req.user!.userId);
    res.status(200).json({ success: true, data: session });
  } catch (err) { next(err); }
};

// UC-EXP-02
export const accessDigitalResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.accessDigitalResource(req.params.resourceId, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const endDigitalSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.endDigitalSession(req.params.logId, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const renderDigitalView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await booksService.renderDigitalView(req.params.resourceId, req.user!.userId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) { next(err); }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cats = await booksService.getCategories();
    res.status(200).json({ success: true, data: cats });
  } catch (err) { next(err); }
};

export const getInfoByIsbn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await booksService.getBookInfoByIsbn(req.params.isbn);
    res.status(200).json({ success: true, data: info });
  } catch (err) { next(err); }
};

export const importBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Vui lòng tải lên file Excel (.xlsx)' });
      return;
    }
    const result = await booksService.importBooksFromExcel(req.file.buffer, req.user!.userId);
    res.status(200).json({ success: true, data: result });
    triggerEmbeddingRefresh(); // cập nhật embedding index sau khi import hàng loạt
  } catch (err) { next(err); }
};

export const addPhysicalCopy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const copy = await booksService.addPhysicalCopy(req.params.bookId, req.body);
    res.status(201).json({ success: true, data: copy });
  } catch (err) { next(err); }
};

export const updatePhysicalCopy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const copy = await booksService.updatePhysicalCopy(req.params.id, req.body);
    res.status(200).json({ success: true, data: copy });
  } catch (err) { next(err); }
};

export const deletePhysicalCopy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.deletePhysicalCopy(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
