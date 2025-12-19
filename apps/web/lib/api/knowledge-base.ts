import type { FeedKnowledgeBaseDto, GetJobStatusResponseDto, PaginatedDocumentsResponseDto } from '@qflow/api-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FeedKnowledgeBaseResponse {
  jobId: string;
  status: string;
  message: string;
}

export async function feedKnowledgeBase(
  token: string,
  data: FeedKnowledgeBaseDto,
): Promise<FeedKnowledgeBaseResponse> {
  const response = await fetch(`${API_BASE_URL}/knowledge-base/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Feed knowledge base failed' }));
    throw new Error(error.message || `Feed knowledge base failed: ${response.status}`);
  }

  return response.json();
}

export async function getJobStatus(
  token: string,
  jobId: string,
): Promise<GetJobStatusResponseDto> {
  const response = await fetch(`${API_BASE_URL}/knowledge-base/job-status/${jobId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get job status failed' }));
    throw new Error(error.message || `Get job status failed: ${response.status}`);
  }

  return response.json();
}

export async function getDocuments(
  token: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedDocumentsResponseDto> {
  const response = await fetch(
    `${API_BASE_URL}/knowledge-base/documents?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Get documents failed' }));
    throw new Error(error.message || `Get documents failed: ${response.status}`);
  }

  return response.json();
}