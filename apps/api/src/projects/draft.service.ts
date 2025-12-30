import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient, QuestionItemStatus } from '@qflow/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SimilarChunk {
  embeddingId: string;
  chunkContent: string;
  similarityScore: number;
}

interface ProcessedChunk {
  chunkContent: string;
  similarityScore: number;
}

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name);
  private readonly geminiApi: GoogleGenerativeAI;
  private readonly prisma: PrismaClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const geminiApiKey = this.configService.get<string>('env.geminiApiKey');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.geminiApi = new GoogleGenerativeAI(geminiApiKey);
    this.prisma = this.prismaService as PrismaClient;
  }

  /**
   * Generate embedding for a question text using Gemini
   */
  async generateQuestionEmbedding(questionText: string): Promise<number[]> {
    this.logger.log(`Generating embedding for question: ${questionText.substring(0, 50)}...`);

    try {
      const response = await this.geminiApi
        .getGenerativeModel({ model: 'text-embedding-004' })
        .embedContent(questionText);

      const embedding = response.embedding?.values || [];

      if (embedding.length === 0) {
        throw new Error('Empty embedding returned');
      }

      // Ensure 1536 dimensions
      let finalEmbedding = embedding as number[];
      if (finalEmbedding.length !== 1536) {
        if (finalEmbedding.length < 1536) {
          finalEmbedding = [
            ...finalEmbedding,
            ...new Array(1536 - finalEmbedding.length).fill(0),
          ];
        } else {
          finalEmbedding = finalEmbedding.slice(0, 1536);
        }
        this.logger.warn(
          `Embedding dimension mismatch: ${embedding.length} -> ${finalEmbedding.length}`,
        );
      }

      return finalEmbedding;
    } catch (error) {
      this.logger.error(`Error generating question embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar chunks using vector similarity search
   */
  async searchSimilarChunks(
    userId: string,
    questionEmbedding: number[],
    topK: number = 4,
  ): Promise<SimilarChunk[]> {
    this.logger.log(`Searching for top-${topK} similar chunks for user ${userId}`);

    try {
      // Convert embedding array to PostgreSQL vector format
      const vectorArrayString = `[${questionEmbedding.join(',')}]`;

      // Use cosine distance (<=>) and convert to similarity (1 - distance)
      const results = await this.prisma.$queryRawUnsafe<Array<{
        id: string;
        chunk_content: string;
        similarity: number;
      }>>(
        `SELECT 
          e.id,
          e.chunk_content,
          1 - (e.vector <=> $1::vector(1536)) as similarity
        FROM embeddings e
        JOIN documents d ON e.document_id = d.id
        WHERE d.user_id = $2
        ORDER BY e.vector <=> $1::vector(1536)
        LIMIT $3`,
        vectorArrayString,
        userId,
        topK,
      );

      return results.map((r) => ({
        embeddingId: r.id,
        chunkContent: r.chunk_content,
        similarityScore: r.similarity,
      }));
    } catch (error) {
      this.logger.error(`Error searching similar chunks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build prompt with system instructions, context chunks, and question
   */
  buildPrompt(question: string, chunks: ProcessedChunk[]): string {
    // System prompt
    const systemPrompt = `You are answering security questionnaires for a B2B company. 
Your task is to provide accurate, concise answers based ONLY on the provided context.
If the context does not contain enough information to answer the question, respond with "Not enough information".
Do not use any external knowledge or make assumptions beyond what is provided in the context.`;

    // Build context from chunks
    const contextParts = chunks.map(
      (chunk, index) => `[${index + 1}] ${chunk.chunkContent}`,
    );
    const context = contextParts.join('\n\n');

    // Full prompt
    const prompt = `${systemPrompt}

## Context:
${context}

## Question:
${question}

## Answer:`;

    return prompt;
  }

  /**
   * Generate answer using Gemini LLM
   */
  async generateAnswer(prompt: string): Promise<string> {
    this.logger.log('Generating answer using Gemini LLM');

    try {
      const model = this.geminiApi.getGenerativeModel({
        model: 'gemini-2.5-flash', // Using flash for faster responses
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from LLM');
      }

      return text.trim();
    } catch (error) {
      this.logger.error(`Error generating answer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate confidence score from top similarity score
   */
  calculateConfidence(topSimilarityScore: number): number {
    // Normalize similarity score to 0..1 range
    // Similarity is already in 0..1 range from vector search
    // Clamp to ensure valid range
    const confidence = Math.max(0, Math.min(1, topSimilarityScore));
    return confidence;
  }

  /**
   * Determine question status based on confidence and project settings
   */
  determineStatus(
    confidence: number,
    reviewThreshold: number,
    autoApprove: boolean,
  ): QuestionItemStatus {
    if (confidence < reviewThreshold) {
      return QuestionItemStatus.NEEDS_REVIEW;
    } else if (autoApprove) {
      return QuestionItemStatus.APPROVED;
    } else {
      return QuestionItemStatus.DRAFTED;
    }
  }

  /**
   * Save citations for a question
   */
  async saveCitations(
    questionItemId: string,
    chunks: SimilarChunk[],
  ): Promise<void> {
    this.logger.log(`Saving ${chunks.length} citations for question ${questionItemId}`);

    try {
      // Delete existing citations for this question
      await this.prisma.answerCitation.deleteMany({
        where: { questionItemId },
      });

      // Create new citations
      const citations = chunks.map((chunk) => ({
        questionItemId,
        embeddingId: chunk.embeddingId,
        score: chunk.similarityScore,
        snippet: chunk.chunkContent.substring(0, 200), // First 200 chars
      }));

      await this.prisma.answerCitation.createMany({
        data: citations,
      });

      this.logger.log(`Saved ${citations.length} citations`);
    } catch (error) {
      this.logger.error(`Error saving citations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a single question through the full pipeline
   */
  async processQuestion(
    questionItem: {
      id: string;
      questionText: string;
      projectId: string;
    },
    project: {
      userId: string;
      reviewThreshold: number;
      autoApprove: boolean;
    },
  ): Promise<{
    answer: string;
    confidence: number;
    status: QuestionItemStatus;
    chunks: SimilarChunk[];
  }> {
    this.logger.log(`Processing question ${questionItem.id}`);

    try {
      // Step 1: Generate question embedding
      const questionEmbedding = await this.generateQuestionEmbedding(
        questionItem.questionText,
      );

      // Step 2: Search for similar chunks
      const chunks = await this.searchSimilarChunks(
        project.userId,
        questionEmbedding,
        4, // top-k = 4
      );

      // Handle case where no chunks found
      if (chunks.length === 0) {
        this.logger.warn(`No chunks found for question ${questionItem.id}`);
        return {
          answer: 'Not enough information',
          confidence: 0,
          status: QuestionItemStatus.NEEDS_REVIEW,
          chunks: [],
        };
      }

      // Step 3: Build prompt
      const processedChunks: ProcessedChunk[] = chunks.map((c) => ({
        chunkContent: c.chunkContent,
        similarityScore: c.similarityScore,
      }));
      const prompt = this.buildPrompt(questionItem.questionText, processedChunks);

      // Step 4: Generate answer
      const answer = await this.generateAnswer(prompt);

      // Step 5: Calculate confidence (using top similarity score)
      const topSimilarity = chunks[0]?.similarityScore || 0;
      const confidence = this.calculateConfidence(topSimilarity);

      // Step 6: Determine status
      const status = this.determineStatus(
        confidence,
        project.reviewThreshold,
        project.autoApprove,
      );

      // Step 7: Save citations
      await this.saveCitations(questionItem.id, chunks);

      // Step 8: Update question item
      await this.prisma.questionItem.update({
        where: { id: questionItem.id },
        data: {
          aiAnswer: answer,
          confidenceScore: confidence,
          status,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Question ${questionItem.id} processed: status=${status}, confidence=${confidence.toFixed(2)}`,
      );

      return {
        answer,
        confidence,
        status,
        chunks,
      };
    } catch (error) {
      this.logger.error(
        `Error processing question ${questionItem.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

