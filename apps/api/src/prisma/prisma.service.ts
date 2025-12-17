import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@qflow/db';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async dbName(): Promise<string> {
    await this.$connect();
    const result = await this.$queryRaw<{ datname: string }[]>`
      SELECT current_database() AS datname;
    `;
    return result[0].datname;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await Promise.race([
        this.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 15000),
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
