import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class FeedKnowledgeBaseDto {
  @IsOptional()
  @IsString()
  sourcePath?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(256)
  @Max(512)
  chunkSize?: number;
}
