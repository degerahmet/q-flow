import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ConfigModule } from '@nestjs/config';
import envConfig from './config/env.config';
import { validate } from './config/env.validation';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    KnowledgeBaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
