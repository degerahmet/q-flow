import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
  GetProjectDetailsResponseDto,
  GetProjectQuestionsResponseDto,
  QuestionItemStatus,
  ProjectStatusCountsDto,
  ProjectStatus,
} from '@qflow/api-types';
import { QuestionItemStatus as PrismaQuestionItemStatus, ProjectStatus as PrismaProjectStatus } from '@qflow/db';
import { DraftQuestionsJob } from './draft.processor';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('draft-questions') private readonly draftQueue: Queue<DraftQuestionsJob>,
  ) {}

  async createFromQuestions(
    userId: string,
    body: CreateProjectRequestDto,
  ): Promise<CreateProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        userId,
        status: 'QUEUED',
        originalFilePath: body.originalName ?? 'questionnaire',
      },
    });

    // normalize
    const items = body.questions
      .map((q) => ({
        rowIndex: Number(q.rowIndex),
        questionText: String(q.questionText ?? '').trim(),
      }))
      .filter(
        (q) =>
          Number.isFinite(q.rowIndex) &&
          q.rowIndex > 0 &&
          q.questionText.length > 0,
      );

    await this.prisma.questionItem.createMany({
      data: items.map((it) => ({
        projectId: project.id,
        rowIndex: it.rowIndex,
        questionText: it.questionText,
        status: 'PENDING',
      })),
    });

    await this.prisma.project.update({
      where: { id: project.id },
      data: { status: 'PROCESSING' },
    });

    return { projectId: project.id, createdQuestions: items.length };
  }

  async getProjectDetails(
    userId: string,
    projectId: string,
  ): Promise<GetProjectDetailsResponseDto> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to user
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    // Get counts grouped by status
    const countsData = await this.prisma.questionItem.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });

    // Initialize counts object with all statuses set to 0
    const counts: ProjectStatusCountsDto = {
      [QuestionItemStatus.PENDING]: 0,
      [QuestionItemStatus.DRAFTED]: 0,
      [QuestionItemStatus.NEEDS_REVIEW]: 0,
      [QuestionItemStatus.APPROVED]: 0,
      [QuestionItemStatus.REJECTED]: 0,
      [QuestionItemStatus.FAILED]: 0,
      [QuestionItemStatus.EXPORTED]: 0,
    };

    // Fill in actual counts
    countsData.forEach((item) => {
      counts[item.status as QuestionItemStatus] = item._count;
    });

    // Calculate total questions
    const totalQuestions = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      id: project.id,
      status: project.status as ProjectStatus,
      counts,
      totalQuestions,
    };
  }

  async getProjectQuestions(
    userId: string,
    projectId: string,
    status?: QuestionItemStatus,
  ): Promise<GetProjectQuestionsResponseDto> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to user
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    // Build where clause
    const where: any = { projectId };
    if (status) {
      where.status = status as PrismaQuestionItemStatus;
    }

    // Fetch question items
    const questionItems = await this.prisma.questionItem.findMany({
      where,
      orderBy: { rowIndex: 'asc' },
    });

    return {
      questions: questionItems.map((item) => ({
        id: item.id,
        rowIndex: item.rowIndex,
        questionText: item.questionText,
        aiAnswer: item.aiAnswer,
        humanAnswer: item.humanAnswer,
        confidenceScore: item.confidenceScore,
        status: item.status as QuestionItemStatus,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  async startDraftJob(userId: string, projectId: string): Promise<void> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to user
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this project',
      );
    }

    // Check project status (must be PROCESSING or QUEUED)
    if (project.status !== PrismaProjectStatus.PROCESSING && 
        project.status !== PrismaProjectStatus.QUEUED) {
      throw new BadRequestException(
        `Project status must be PROCESSING or QUEUED, but is ${project.status}`,
      );
    }

    // Enqueue draft job (idempotent - can be called multiple times)
    await this.draftQueue.add('draft-questions', {
      projectId,
      userId,
    });
  }
}
