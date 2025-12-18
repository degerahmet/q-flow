import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

export interface FeedKnowledgeBaseJob {
  userId: string;
  sourcePath?: string;
  text?: string;
  chunkSize?: number;
}

@Processor('knowledge-base-feed')
export class KnowledgeBaseProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeBaseProcessor.name);

  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {
    super();
  }

  async process(job: Job<FeedKnowledgeBaseJob>) {
    const { userId, sourcePath, text, chunkSize } = job.data;

    this.logger.log(`Processing knowledge base feed job ${job.id} for user ${userId}`);

    try {
      // Update progress: Starting
      await job.updateProgress(0);

      // Step 1: Parse markdown (10%)
      this.logger.log('Step 1: Parsing markdown...');
      let concepts;
      if (text) {
        concepts = this.knowledgeBaseService.parseMarkdownText(text);
      } else if (sourcePath) {
        concepts = await this.knowledgeBaseService.parseMarkdownFile(sourcePath);
      } else {
        throw new Error('Either text or sourcePath must be provided');
      }
      await job.updateProgress(10);

      // Step 2: Create concept markdowns (30%)
      this.logger.log('Step 2: Creating concept markdowns...');
      const conceptMarkdowns = this.knowledgeBaseService.createConceptMarkdowns(concepts);
      await job.updateProgress(30);

      let processedFiles = 0;
      const totalFiles = conceptMarkdowns.length;
      let totalChunks = 0;
      let totalEmbeddings = 0;

      // Step 3-5: Process each concept markdown
      for (const conceptMd of conceptMarkdowns) {
        this.logger.log(`Processing concept: ${conceptMd.filename}`);

        // Split into chunks (50%)
        const chunks = await this.knowledgeBaseService.splitIntoChunks(
          conceptMd.markdown,
          conceptMd.filename,
          chunkSize,
        );
        totalChunks += chunks.length;
        await job.updateProgress(30 + (processedFiles / totalFiles) * 20);

        // Generate embeddings (70%)
        const embeddings = await this.knowledgeBaseService.generateEmbeddings(chunks);
        totalEmbeddings += embeddings.length;
        await job.updateProgress(50 + (processedFiles / totalFiles) * 20);

        // Save to database (100%)
        await this.knowledgeBaseService.saveToDatabase(
          userId,
          conceptMd.filename,
          chunks,
          embeddings,
        );
        await job.updateProgress(70 + ((processedFiles + 1) / totalFiles) * 30);

        processedFiles++;
      }

      const result = {
        documentsCreated: conceptMarkdowns.length,
        totalChunks,
        totalEmbeddings,
      };

      await job.updateProgress(100);

      this.logger.log(
        `Knowledge base feed job ${job.id} completed successfully: ${result.documentsCreated} documents`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error processing knowledge base feed job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
