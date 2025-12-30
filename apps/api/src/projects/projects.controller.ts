import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import {
  CreateProjectRequestDto,
  CreateProjectResponseDto,
} from '@qflow/api-types';
import { ProjectsService } from './projects.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new project from questions' })
  async create(
    @Request() req: any,
    @Body() body: CreateProjectRequestDto,
  ): Promise<CreateProjectResponseDto> {
    const userId = req.user.id;

    return this.projectsService.createFromQuestions(userId, body);
  }
}
