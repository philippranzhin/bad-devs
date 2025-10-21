import tasksData from '../assets/tasks.json';
import { GameSettings } from '../models/GameSettings';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
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
    project?: Project,
    config?: TaskGenerationConfig
  ): Task[] {
    // Если проект завершен, не генерируем задачи
    if (project && project.isCompleted) {
      return [];
    }

    const tasksPerPlayer = this.settings.actionsPerTurn;
    const totalTasks = playerCount * tasksPerPlayer;

    const tasks: Task[] = [];

    for (let i = 0; i < totalTasks; i++) {
      const task = this.generateSingleTask(roundNumber, project, config);
      tasks.push(task);
    }

    return tasks;
  }

  private generateSingleTask(roundNumber: number, project?: Project, config?: TaskGenerationConfig): Task {
    const skillType = this.pickRandomSkillType(project);
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

  private pickRandomSkillType(project?: Project): SkillType {
    const allSkills: SkillType[] = ['frontend', 'backend', 'management'];
    
    // Если проект не передан, выбираем случайно из всех навыков
    if (!project) {
      const randomIndex = Math.floor(Math.random() * allSkills.length);
      return allSkills[randomIndex];
    }

    // Определяем незавершенные направления
    const incompleteSkills: SkillType[] = [];
    
    for (const skill of allSkills) {
      const progress = project.currentProgress[skill as keyof typeof project.currentProgress];
      const requirement = project.requirements[skill as keyof typeof project.requirements];
      
      if (progress < requirement) {
        incompleteSkills.push(skill);
      }
    }

    // Если все направления завершены, возвращаем случайный (не должно происходить)
    if (incompleteSkills.length === 0) {
      const randomIndex = Math.floor(Math.random() * allSkills.length);
      return allSkills[randomIndex];
    }

    // Приоритизируем наименее завершенные направления
    const weightedSkills: SkillType[] = [];
    
    for (const skill of incompleteSkills) {
      const progress = project.currentProgress[skill as keyof typeof project.currentProgress];
      const requirement = project.requirements[skill as keyof typeof project.requirements];
      const completionRatio = progress / requirement;
      
      // Чем меньше завершено, тем больше вес
      const weight = Math.max(1, Math.floor((1 - completionRatio) * 10));
      
      for (let i = 0; i < weight; i++) {
        weightedSkills.push(skill);
      }
    }

    // Выбираем случайно из взвешенного списка
    const randomIndex = Math.floor(Math.random() * weightedSkills.length);
    return weightedSkills[randomIndex];
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
