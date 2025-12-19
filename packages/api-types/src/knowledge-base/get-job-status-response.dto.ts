export class GetJobStatusResponseDto {
  jobId!: string;
  status!: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: {
    documentsCreated: number;
    totalChunks: number;
    totalEmbeddings: number;
  };
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}
