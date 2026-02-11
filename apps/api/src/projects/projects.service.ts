import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
  ExportProjectResponseDto,
  GetProjectDetailsResponseDto,
  GetProjectQuestionsResponseDto,
  GetProjectsResponseDto,
  GetReviewQueueResponseDto,
  ProjectStatus,
  ProjectStatusCountsDto,
  QuestionItemStatus,
  ReviewAction,
  ReviewActionResponseDto,
} from '@qflow/api-types';
import {
  QuestionItemStatus as PrismaQuestionItemStatus,
  ProjectStatus as PrismaProjectStatus,
} from '@qflow/db';
import { DraftQuestionsJob } from './draft.processor';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('draft-questions')
    private readonly draftQueue: Queue<DraftQuestionsJob>,
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

  async getProjects(
    userId: string,
    limit = 50,
  ): Promise<GetProjectsResponseDto> {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        originalFilePath: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return { items: [] };
    }

    const countsData = await this.prisma.questionItem.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: true,
    });

    const countsByProject = new Map<string, ProjectStatusCountsDto>();
    for (const pid of projectIds) {
      countsByProject.set(pid, {
        [QuestionItemStatus.PENDING]: 0,
        [QuestionItemStatus.DRAFTED]: 0,
        [QuestionItemStatus.NEEDS_REVIEW]: 0,
        [QuestionItemStatus.APPROVED]: 0,
        [QuestionItemStatus.REJECTED]: 0,
        [QuestionItemStatus.FAILED]: 0,
        [QuestionItemStatus.EXPORTED]: 0,
      });
    }
    countsData.forEach((row) => {
      const counts = countsByProject.get(row.projectId);
      if (counts) {
        counts[row.status as QuestionItemStatus] = row._count;
      }
    });

    const items = projects.map((project) => ({
      id: project.id,
      originalName: project.originalFilePath,
      status: project.status as ProjectStatus,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      counts: countsByProject.get(project.id)!,
    }));

    return { items };
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
      throw new ForbiddenException('You do not have access to this project');
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
      throw new ForbiddenException('You do not have access to this project');
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
      throw new ForbiddenException('You do not have access to this project');
    }

    // Check project status (must be PROCESSING or QUEUED)
    if (
      project.status !== PrismaProjectStatus.PROCESSING &&
      project.status !== PrismaProjectStatus.QUEUED
    ) {
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

  async getReviewQueue(
    userId: string,
    projectId: string,
  ): Promise<GetReviewQueueResponseDto> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to user
    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Fetch question items with NEEDS_REVIEW status, including citations
    const questionItems = await this.prisma.questionItem.findMany({
      where: {
        projectId,
        status: PrismaQuestionItemStatus.NEEDS_REVIEW,
      },
      include: {
        answerCitations: {
          orderBy: { score: 'desc' },
        },
      },
      orderBy: { rowIndex: 'asc' },
    });

    return {
      questions: questionItems.map((item) => ({
        id: item.id,
        rowIndex: item.rowIndex,
        questionText: item.questionText,
        aiAnswer: item.aiAnswer,
        confidenceScore: item.confidenceScore,
        citations: item.answerCitations.map((citation) => ({
          embeddingId: citation.embeddingId,
          score: citation.score,
          snippet: citation.snippet,
        })),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  async submitReview(
    userId: string,
    questionId: string,
    action: ReviewAction,
    humanAnswer?: string,
    notes?: string,
  ): Promise<ReviewActionResponseDto> {
    // Fetch question item with project relation
    const questionItem = await this.prisma.questionItem.findUnique({
      where: { id: questionId },
      include: { project: true },
    });

    if (!questionItem) {
      throw new NotFoundException('Question not found');
    }

    // Verify question belongs to user's project
    if (questionItem.project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this question');
    }

    // Verify question is in NEEDS_REVIEW status
    if (questionItem.status !== PrismaQuestionItemStatus.NEEDS_REVIEW) {
      throw new BadRequestException(
        `Question is not in NEEDS_REVIEW status. Current status: ${questionItem.status}`,
      );
    }

    // Validate action-specific requirements
    if (action === ReviewAction.EDIT_APPROVE && !humanAnswer) {
      throw new BadRequestException(
        'humanAnswer is required for EDIT_APPROVE action',
      );
    }
    if (
      action === ReviewAction.APPROVE &&
      (questionItem.aiAnswer == null || questionItem.aiAnswer.trim() === '')
    ) {
      throw new BadRequestException('Cannot APPROVE: aiAnswer is missing');
    }

    // Determine new status and update data
    let newStatus: PrismaQuestionItemStatus;
    const updateData: any = {};

    switch (action) {
      case ReviewAction.APPROVE:
        newStatus = PrismaQuestionItemStatus.APPROVED;
        // aiAnswer becomes final, no changes needed
        break;

      case ReviewAction.EDIT_APPROVE:
        newStatus = PrismaQuestionItemStatus.APPROVED;
        updateData.humanAnswer = humanAnswer;
        // aiAnswer is preserved
        break;

      case ReviewAction.REJECT:
        newStatus = PrismaQuestionItemStatus.REJECTED;
        // Status change only, notes optional
        break;

      default:
        throw new BadRequestException(`Invalid review action: ${action}`);
    }

    updateData.status = newStatus;
    updateData.updatedAt = new Date();

    // Update question item
    await this.prisma.questionItem.update({
      where: { id: questionId },
      data: updateData,
    });

    // Create ReviewEvent for audit trail
    await this.prisma.reviewEvent.create({
      data: {
        questionItemId: questionId,
        reviewerId: userId,
        action,
        notes: notes || null,
      },
    });

    // Generate appropriate message based on action
    let message: string;
    switch (action) {
      case ReviewAction.APPROVE:
        message = 'Question approved successfully';
        break;
      case ReviewAction.EDIT_APPROVE:
        message = 'Question edited and approved successfully';
        break;
      case ReviewAction.REJECT:
        message = 'Question rejected successfully';
        break;
      default:
        message = 'Review action processed successfully';
    }

    return {
      questionId,
      status: newStatus as QuestionItemStatus,
      action,
      message,
    };
  }

  async checkReviewGate(userId: string, projectId: string): Promise<boolean> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify project belongs to user
    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Check if any NEEDS_REVIEW questions exist
    const needsReviewCount = await this.prisma.questionItem.count({
      where: {
        projectId,
        status: PrismaQuestionItemStatus.NEEDS_REVIEW,
      },
    });

    // Returns true if review gate is blocked (has NEEDS_REVIEW questions)
    return needsReviewCount > 0;
  }

  async exportProject(
    userId: string,
    projectId: string,
  ): Promise<ExportProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    await this.validateProjectReadyForExport(projectId);

    const questionItems = await this.prisma.questionItem.findMany({
      where: { projectId },
      orderBy: { rowIndex: 'asc' },
    });

    const items = questionItems.map((item) => ({
      rowIndex: item.rowIndex,
      questionText: item.questionText,
      finalAnswer:
        item.humanAnswer ?? item.aiAnswer ?? '',
    }));

    return {
      projectId: project.id,
      projectName: project.originalFilePath,
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Validates that the project has no questions in NEEDS_REVIEW status.
   * Call after verifying project ownership (e.g. before export).
   * @throws ConflictException (409) if any questions need review
   */
  async validateProjectReadyForExport(projectId: string): Promise<void> {
    const needsReviewCount = await this.prisma.questionItem.count({
      where: {
        projectId,
        status: PrismaQuestionItemStatus.NEEDS_REVIEW,
      },
    });
    if (needsReviewCount > 0) {
      throw new ConflictException(
        'Project has questions that need review; complete review before export',
      );
    }
  }
}
