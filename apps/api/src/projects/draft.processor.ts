import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DraftService } from './draft.service';
import { QuestionItemStatus } from '@qflow/db';

export interface DraftQuestionsJob {
  projectId: string;
  userId: string;
}

@Processor('draft-questions')
export class DraftProcessor extends WorkerHost {
  private readonly logger = new Logger(DraftProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly draftService: DraftService,
  ) {
    super();
  }

  async process(job: Job<DraftQuestionsJob>) {
    const { projectId, userId } = job.data;

    this.logger.log(
      `Processing draft job ${job.id} for project ${projectId}, user ${userId}`,
    );

    try {
      // Update progress: Starting
      await job.updateProgress(0);

      // Step 1: Verify project exists and belongs to user
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (project.userId !== userId) {
        throw new Error(`Project ${projectId} does not belong to user ${userId}`);
      }

      // Step 2: Fetch all PENDING questions for this project
      const pendingQuestions = await this.prisma.questionItem.findMany({
        where: {
          projectId,
          status: QuestionItemStatus.PENDING,
        },
        orderBy: { rowIndex: 'asc' },
      });

      this.logger.log(
        `Found ${pendingQuestions.length} PENDING questions to process`,
      );

      if (pendingQuestions.length === 0) {
        this.logger.log(`No PENDING questions found for project ${projectId}`);
        await job.updateProgress(100);
        return {
          processed: 0,
          drafted: 0,
          needsReview: 0,
          approved: 0,
          failed: 0,
        };
      }

      // Step 3: Process each question sequentially
      let processed = 0;
      let drafted = 0;
      let needsReview = 0;
      let approved = 0;
      let failed = 0;

      for (let i = 0; i < pendingQuestions.length; i++) {
        const question = pendingQuestions[i];
        const progress = Math.floor((i / pendingQuestions.length) * 90) + 10; // 10-100%
        await job.updateProgress(progress);

        try {
          this.logger.log(
            `Processing question ${question.id} (${i + 1}/${pendingQuestions.length})`,
          );

          const result = await this.draftService.processQuestion(
            {
              id: question.id,
              questionText: question.questionText,
              projectId: question.projectId,
            },
            {
              userId: project.userId,
              reviewThreshold: project.reviewThreshold,
              autoApprove: project.autoApprove,
            },
          );

          processed++;

          // Count by status
          switch (result.status) {
            case QuestionItemStatus.DRAFTED:
              drafted++;
              break;
            case QuestionItemStatus.NEEDS_REVIEW:
              needsReview++;
              break;
            case QuestionItemStatus.APPROVED:
              approved++;
              break;
          }

          // Small delay to avoid rate limiting
          if (i < pendingQuestions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          this.logger.error(
            `Error processing question ${question.id}: ${error.message}`,
            error.stack,
          );

          // Mark question as FAILED but continue processing others
          try {
            await this.prisma.questionItem.update({
              where: { id: question.id },
              data: {
                status: QuestionItemStatus.FAILED,
                updatedAt: new Date(),
              },
            });
            failed++;
          } catch (updateError) {
            this.logger.error(
              `Failed to update question ${question.id} status to FAILED: ${updateError.message}`,
            );
          }
        }
      }

      await job.updateProgress(100);

      const result = {
        processed,
        drafted,
        needsReview,
        approved,
        failed,
      };

      this.logger.log(
        `Draft job ${job.id} completed: ${JSON.stringify(result)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error processing draft job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

