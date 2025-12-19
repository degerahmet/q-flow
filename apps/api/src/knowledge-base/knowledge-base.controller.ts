import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  FeedKnowledgeBaseDto,
  PaginatedDocumentsResponseDto,
  GetJobStatusResponseDto,
} from '@qflow/api-types';
import { FeedKnowledgeBaseJob } from './knowledge-base.processor';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(
    @InjectQueue('knowledge-base-feed')
    private readonly knowledgeBaseQueue: Queue<FeedKnowledgeBaseJob>,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  @Post('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Feed the knowledge base' })
  @ApiBody({
    description: 'Knowledge base feed data',
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          example:
            "# SaaS Security Reference Guide\n\n## 1. Authentication & Access Control\n\n- Supported authentication methods: SAML 2.0, OIDC, and password-based login with configurable password policies (min 8 chars, complexity, 90-day expiration).\n- Multi-factor authentication (MFA) is available for all users and can be enforced by organization admins via policy.\n- Role-based access control (RBAC) with built-in roles (Admin, Editor, Viewer) and support for custom roles with granular permissions.\n- Sessions are protected with 30-minute inactivity timeout, max 3 concurrent sessions, and optional device trust for trusted devices.\n- Enterprise features: SCIM 2.0 for automated user provisioning, IP allowlisting, and conditional access policies based on IP, device, and risk level.\n\n***\n\n## 2. Data Security – Encryption & Storage\n\n- Customer data at rest is encrypted using AES‑256 with keys managed by a cloud KMS (Key Management Service); keys are rotated automatically.\n- Data in transit is protected with TLS 1.3 using modern cipher suites (e.g., ECDHE‑RSA‑AES256‑GCM‑SHA384) and HSTS enforcement.\n- Customer data is stored in encrypted databases and object storage; backups are also encrypted at rest with the same standards.\n- Data is stored in AWS regions (e.g., eu‑west‑1, us‑east‑1) and can be restricted to specific regions based on customer requirements.\n\n***\n\n## 3. Data Security – Multi-tenancy & Isolation\n\n- The application uses a multi-tenant architecture where each customer (tenant) has a logically isolated data schema and access controls.\n- Tenant data is separated at the application and database level; cross-tenant access is prevented by strict RBAC and tenant context checks.\n- Customer data cannot be accessed by other tenants or by the provider's support team without explicit, audited access and customer consent.\n- Data segregation is enforced via tenant IDs in all queries and APIs, and tenant-specific encryption keys can be used for additional isolation.\n\n***\n\n## 4. Infrastructure & Network Security\n\n- The application runs on AWS (EC2, RDS, S3) behind a WAF (Web Application Firewall) and DDoS protection (AWS Shield).\n- Network security: VPCs with private subnets, security groups, and NACLs; public-facing components are behind a load balancer and WAF.\n- Servers and containers are hardened according to CIS benchmarks; SSH/RDP access is restricted to jump hosts and monitored.\n- Regular vulnerability scanning and patching: critical OS and dependency patches are applied within 7 days, with zero‑downtime rolling updates.\n\n***\n\n## 5. Compliance & Certifications\n\n- The SaaS platform is compliant with SOC 2 Type II (Security, Availability, Confidentiality) and ISO 27001; reports are available to enterprise customers.\n- GDPR, CCPA, and other major privacy regulations are supported via data residency options, DPA, and privacy‑by‑design practices.\n- For regulated industries: PCI DSS (for payment data) and HIPAA (for PHI) are supported via dedicated environments and BAAs.\n- Independent penetration tests are performed annually by a third‑party firm, and reports are shared under NDA with enterprise customers.\n\n***\n\n## 6. Operations & Risk Management\n\n- Incident response: 24/7 monitoring with SIEM and SOAR; security incidents are detected, triaged, and escalated within 15 minutes.\n- Breach notification: affected customers are notified within 72 hours of a confirmed breach, in line with GDPR and other regulations.\n- Vulnerability management: internal pentests, bug bounty program, and automated scanning; critical issues are patched within 7 days.\n- Change management: all changes go through code review, automated testing, and staged rollouts (canary, blue/green) with rollback capability.\n\n***\n\n## 7. Backup & Disaster Recovery\n\n- Daily encrypted backups of databases and critical data; backups are stored in a separate region and retained for 30 days.\n- RPO (Recovery Point Objective) is 15 minutes for critical services; RTO (Recovery Time Objective) is 1 hour for major incidents.\n- Disaster recovery plan includes failover to a secondary region; DR tests are performed quarterly and documented in runbooks.\n- Customers can export their data via API or UI; data deletion follows a secure wipe process after the retention period.\n\n***\n\n## 8. API & Integration Security\n\n- APIs are secured with OAuth 2.0 (client credentials, authorization code) and API keys; scopes limit access to specific resources.\n- Rate limiting and abuse prevention: per‑client quotas, burst limits, and automated blocking of suspicious traffic patterns.\n- Third‑party integrations run in a sandboxed environment; OAuth scopes are minimized and reviewed during integration onboarding.\n- Webhooks are signed with HMAC and can be restricted to specific IP ranges; integration logs are retained for audit and troubleshooting.\n\n***\n\n## 9. Legal & Contractual\n\n- A standard Data Processing Agreement (DPA) is available and can be signed by customers; it covers GDPR, CCPA, and similar laws.\n- Security‑related SLAs: 99.9% uptime for core services, 1‑hour response time for P1 security incidents, and 24‑hour resolution target.\n- Data residency: customers can choose storage regions (e.g., EU, US, APAC); cross‑border transfers use SCCs or equivalent mechanisms.\n- Sub‑processors (e.g., AWS, SendGrid, Stripe) are listed in a public sub‑processor page; customers can object to new sub‑processors with notice.\n\n***\n\n## 10. Privacy & Data Handling\n\n- Personal data collected: email, name, job title, usage logs, and optional profile data; no sensitive data is stored unless explicitly enabled.\n- Data is processed only for service delivery, support, and security; analytics are aggregated and anonymized where possible.\n- Data retention: active customer data is kept as long as the account is active; after deletion, data is irreversibly removed within 30 days.\n- Data subject rights (access, rectification, deletion, portability) are supported via self‑service tools and support channels.",
        },
        sourcePath: { type: 'string', example: 'path/to/source.md' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Knowledge base feed job queued successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        status: {
          type: 'string',
          example: 'queued',
        },
        message: {
          type: 'string',
          example: 'Knowledge base feed job queued successfully',
        },
      },
      example: {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'queued',
        message: 'Knowledge base feed job queued successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - either text or sourcePath must be provided',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 400,
        },
        message: {
          type: 'string',
          example: 'Either text or sourcePath must be provided',
        },
        error: {
          type: 'string',
          example: 'Bad Request',
        },
      },
    },
  })
  async feedKnowledgeBase(
    @Body() dto: FeedKnowledgeBaseDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    // Validate that either text or sourcePath is provided
    if (!dto.text && !dto.sourcePath) {
      throw new BadRequestException(
        'Either text or sourcePath must be provided',
      );
    }

    // Add job to queue
    const job = await this.knowledgeBaseQueue.add('feed-knowledge-base', {
      userId,
      text: dto.text,
      sourcePath: dto.sourcePath,
      chunkSize: dto.chunkSize || 384,
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Knowledge base feed job queued successfully',
    };
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user documents with embeddings' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of documents per page (1-100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of user documents with embeddings',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              filename: {
                type: 'string',
                example: 'security_policy_auth.md',
              },
              contentHash: {
                type: 'string',
                example: 'a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4',
              },
              uploadDate: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00.000Z',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00.000Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00.000Z',
              },
              embeddings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: '660e8400-e29b-41d4-a716-446655440001',
                    },
                    documentId: {
                      type: 'string',
                      example: '550e8400-e29b-41d4-a716-446655440000',
                    },
                    chunkContent: {
                      type: 'string',
                      example: 'Multi-factor authentication (MFA) is available for all users...',
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2024-01-15T10:30:00.000Z',
                    },
                    updatedAt: {
                      type: 'string',
                      format: 'date-time',
                      example: '2024-01-15T10:30:00.000Z',
                    },
                  },
                },
              },
            },
          },
        },
        total: {
          type: 'number',
          example: 25,
        },
        page: {
          type: 'number',
          example: 1,
        },
        limit: {
          type: 'number',
          example: 10,
        },
      },
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            filename: 'security_policy_auth.md',
            contentHash: 'a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4',
            uploadDate: '2024-01-15T10:30:00.000Z',
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z',
            embeddings: [
              {
                id: '660e8400-e29b-41d4-a716-446655440001',
                documentId: '550e8400-e29b-41d4-a716-446655440000',
                chunkContent: 'Multi-factor authentication (MFA) is available for all users and can be enforced by organization admins via policy.',
                createdAt: '2024-01-15T10:30:00.000Z',
                updatedAt: '2024-01-15T10:30:00.000Z',
              },
            ],
          },
        ],
        total: 25,
        page: 1,
        limit: 10,
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
  async getDocuments(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedDocumentsResponseDto> {
    const userId = req.user.id;

    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.knowledgeBaseService.getUserDocuments(userId, page, limit);
  }

  @Get('job-status/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job status by job ID' })
  @ApiParam({
    name: 'jobId',
    description: 'The ID of the job to get status for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        status: {
          type: 'string',
          enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
          example: 'active',
        },
        progress: {
          type: 'number',
          example: 45,
          description: 'Progress percentage (0-100)',
        },
        result: {
          type: 'object',
          properties: {
            documentsCreated: {
              type: 'number',
              example: 10,
            },
            totalChunks: {
              type: 'number',
              example: 145,
            },
            totalEmbeddings: {
              type: 'number',
              example: 145,
            },
          },
          description: 'Present when status is completed',
        },
        error: {
          type: 'string',
          example: 'Processing failed due to invalid markdown format',
          description: 'Present when status is failed',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00.000Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:35:00.000Z',
        },
      },
      examples: {
        waiting: {
          summary: 'Job waiting to be processed',
          value: {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'waiting',
            progress: 0,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z',
          },
        },
        active: {
          summary: 'Job being processed',
          value: {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'active',
            progress: 45,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:33:00.000Z',
          },
        },
        completed: {
          summary: 'Job completed successfully',
          value: {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'completed',
            progress: 100,
            result: {
              documentsCreated: 10,
              totalChunks: 145,
              totalEmbeddings: 145,
            },
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:35:00.000Z',
          },
        },
        failed: {
          summary: 'Job failed',
          value: {
            jobId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'failed',
            progress: 30,
            error: 'Processing failed due to invalid markdown format',
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:32:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 404,
        },
        message: {
          type: 'string',
          example: 'Job not found',
        },
        error: {
          type: 'string',
          example: 'Not Found',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Job does not belong to user',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 403,
        },
        message: {
          type: 'string',
          example: 'You do not have access to this job',
        },
        error: {
          type: 'string',
          example: 'Forbidden',
        },
      },
    },
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Request() req: any,
  ): Promise<GetJobStatusResponseDto> {
    const userId = req.user.id;

    // Get job from queue
    const job = await this.knowledgeBaseQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify job belongs to the authenticated user
    if (!job.data || job.data.userId !== userId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    // Map BullMQ job state to our response status
    // Note: BullMQ returns 'waiting' (not 'wait'), 'active', 'completed', 'failed', 'delayed'
    // Additional states like 'waiting-children' and 'unknown' fall through to default
    let status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    const jobState = await job.getState();

    switch (jobState) {
      case 'waiting':
        status = 'waiting';
        break;
      case 'active':
        status = 'active';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      case 'delayed':
        status = 'delayed';
        break;
      default:
        // Handle unexpected states (e.g., 'waiting-children', 'unknown') by defaulting to 'waiting'
        status = 'waiting';
    }

    const response: GetJobStatusResponseDto = {
      jobId: job.id!,
      status,
      progress: job.progress as number | undefined,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
      updatedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : job.timestamp
          ? new Date(job.timestamp).toISOString()
          : undefined,
    };

    // Add result if job is completed
    if (status === 'completed' && job.returnvalue) {
      response.result = job.returnvalue;
    }

    // Add error if job failed
    if (status === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    return response;
  }
}
