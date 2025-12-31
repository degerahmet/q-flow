import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
  GetProjectDetailsResponseDto,
  GetProjectQuestionsResponseDto,
  QuestionItemStatus,
  StartDraftResponseDto,
  ReviewQueueResponseDto,
  ReviewActionDto,
  ReviewActionResponseDto,
} from '@qflow/api-types';
import { ProjectsService } from './projects.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new project from questions' })
  @ApiBody({
    description: 'Project creation data with questions',
    schema: {
      type: 'object',
      required: ['questions'],
      properties: {
        originalName: {
          type: 'string',
          description: 'Original file name (optional)',
          example: 'Security_Questionnaire_2024.xlsx',
        },
        sourceType: {
          type: 'string',
          enum: ['XLSX', 'CSV'],
          description: 'Source file type (optional)',
          example: 'XLSX',
        },
        questions: {
          type: 'array',
          description: 'Array of questions to process',
          items: {
            type: 'object',
            required: ['rowIndex', 'questionText'],
            properties: {
              rowIndex: {
                type: 'number',
                description: 'Row index in the original file',
                example: 1,
                minimum: 1,
              },
              questionText: {
                type: 'string',
                description: 'The question text',
                example:
                  'What security measures do you have in place for data encryption?',
              },
            },
          },
        },
      },
      example: {
        originalName: 'Security_Questionnaire_2024.xlsx',
        sourceType: 'XLSX',
        questions: [
          {
            rowIndex: 1,
            questionText:
              'What security measures do you have in place for data encryption?',
          },
          {
            rowIndex: 2,
            questionText: 'Do you support multi-factor authentication?',
          },
          {
            rowIndex: 3,
            questionText: 'What compliance certifications do you hold?',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Unique identifier for the created project',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        createdQuestions: {
          type: 'number',
          description: 'Number of questions successfully created',
          example: 25,
          minimum: 0,
        },
      },
      example: {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        createdQuestions: 25,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 400,
        },
        message: {
          type: 'string',
          example: 'Validation failed',
        },
        error: {
          type: 'string',
          example: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 401,
        },
        message: {
          type: 'string',
          example: 'Unauthorized',
        },
      },
    },
  })
  async create(
    @Request() req: any,
    @Body() body: CreateProjectRequestDto,
  ): Promise<CreateProjectResponseDto> {
    const userId = req.user.id;

    return this.projectsService.createFromQuestions(userId, body);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project details with status counts' })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
        },
        counts: {
          type: 'object',
          properties: {
            PENDING: { type: 'number' },
            DRAFTED: { type: 'number' },
            NEEDS_REVIEW: { type: 'number' },
            APPROVED: { type: 'number' },
            REJECTED: { type: 'number' },
            FAILED: { type: 'number' },
            EXPORTED: { type: 'number' },
          },
        },
        totalQuestions: { type: 'number' },
      },
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'PROCESSING',
        counts: {
          PENDING: 5,
          DRAFTED: 10,
          NEEDS_REVIEW: 3,
          APPROVED: 15,
          REJECTED: 0,
          FAILED: 1,
          EXPORTED: 0,
        },
        totalQuestions: 34,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Project does not belong to user',
  })
  async getProjectDetails(
    @Param('id') projectId: string,
    @Request() req: any,
  ): Promise<GetProjectDetailsResponseDto> {
    const userId = req.user.id;

    return this.projectsService.getProjectDetails(userId, projectId);
  }

  @Get(':id/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get project questions with optional status filter',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: QuestionItemStatus,
    description: 'Filter questions by status',
    example: 'NEEDS_REVIEW',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rowIndex: { type: 'number' },
              questionText: { type: 'string' },
              aiAnswer: { type: 'string', nullable: true },
              humanAnswer: { type: 'string', nullable: true },
              confidenceScore: { type: 'number', nullable: true },
              status: {
                type: 'string',
                enum: [
                  'PENDING',
                  'DRAFTED',
                  'NEEDS_REVIEW',
                  'APPROVED',
                  'REJECTED',
                  'FAILED',
                  'EXPORTED',
                ],
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      example: {
        questions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            rowIndex: 1,
            questionText: 'What is your data encryption standard?',
            aiAnswer: 'We use AES-256 encryption for data at rest.',
            humanAnswer: null,
            confidenceScore: 0.85,
            status: 'NEEDS_REVIEW',
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:35:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Project does not belong to user',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid status value',
  })
  async getProjectQuestions(
    @Param('id') projectId: string,
    @Query('status') status?: string,
    @Request() req?: any,
  ): Promise<GetProjectQuestionsResponseDto> {
    const userId = req.user.id;

    // Validate status enum if provided
    let validatedStatus: QuestionItemStatus | undefined;
    if (status) {
      const validStatuses = Object.values(QuestionItemStatus);
      if (!validStatuses.includes(status as QuestionItemStatus)) {
        throw new BadRequestException(
          `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
        );
      }
      validatedStatus = status as QuestionItemStatus;
    }

    return this.projectsService.getProjectQuestions(
      userId,
      projectId,
      validatedStatus,
    );
  }

  @Post(':id/draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start draft generation for project questions' })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft job started successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'DRAFT_STARTED',
        },
      },
      example: {
        status: 'DRAFT_STARTED',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Project does not belong to user',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Project status must be PROCESSING or QUEUED',
  })
  async startDraft(
    @Param('id') projectId: string,
    @Request() req: any,
  ): Promise<StartDraftResponseDto> {
    const userId = req.user.id;

    await this.projectsService.startDraftJob(userId, projectId);

    return { status: 'DRAFT_STARTED' };
  }

  @Get(':id/review-queue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get review queue for a project',
    description: 'Returns all questions with NEEDS_REVIEW status, including citations and confidence scores',
  })
  @ApiParam({
    name: 'id',
    description: 'Project ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Review queue retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rowIndex: { type: 'number' },
              questionText: { type: 'string' },
              aiAnswer: { type: 'string', nullable: true },
              confidenceScore: { type: 'number', nullable: true },
              citations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    snippet: { type: 'string' },
                    score: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      example: {
        questions: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            rowIndex: 1,
            questionText: 'What is your data encryption standard?',
            aiAnswer: 'We use AES-256 encryption for data at rest.',
            confidenceScore: 0.45,
            citations: [
              {
                id: 'citation-1',
                snippet: 'Our security documentation states that we use AES-256 encryption...',
                score: 0.45,
                createdAt: '2024-01-15T10:30:00.000Z',
              },
            ],
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:35:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Project does not belong to user',
  })
  async getReviewQueue(
    @Param('id') projectId: string,
    @Request() req: any,
  ): Promise<ReviewQueueResponseDto> {
    const userId = req.user.id;

    return this.projectsService.getReviewQueue(userId, projectId);
  }
}

@Controller('questions')
export class QuestionsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit review action for a question',
    description: 'Approve, edit and approve, or reject a question that needs review',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiBody({
    description: 'Review action data',
    schema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['APPROVE', 'EDIT_APPROVE', 'REJECT'],
          description: 'Review action to perform',
          example: 'APPROVE',
        },
        humanAnswer: {
          type: 'string',
          description: 'Required for EDIT_APPROVE action. The human-edited answer.',
          example: 'We use AES-256 encryption with key rotation every 90 days.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes for the review action',
          example: 'Updated answer to include key rotation details',
        },
      },
      example: {
        action: 'EDIT_APPROVE',
        humanAnswer: 'We use AES-256 encryption with key rotation every 90 days.',
        notes: 'Updated answer to include key rotation details',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Review action processed successfully',
    schema: {
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['APPROVED', 'REJECTED'],
        },
        action: {
          type: 'string',
          enum: ['APPROVE', 'EDIT_APPROVE', 'REJECT'],
        },
        message: { type: 'string' },
      },
      example: {
        questionId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'APPROVED',
        action: 'EDIT_APPROVE',
        message: 'Question edit_approved successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Question does not belong to user',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid action, question not in NEEDS_REVIEW status, or missing required fields',
  })
  async submitReview(
    @Param('id') questionId: string,
    @Body() body: ReviewActionDto,
    @Request() req: any,
  ): Promise<ReviewActionResponseDto> {
    const userId = req.user.id;

    return this.projectsService.submitReview(
      userId,
      questionId,
      body.action,
      body.humanAnswer,
      body.notes,
    );
  }
}
