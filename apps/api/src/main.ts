import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Q-Flow API')
    .setDescription(
      'AI-Powered Automation Agent for B2B Security Questionnaires and RFPs. This API provides endpoints for managing knowledge base documents, processing questionnaires, and generating AI-powered answers using RAG (Retrieval-Augmented Generation) architecture.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
