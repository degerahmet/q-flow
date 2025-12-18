import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseProcessor } from './knowledge-base.processor';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueueAsync({
      name: 'knowledge-base-feed',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('env.redisUrl') || 'redis://localhost:6379';
        // Parse Redis URL
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379'),
            ...(url.password && { password: url.password }),
            ...(url.username && { username: url.username }),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential' as const,
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeBaseProcessor],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
