export interface ProjectRequirements {
  frontend: number;
  backend: number;
  management: number;
}

export interface ProjectProgress {
  frontend: number;
  backend: number;
  management: number;
}

export interface ProjectRewards {
  baseSalary: number;
  bonusMultiplier: number;
  experienceReward: number;
}

export class Project {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly requiredLevel: number;
  public readonly requirements: ProjectRequirements;
  public readonly rewards: ProjectRewards;
  public readonly currentProgress: ProjectProgress;
  public isCompleted: boolean;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    requiredLevel: number;
    requirements: ProjectRequirements;
    rewards: ProjectRewards;
  }) {
    // Валидация
    this.validateConfig(config);

    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.requiredLevel = config.requiredLevel;
    this.requirements = { ...config.requirements };
    this.rewards = { ...config.rewards };
    this.currentProgress = {
      frontend: 0,
      backend: 0,
      management: 0
    };
    this.isCompleted = false;
  }

  private validateConfig(config: {
    id: string;
    name: string;
    description: string;
    requiredLevel: number;
    requirements: ProjectRequirements;
    rewards: ProjectRewards;
  }): void {
    // Валидация ID
    if (!config.id || config.id.trim().length === 0) {
      throw new Error('Project ID cannot be empty');
    }

    // Валидация имени
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    // Валидация уровня
    if (config.requiredLevel < 1) {
      throw new Error('Project required level must be at least 1');
    }

    // Валидация требований
    if (config.requirements.frontend < 0 || config.requirements.backend < 0 || config.requirements.management < 0) {
      throw new Error('Project requirements cannot be negative');
    }

    // Проверка, что хотя бы одно требование больше 0
    if (config.requirements.frontend === 0 && config.requirements.backend === 0 && config.requirements.management === 0) {
      throw new Error('Project must have at least one non-zero requirement');
    }

    // Валидация наград
    if (config.rewards.baseSalary < 0 || config.rewards.experienceReward < 0) {
      throw new Error('Project base salary and experience reward cannot be negative');
    }

    if (config.rewards.bonusMultiplier < 1) {
      throw new Error('Project bonus multiplier must be at least 1');
    }
  }

  public addProgress(skillType: 'frontend' | 'backend' | 'management', points: number): void {
    if (this.isCompleted) {
      throw new Error('Cannot add progress to completed project');
    }

    if (points < 0) {
      throw new Error('Cannot add negative progress');
    }

    this.currentProgress[skillType] += points;

    // Проверяем завершение проекта
    if (this.isProjectCompleted()) {
      this.isCompleted = true;
    }
  }

  public isProjectCompleted(): boolean {
    return this.currentProgress.frontend >= this.requirements.frontend &&
           this.currentProgress.backend >= this.requirements.backend &&
           this.currentProgress.management >= this.requirements.management;
  }

  public getCompletionPercentage(): number {
    const totalRequired = this.requirements.frontend + this.requirements.backend + this.requirements.management;
    const totalProgress = this.currentProgress.frontend + this.currentProgress.backend + this.currentProgress.management;
    return Math.min(100, (totalProgress / totalRequired) * 100);
  }
}
