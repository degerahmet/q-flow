import type {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
  GetProjectDetailsResponseDto,
  GetProjectQuestionsResponseDto,
  GetProjectsResponseDto,
  GetReviewQueueResponseDto,
  ReviewActionResponseDto,
} from '@/lib/api/types/projects';
import { QuestionItemStatus } from '@/lib/api/types/projects';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getProjects(
  token: string,
): Promise<GetProjectsResponseDto> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get projects failed' }));
    throw new Error(
      (error as { message?: string }).message || `Get projects failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function createProject(
  token: string,
  body: CreateProjectRequestDto,
): Promise<CreateProjectResponseDto> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Create project failed' }));
    throw new Error(
      (error as { message?: string }).message || `Create project failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function startDraft(
  token: string,
  projectId: string,
): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Start draft failed' }));
    throw new Error(
      (error as { message?: string }).message || `Start draft failed: ${response.status}`,
    );
  }

  return response.json();
}

export interface ReviewQuestionRequestBody {
  action: 'APPROVE' | 'EDIT_APPROVE' | 'REJECT';
  humanAnswer?: string;
  notes?: string;
}

export async function getProjectDetails(
  token: string,
  projectId: string,
): Promise<GetProjectDetailsResponseDto> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get project details failed' }));
    throw new Error(
      (error as { message?: string }).message || `Get project details failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getReviewQueue(
  token: string,
  projectId: string,
): Promise<GetReviewQueueResponseDto> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/review-queue`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get review queue failed' }));
    throw new Error(
      (error as { message?: string }).message || `Get review queue failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getProjectQuestions(
  token: string,
  projectId: string,
  status?: string,
): Promise<GetProjectQuestionsResponseDto> {
  const url = status
    ? `${API_BASE_URL}/projects/${projectId}/questions?status=${status}`
    : `${API_BASE_URL}/projects/${projectId}/questions`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get project questions failed' }));
    throw new Error(
      (error as { message?: string }).message || `Get project questions failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function submitReview(
  token: string,
  questionId: string,
  body: ReviewQuestionRequestBody,
): Promise<ReviewActionResponseDto> {
  const response = await fetch(`${API_BASE_URL}/questions/${questionId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Submit review failed' }));
    throw new Error(
      (error as { message?: string }).message || `Submit review failed: ${response.status}`,
    );
  }

  return response.json();
}

export { QuestionItemStatus };
