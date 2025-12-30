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
