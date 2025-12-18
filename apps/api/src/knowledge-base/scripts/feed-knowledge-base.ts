#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBaseService } from '../knowledge-base.service';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface CliArgs {
  userId?: string;
  source?: string;
  chunkSize?: number;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--userId' || arg === '-u') {
      args.userId = argv[++i];
    } else if (arg === '--source' || arg === '-s') {
      args.source = argv[++i];
    } else if (arg === '--chunk-size' || arg === '-c') {
      args.chunkSize = parseInt(argv[++i], 10);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs();

  if (!args.userId) {
    console.error('Error: --userId (-u) is required');
    console.error(
      'Usage: tsx feed-knowledge-base.ts --userId <user-id> [--source <path>] [--chunk-size <size>]',
    );
    process.exit(1);
  }

  const sourcePath =
    args.source ||
    path.join(process.cwd(), '../../SaaS Security Reference Guide.md');
  const chunkSize = args.chunkSize || 384;

  console.log('Starting knowledge base feed...');
  console.log(`User ID: ${args.userId}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Chunk Size: ${chunkSize} tokens`);

  try {
    // Create ConfigService instance
    const configService = new ConfigService({
      env: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        databaseUrl: process.env.DATABASE_URL || '',
      },
    });

    // Create service instance (without PrismaService injection)
    const service = new KnowledgeBaseService(configService);

    // Run the feed process
    const result = await service.feedKnowledgeBase(args.userId, sourcePath, {
      chunkSize,
    });

    console.log('\n✅ Knowledge base feed completed successfully!');
    console.log(`Documents created: ${result.documentsCreated}`);
    console.log(`Total chunks: ${result.totalChunks}`);
    console.log(`Total embeddings: ${result.totalEmbeddings}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
