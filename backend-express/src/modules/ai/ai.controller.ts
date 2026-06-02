import { Request, Response, NextFunction } from 'express';
import * as aiService from './ai.service';

// UC-CAT-03
export const getBookInfoByIsbn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isbn } = req.params;
    const result = await aiService.getBookInfoByIsbn(isbn);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-CAT-04
export const generateBookSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, authorNames, category, existingDescription } = req.body;
    if (!title || !authorNames?.length) {
      res.status(400).json({ success: false, message: 'title và authorNames là bắt buộc' });
      return;
    }
    const result = await aiService.generateBookSummary({ title, authorNames, category, existingDescription });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// SỬA LẠI TRONG FILE: ai.controller.ts
export const naturalLanguageSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Cho phép query có thể là chuỗi rỗng hoặc undefined (không bắt buộc)
    const { query } = req.body; 
    
    // XÓA HOẶC COMMENT ĐOẠN IF (!QUERY) NÀY ĐI
    // if (!query) {
    //   res.status(400).json({ success: false, message: 'query là bắt buộc' });
    //   return;
    // }

    const userId = req.user?.userId;
    
    // Truyền query xuống service (nếu trống thì truyền chuỗi rỗng "")
    const result = await aiService.naturalLanguageSearch(query || "", userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-AI-02
export const chatWithBot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const userId = req.user!.userId;
    if (!message) {
      res.status(400).json({ success: false, message: 'message là bắt buộc' });
      return;
    }
    const result = await aiService.chatWithBot(userId, message);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-AI-03
export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await aiService.getRecommendations(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
