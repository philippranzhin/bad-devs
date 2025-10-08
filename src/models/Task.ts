import { SkillType } from '../types/SkillType';

export class Task {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly requiredSkill: SkillType;
  public readonly complexity: number;
  public readonly deadline: number;
  public readonly experienceReward: number;
  public readonly contributesToCommonGoal: boolean;
  public readonly commonGoalSkill?: SkillType;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    requiredSkill: SkillType;
    complexity: number;
    deadline: number;
    experienceReward: number;
    contributesToCommonGoal: boolean;
    commonGoalSkill?: SkillType;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.requiredSkill = config.requiredSkill;
    this.complexity = config.complexity;
    this.deadline = config.deadline;
    this.experienceReward = config.experienceReward;
    this.contributesToCommonGoal = config.contributesToCommonGoal;
    this.commonGoalSkill = config.commonGoalSkill;
  }
}
