export class EmbeddingDto {
  id!: string;
  documentId!: string;
  chunkContent!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class DocumentWithEmbeddingsDto {
  id!: string;
  filename!: string;
  contentHash!: string;
  uploadDate!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  embeddings!: EmbeddingDto[];
}

export class PaginatedDocumentsResponseDto {
  data!: DocumentWithEmbeddingsDto[];
  total!: number;
  page!: number;
  limit!: number;
}
