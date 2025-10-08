import { PlayerSpecialization, SkillSet } from '../types/SkillType';
import { Ability } from '../types/AbilityType';

export class Player {
  public readonly name: string;
  public readonly specialization: PlayerSpecialization;
  public readonly skills: SkillSet;
  public readonly enthusiasm: number;
  public readonly level: number;
  public readonly experience: number;
  public readonly money: number;
  public readonly abilities: Ability[];

  constructor(config: {
    name: string;
    specialization: PlayerSpecialization;
    skills: SkillSet;
    enthusiasm: number;
    level?: number;
    experience?: number;
    money?: number;
    abilities?: Ability[];
  }) {
    // Валидация имени
    this.validateName(config.name);

    this.name = config.name;
    this.specialization = config.specialization;

    // Валидация навыков
    this.validateSkills(config.skills);

    // Валидация энтузиазма
    this.validateEnthusiasm(config.enthusiasm);

    this.skills = { ...config.skills };
    this.enthusiasm = config.enthusiasm;
    this.level = config.level ?? 1;
    this.experience = config.experience ?? 0;
    this.money = config.money ?? 0;
    this.abilities = config.abilities ?? [];
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }
  }

  private validateSkills(skills: SkillSet): void {
    for (const [skillName, value] of Object.entries(skills)) {
      if (value < 0) {
        throw new Error(`Skill ${skillName} cannot be negative: ${value}`);
      }
    }
  }

  public getTotalExperience(): number {
    // Сумма всех навыков + базовый опыт
    const skillsSum = Object.values(this.skills).reduce((sum, skill) => sum + skill, 0);
    return this.experience + skillsSum;
  }

  public getLevel(): number {
    // Простая формула: каждые 10 очков общего опыта = +1 уровень
    const totalExp = this.getTotalExperience();
    return Math.floor(totalExp / 10) + 1;
  }

  private validateEnthusiasm(enthusiasm: number): void {
    if (enthusiasm < 0) {
      throw new Error(`Enthusiasm cannot be negative: ${enthusiasm}`);
    }
  }
}
