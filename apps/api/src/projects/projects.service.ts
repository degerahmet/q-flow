import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
} from '@qflow/api-types';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
