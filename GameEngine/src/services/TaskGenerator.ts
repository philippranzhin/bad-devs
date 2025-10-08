import tasksData from '../assets/tasks.json';
import { GameSettings } from '../models/GameSettings';
import { Task } from '../models/Task';
import { SkillType } from '../types/SkillType';

export interface TaskTemplate {
  name: string;
  description: string;
}

export interface TaskGenerationConfig {
  complexityRange?: { min: number; max: number };
  deadlineRange?: { min: number; max: number };
  experienceRange?: { min: number; max: number };
}

export class TaskGenerator {
  private readonly taskTemplates: Record<SkillType, TaskTemplate[]>;

  constructor(private settings: GameSettings) {
    this.taskTemplates = {
      frontend: tasksData.frontend,
      backend: tasksData.backend,
      management: tasksData.management,
      techBase: [], // techBase и softSkills не имеют собственных задач
      softSkills: []
    };
  }

  public generateTasksForRound(
    roundNumber: number,
    playerCount: number,
    config?: TaskGenerationConfig
  ): Task[] {
    const tasksPerPlayer = this.settings.actionsPerTurn;
    const totalTasks = playerCount * tasksPerPlayer;

    const tasks: Task[] = [];

    for (let i = 0; i < totalTasks; i++) {
      const task = this.generateSingleTask(roundNumber, config);
      tasks.push(task);
    }

    return tasks;
  }

  private generateSingleTask(roundNumber: number, config?: TaskGenerationConfig): Task {
    const skillType = this.pickRandomSkillType();
    const template = this.pickRandomTemplate(skillType);
    const complexity = this.generateComplexity(config?.complexityRange);
    const deadline = this.generateDeadline(config?.deadlineRange);
    const experience = this.generateExperience(config?.experienceRange);

    return new Task({
      id: `task-${roundNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      description: template.description,
      requiredSkill: skillType,
      complexity,
      deadline,
      experienceReward: experience,
      contributesToCommonGoal: true,
      commonGoalSkill: skillType
    });
  }

  private pickRandomSkillType(): SkillType {
    const availableSkills: SkillType[] = ['frontend', 'backend', 'management'];
    const randomIndex = Math.floor(Math.random() * availableSkills.length);
    return availableSkills[randomIndex];
  }

  private pickRandomTemplate(skillType: SkillType): TaskTemplate {
    const templates = this.taskTemplates[skillType];
    if (templates.length === 0) {
      throw new Error(`No templates available for skill type: ${skillType}`);
    }

    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  private generateComplexity(range?: { min: number; max: number }): number {
    const min = range?.min ?? 1;
    const max = range?.max ?? 5;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateDeadline(range?: { min: number; max: number }): number {
    const min = range?.min ?? 1;
    const max = range?.max ?? 3;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateExperience(range?: { min: number; max: number }): number {
    const min = range?.min ?? 5;
    const max = range?.max ?? 15;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public getAvailableTemplatesCount(skillType: SkillType): number {
    return this.taskTemplates[skillType].length;
  }

  public getAllTemplates(): Record<SkillType, TaskTemplate[]> {
    return { ...this.taskTemplates };
  }
}
