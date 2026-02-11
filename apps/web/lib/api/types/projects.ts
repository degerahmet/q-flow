/**
 * Local project API types for the frontend.
 * Kept in sync with @qflow/api-types but without class-validator decorators
 * so they can run in the browser (no Reflect.getMetadata).
 */

export const QuestionItemStatus = {
  PENDING: 'PENDING',
  DRAFTED: 'DRAFTED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  EXPORTED: 'EXPORTED',
} as const;

export type QuestionItemStatusValue =
  (typeof QuestionItemStatus)[keyof typeof QuestionItemStatus];

export interface ProjectStatusCounts {
  PENDING?: number;
  DRAFTED?: number;
  NEEDS_REVIEW?: number;
  APPROVED?: number;
  REJECTED?: number;
  FAILED?: number;
  EXPORTED?: number;
}

export interface GetProjectDetailsResponseDto {
  id: string;
  status: string;
  counts: ProjectStatusCounts;
  totalQuestions: number;
}

export interface QuestionItemDto {
  id: string;
  rowIndex: number;
  questionText: string;
  aiAnswer: string | null;
  humanAnswer: string | null;
  confidenceScore: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProjectQuestionsResponseDto {
  questions: QuestionItemDto[];
}

export interface ReviewQueueCitationDto {
  embeddingId: string;
  score: number;
  snippet: string;
}

export interface ReviewQueueItemDto {
  id: string;
  rowIndex: number;
  questionText: string;
  aiAnswer: string | null;
  confidenceScore: number | null;
  citations: ReviewQueueCitationDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GetReviewQueueResponseDto {
  questions: ReviewQueueItemDto[];
}

export interface ReviewActionResponseDto {
  questionId: string;
  status: string;
  action: string;
  message: string;
}
