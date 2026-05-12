import { Request, Response, NextFunction } from 'express';
import * as booksService from './books.service';

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
  } catch (err) { next(err); }
};

export const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await booksService.updateBook(req.params.id, req.body);
    res.status(200).json({ success: true, data: book });
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

// UC-EXP-02
export const accessDigitalResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.accessDigitalResource(req.params.resourceId, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const endDigitalSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await booksService.endDigitalSession(req.params.logId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cats = await booksService.getCategories();
    res.status(200).json({ success: true, data: cats });
  } catch (err) { next(err); }
};
