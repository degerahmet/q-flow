import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@qflow/db';
import { PrismaPg } from '@prisma/adapter-pg';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encodingForModel } from 'js-tiktoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface Concept {
  title: string;
  content: string;
  filename: string;
}

interface ConceptMarkdown {
  filename: string;
  markdown: string;
}

interface Chunk {
  content: string;
  metadata?: Record<string, any>;
}

interface EmbeddingResult {
  embedding: number[];
  chunk: Chunk;
}

interface FeedOptions {
  chunkSize?: number;
}

interface FeedResult {
  documentsCreated: number;
  totalChunks: number;
  totalEmbeddings: number;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly geminiApi: GoogleGenerativeAI;
  private prisma: PrismaClient | null = null;
  private readonly conceptFilenameMap: Record<string, string> = {
    '1. Authentication & Access Control': 'security_policy_auth.md',
    '2. Data Security – Encryption & Storage': 'data_security_encryption.md',
    '3. Data Security – Multi-tenancy & Isolation':
      'data_security_multitenancy.md',
    '4. Infrastructure & Network Security':
      'infrastructure_network_security.md',
    '5. Compliance & Certifications': 'compliance_certifications.md',
    '6. Operations & Risk Management': 'operations_risk_management.md',
    '7. Backup & Disaster Recovery': 'backup_disaster_recovery.md',
    '8. API & Integration Security': 'api_integration_security.md',
    '9. Legal & Contractual': 'legal_contractual.md',
    '10. Privacy & Data Handling': 'privacy_data_handling.md',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService?: PrismaService,
  ) {
    const geminiApiKey = this.configService.get<string>('env.geminiApiKey');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.geminiApi = new GoogleGenerativeAI(geminiApiKey);

    // Initialize PrismaClient - use injected service if available, otherwise create new instance
    if (this.prismaService) {
      this.prisma = this.prismaService as PrismaClient;
    } else {
      // For standalone usage - will be initialized lazily in methods that need it
      this.prisma = null as any; // Will be set in methods that use it
    }
  }

  parseMarkdownText(text: string): Concept[] {
    this.logger.log('Parsing markdown text');
    const concepts: Concept[] = [];

    // Split by ## headers
    const sections = text.split(/^##\s+/m).filter((s) => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const titleLine = lines[0].trim();
      const contentLines = lines.slice(1).join('\n').trim();

      // Remove *** separators
      const cleanContent = contentLines.replace(/^\*\*\*$/gm, '').trim();

      if (!cleanContent) continue;

      // Get filename from map or generate from title
      const filename =
        this.conceptFilenameMap[titleLine] ||
        titleLine
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') + '.md';

      concepts.push({
        title: titleLine,
        content: cleanContent,
        filename,
      });
    }

    this.logger.log(`Parsed ${concepts.length} concepts from markdown text`);
    return concepts;
  }

  async parseMarkdownFile(sourcePath: string): Promise<Concept[]> {
    this.logger.log(`Parsing markdown file: ${sourcePath}`);
    const content = await fs.readFile(sourcePath, 'utf-8');
    return this.parseMarkdownText(content);
  }

  createConceptMarkdowns(concepts: Concept[]): ConceptMarkdown[] {
    const markdowns: ConceptMarkdown[] = [];

    for (const concept of concepts) {
      const markdown = `# ${concept.title}\n\n${concept.content}`;
      markdowns.push({
        filename: concept.filename,
        markdown,
      });
      this.logger.log(`Created concept markdown: ${concept.filename}`);
    }

    return markdowns;
  }

  async splitIntoChunks(
    markdown: string,
    filename: string,
    chunkSize: number = 384,
  ): Promise<Chunk[]> {
    this.logger.log(
      `Splitting markdown into chunks: ${filename} (chunk size: ${chunkSize} tokens)`,
    );

    // Initialize tokenizer for token-based splitting
    // Using 'gpt-3.5-turbo' as a reasonable default for token counting
    const encoding = encodingForModel('gpt-3.5-turbo');
    const countTokens = (text: string): number => {
      return encoding.encode(text).length;
    };

    // Use RecursiveCharacterTextSplitter with token-aware splitting
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: Math.floor(chunkSize * 0.1), // 10% overlap
      lengthFunction: countTokens, // Token-based length function
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    const chunks = await splitter.createDocuments([markdown]);
    const result: Chunk[] = chunks.map((chunk) => ({
      content: chunk.pageContent,
      metadata: { ...chunk.metadata, source: filename },
    }));

    this.logger.log(`Created ${result.length} chunks from ${filename}`);
    return result;
  }

