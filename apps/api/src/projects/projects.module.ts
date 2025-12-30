import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
