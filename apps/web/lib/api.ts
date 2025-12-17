import type { HealthCheckResponse } from './types/health';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout for health checks
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as HealthCheckResponse;
  } catch (error) {
    // Return a down status if the request fails
    return {
      ok: false,
      db: 'down',
      ts: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
