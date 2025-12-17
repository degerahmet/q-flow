import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message to confirm the API is running',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  @Get()
  async health() {
    // Check database connection
    await this.prisma.$queryRaw`SELECT 1`;

    // Check for pgvector extension
    const vector = await this.prisma.$queryRaw<
      Array<{ extname: string }>
    >`SELECT extname FROM pg_extension WHERE extname = 'vector'`;

    return {
      ok: true,
      db: 'up',
      pgvector: vector.length > 0 ? 'enabled' : 'missing',
      ts: new Date().toISOString(),
    };
  }
}
