import { Route } from 'react-router-dom';
import { ExamInfoFormPage, TermReviewPage, WriteReviewPage } from '@/pages/reviews/ReviewPages';

/** 수업 리뷰 · 시험 정보 (course page › Reviews · Exam info, 학기 말 안내) — server/coursereviews.ts */
export const reviewSubRoutes = (
  <>
    <Route path="/reviews/write" element={<WriteReviewPage />} />
    <Route path="/reviews/exam" element={<ExamInfoFormPage />} />
    <Route path="/reviews/term" element={<TermReviewPage />} />
  </>
);
