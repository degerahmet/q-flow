export interface HealthCheckResponse {
  ok: boolean;
  db: 'up' | 'down';
  pgvector?: 'enabled' | 'missing';
  ts: string; // ISO timestamp
  message?: string; // error durumunda
}