  async generateEmbeddings(chunks: Chunk[]): Promise<EmbeddingResult[]> {
    this.logger.log(`Generating embeddings for ${chunks.length} chunks`);
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];

        // Use Gemini embedding API
        // text-embedding-004 model
        const response = await this.geminiApi
          .getGenerativeModel({ model: 'text-embedding-004' })
          .embedContent(chunk.content);

        // Extract embedding vector
        const embedding = response.embedding?.values || [];

        if (embedding.length === 0) {
          throw new Error('Empty embedding returned');
        }

        results.push({
          embedding: embedding as number[],
          chunk,
        });

        // Rate limiting: small delay between requests
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.logger.error(
          `Error generating embedding for chunk ${i + 1}: ${error.message}`,
        );
        throw error;
      }
    }

    this.logger.log(`Generated ${results.length} embeddings`);
    return results;
  }

  private getPrismaClient(): PrismaClient {
    if (this.prisma) {
      return this.prisma;
    }
    // Initialize for standalone usage
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString:
        this.configService.get<string>('env.databaseUrl') ||
        process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    this.prisma = new PrismaClient({ adapter });
    return this.prisma;
  }

  async saveToDatabase(
    userId: string,
    filename: string,
    chunks: Chunk[],
    embeddings: EmbeddingResult[],
  ): Promise<void> {
    this.logger.log(
      `Saving to database: ${filename} (${chunks.length} chunks)`,
    );

    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings count mismatch');
    }

    const prisma = this.getPrismaClient();

    // Calculate content hash
    const allContent = chunks.map((c) => c.content).join('\n\n');
    const contentHash = crypto
      .createHash('sha256')
      .update(allContent)
      .digest('hex');

    // Check if document already exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        userId,
        contentHash,
      },
    });

    let documentId: string;
    if (existingDoc) {
      this.logger.log(
        `Document already exists, using existing document ID: ${existingDoc.id}`,
      );
      documentId = existingDoc.id;
      // Delete existing embeddings
      await prisma.embedding.deleteMany({
        where: { documentId },
      });
    } else {
      // Create document
      const document = await prisma.document.create({
        data: {
          userId,
          filename,
          contentHash,
        },
      });
      documentId = document.id;
      this.logger.log(`Created document: ${documentId}`);
    }

    // Insert embeddings using raw SQL for vector type
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResult = embeddings[i];
      const embedding = embeddingResult.embedding;

      // Ensure embedding is 1536 dimensions
      let finalEmbedding = embedding;
      if (embedding.length !== 1536) {
        if (embedding.length < 1536) {
          // Pad with zeros
          finalEmbedding = [
            ...embedding,
            ...new Array(1536 - embedding.length).fill(0),
          ];
        } else {
          // Truncate
          finalEmbedding = embedding.slice(0, 1536);
        }
        this.logger.warn(
          `Embedding dimension mismatch: ${embedding.length} -> ${finalEmbedding.length}`,
        );
      }

      // Insert using raw SQL for vector type
      // PostgreSQL pgvector expects array format: [1,2,3]::vector(1536)
      // Use Prisma.$queryRawUnsafe for dynamic SQL with vector casting
      const embeddingId = crypto.randomUUID();
      const vectorArrayString = `[${finalEmbedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO embeddings (id, document_id, chunk_content, vector, created_at, updated_at)
         VALUES ($1, $2, $3, $4::vector(1536), NOW(), NOW())`,
        embeddingId,
        documentId,
        chunk.content,
        vectorArrayString,
      );
    }

    this.logger.log(`Saved ${chunks.length} embeddings to database`);
  }

  /**
   * Retrieves paginated list of documents with their embeddings for a specific user.
   *
   * @param {string} userId - The ID of the user whose documents to retrieve
   * @param {number} [page=1] - Page number (1-indexed)
   * @param {number} [limit=10] - Number of documents per page
   * @returns {Promise<{data: Array<{id: string, filename: string, contentHash: string, uploadDate: Date, createdAt: Date, updatedAt: Date, embeddings: Array<{id: string, documentId: string, chunkContent: string, createdAt: Date, updatedAt: Date}>}>, total: number, page: number, limit: number}>} Paginated response containing documents with embeddings
   *
   * @description
   * This method:
   * - Fetches documents filtered by userId (user-based access control)
   * - Joins with embeddings table to include all related embeddings
   * - Uses explicit select to only return fields defined in the DTO (excludes sensitive fields like userId)
   * - Excludes vector data from embeddings for security and performance
   * - Orders results by uploadDate descending (newest first)
   * - Returns paginated results with total count
   *
   * @example
   * ```typescript
   * const result = await knowledgeBaseService.getUserDocuments('user-123', 1, 10);
   * console.log(result.data); // Array of documents with embeddings
   * console.log(result.total); // Total number of documents
   * ```
   *
   * @throws {Error} If database query fails
   */
  async getUserDocuments(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Array<{
      id: string;
      filename: string;
      contentHash: string;
      uploadDate: Date;
      createdAt: Date;
      updatedAt: Date;
      embeddings: Array<{
        id: string;
        documentId: string;
        chunkContent: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(
      `Fetching documents for user ${userId} (page: ${page}, limit: ${limit})`,
    );

    const prisma = this.getPrismaClient();

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch documents with embeddings
    // Using explicit select to only return fields defined in the DTO
    // This prevents exposing sensitive fields like userId
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          filename: true,
          contentHash: true,
          uploadDate: true,
          createdAt: true,
          updatedAt: true,
          embeddings: {
            select: {
              id: true,
              documentId: true,
              chunkContent: true,
              createdAt: true,
              updatedAt: true,
              // Exclude vector field
            },
          },
        },
        orderBy: {
          uploadDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.document.count({
        where: {
          userId,
        },
      }),
    ]);

    this.logger.log(
      `Found ${documents.length} documents (total: ${total}) for user ${userId}`,
    );

    return {
      data: documents,
      total,
      page,
      limit,
    };
  }

  async feedKnowledgeBase(
    userId: string,
    sourcePathOrText: string,
    options: FeedOptions = {},
  ): Promise<FeedResult> {
    const chunkSize = options.chunkSize || 384;
    this.logger.log(`Starting knowledge base feed for user ${userId}`);

    try {
      // Step 1: Parse markdown (from file or text)
      let concepts: Concept[];
      // Check if it's a file path (contains path separators) or text
      if (sourcePathOrText.includes('\n') || !sourcePathOrText.includes('/') && !sourcePathOrText.includes('\\')) {
        // Likely text content
        concepts = this.parseMarkdownText(sourcePathOrText);
      } else {
        // Likely file path
        concepts = await this.parseMarkdownFile(sourcePathOrText);
      }

      // Step 2: Create concept markdowns (in-memory, no file I/O)
      const conceptMarkdowns = this.createConceptMarkdowns(concepts);

      let totalChunks = 0;
      let totalEmbeddings = 0;

      // Step 3-5: Process each concept markdown
      for (const conceptMd of conceptMarkdowns) {
        // Split into chunks
        const chunks = await this.splitIntoChunks(
          conceptMd.markdown,
          conceptMd.filename,
          chunkSize,
        );
        totalChunks += chunks.length;

        // Generate embeddings
        const embeddings = await this.generateEmbeddings(chunks);
        totalEmbeddings += embeddings.length;

        // Save to database
        await this.saveToDatabase(
          userId,
          conceptMd.filename,
          chunks,
          embeddings,
        );
      }

      this.logger.log(
        `Knowledge base feed completed: ${conceptMarkdowns.length} documents, ${totalChunks} chunks, ${totalEmbeddings} embeddings`,
      );

      return {
        documentsCreated: conceptMarkdowns.length,
        totalChunks,
        totalEmbeddings,
      };
    } catch (error) {
      this.logger.error(
        `Error in feedKnowledgeBase: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
