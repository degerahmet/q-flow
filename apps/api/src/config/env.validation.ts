import { plainToClass } from 'class-transformer';
import {
  IsInt,
  IsString,
  Min,
  validateSync,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsInt()
  @Min(1)
  PORT: number;

  @IsString()
  GEMINI_API_KEY: string;

  @IsString()
  @Matches(/^redis:\/\/.+:\d+$/)
  REDIS_URL: string;

  @IsString()
  @Matches(/^postgresql:\/\/.+$/)
  DATABASE_URL: string;

  @IsString()
  @Matches(/^(http:\/\/.+|https:\/\/.+)(,(http:\/\/.+|https:\/\/.+))*$/)
  CORS_ALLOW_ORIGINS: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {enableImplicitConversion: true,});
  const errors = validateSync(validatedConfig, {skipMissingProperties: false,});
  if (errors.length > 0) {
    throw new Error(
      `Config validation error: ${errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ')}`,
    );
  }
  return validatedConfig;
}
