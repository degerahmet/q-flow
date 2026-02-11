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

export const ProjectStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ProjectStatusValue =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export interface ProjectStatusCounts {
  PENDING?: number;
  DRAFTED?: number;
  NEEDS_REVIEW?: number;
  APPROVED?: number;
  REJECTED?: number;
  FAILED?: number;
  EXPORTED?: number;
}

export interface ProjectListItemDto {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  counts: ProjectStatusCounts;
}

export interface GetProjectsResponseDto {
  items: ProjectListItemDto[];
}

export interface GetProjectDetailsResponseDto {
  id: string;
  status: string;
  counts: ProjectStatusCounts;
  totalQuestions: number;
}

export interface CreateProjectRequestDto {
  originalName?: string;
  sourceType?: 'XLSX' | 'CSV';
  questions: { rowIndex: number; questionText: string }[];
}

export interface CreateProjectResponseDto {
  projectId: string;
  createdQuestions: number;
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

export interface ExportProjectItemDto {
  rowIndex: number;
  questionText: string;
  finalAnswer: string;
}

export interface ExportProjectResponseDto {
  projectId: string;
  projectName: string;
  generatedAt: string;
  items: ExportProjectItemDto[];
}
