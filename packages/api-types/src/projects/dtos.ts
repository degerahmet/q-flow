import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum QuestionnaireSourceType {
  XLSX = "XLSX",
  CSV = "CSV",
}

export enum QuestionItemStatus {
  PENDING = "PENDING",
  DRAFTED = "DRAFTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  FAILED = "FAILED",
  EXPORTED = "EXPORTED",
}

export enum ProjectStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export class QuestionInputDto {
  @IsInt()
  @Min(1)
  rowIndex!: number;

  @IsString()
  @IsNotEmpty()
  questionText!: string;
}

export class CreateProjectRequestDto {
  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsEnum(QuestionnaireSourceType)
  sourceType?: QuestionnaireSourceType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions!: QuestionInputDto[];
}

export class CreateProjectResponseDto {
  @IsString()
  projectId!: string;

  @IsInt()
  @Min(0)
  createdQuestions!: number;
}

export class QuestionItemDto {
  id!: string;
  rowIndex!: number;
  questionText!: string;
  aiAnswer!: string | null;
  humanAnswer!: string | null;
  confidenceScore!: number | null;
  status!: QuestionItemStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ProjectStatusCountsDto {
  [QuestionItemStatus.PENDING]!: number;
  [QuestionItemStatus.DRAFTED]!: number;
  [QuestionItemStatus.NEEDS_REVIEW]!: number;
  [QuestionItemStatus.APPROVED]!: number;
  [QuestionItemStatus.REJECTED]!: number;
  [QuestionItemStatus.FAILED]!: number;
  [QuestionItemStatus.EXPORTED]!: number;
}

export class GetProjectDetailsResponseDto {
  id!: string;
  status!: ProjectStatus;
  counts!: ProjectStatusCountsDto;
  totalQuestions!: number;
}

export class GetProjectQuestionsResponseDto {
  questions!: QuestionItemDto[];
}

export class StartDraftResponseDto {
  @IsString()
  status!: string;
}

export enum ReviewAction {
  APPROVE = "APPROVE",
  EDIT_APPROVE = "EDIT_APPROVE",
  REJECT = "REJECT",
}

export class CitationDto {
  id!: string;
  snippet!: string;
  score!: number;
  createdAt!: Date;
}

export class ReviewQueueItemDto {
  id!: string;
  rowIndex!: number;
  questionText!: string;
  aiAnswer!: string | null;
  confidenceScore!: number | null;
  citations!: CitationDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class ReviewQueueResponseDto {
  questions!: ReviewQueueItemDto[];
}

export class ReviewActionDto {
  @IsEnum(ReviewAction)
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  humanAnswer?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewActionResponseDto {
  questionId!: string;
  status!: QuestionItemStatus;
  action!: ReviewAction;
  message!: string;
}
