import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProjectsController, QuestionsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DraftProcessor } from './draft.processor';
import { DraftService } from './draft.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
    BullModule.registerQueueAsync({
      name: 'draft-questions',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('env.redisUrl') || 'redis://localhost:6379';
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
  controllers: [ProjectsController, QuestionsController],
  providers: [ProjectsService, DraftService, DraftProcessor],
  exports: [ProjectsService],
})
export class ProjectsModule {}
