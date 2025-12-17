import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({
    summary: 'Health check endpoint for Prisma client and pgvector extension.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a simple health check message from the database.',
    schema: {
      type: 'object',
      example: {
        ok: true,
        db: 'up',
        pgvector: 'enabled',
        ts: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @Get()
  async health() {
    // Check database connection
    const dbHealthy = await this.prisma.healthCheck();
    if (!dbHealthy) {
      return {
        ok: false,
        db: 'down',
        message: 'Database connection failed after 15 seconds timeout.',
        ts: new Date().toISOString(),
      };
    }

    // Check for pgvector extension
    const vector = await this.prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;

    return {
      ok: true,
      db: 'up',
      pgvector: vector.length > 0 ? 'enabled' : 'missing',
      ts: new Date().toISOString(),
    };
  }
}
