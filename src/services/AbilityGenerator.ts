import abilitiesData from '../assets/abilities.json';
import { GameSettings } from '../models/GameSettings';
import { Ability, AbilityTemplate } from '../types/AbilityType';
import { PlayerSpecialization } from '../types/SkillType';

export interface AbilityGenerationConfig {
  count: number;
  specialization: PlayerSpecialization;
  excludeUsed?: boolean;
}

export class AbilityGenerator {
  private abilityTemplates: AbilityTemplate[];

  constructor(private settings: GameSettings) {
    this.abilityTemplates = abilitiesData as AbilityTemplate[];
  }

  /**
   * Генерирует случайные абилки для игрока
   */
  public generateAbilitiesForPlayer(config: AbilityGenerationConfig): Ability[] {
    const { count, specialization, excludeUsed = false } = config;

    // Фильтруем абилки по специализации
    const availableAbilities = this.abilityTemplates.filter(template =>
      template.type === specialization || template.type === 'fullstack'
    );

    if (availableAbilities.length === 0) {
      throw new Error(`No abilities available for specialization: ${specialization}`);
    }

    // Выбираем случайные абилки
    const selectedTemplates = this.selectRandomAbilities(availableAbilities, count);

    // Конвертируем в Ability объекты
    return selectedTemplates.map(template => this.convertTemplateToAbility(template));
  }

  /**
   * Генерирует абилки для игрока согласно настройкам игры
   */
  public generateAbilitiesForSession(specialization: PlayerSpecialization): Ability[] {
    return this.generateAbilitiesForPlayer({
      count: this.settings.abilitySettings.abilitiesPerSession,
      specialization
    });
  }

  /**
   * Проверяет можно ли использовать несколько абилок на одну задачу
   */
  public canUseMultipleAbilitiesPerTask(): boolean {
    return this.settings.abilitySettings.allowMultipleAbilitiesPerTask;
  }

  /**
   * Получает максимальное количество абилок у игрока
   */
  public getMaxAbilitiesPerPlayer(): number {
    return this.settings.abilitySettings.maxAbilitiesPerPlayer;
  }

  /**
   * Получает стоимость абилки в энтузиазме
   */
  public getAbilityCost(baseCost: number = 1): number {
    return Math.ceil(baseCost * this.settings.abilitySettings.abilityCostMultiplier);
  }

  /**
   * Получает количество абилок для восстановления за раунд
   */
  public getAbilityRefreshPerRound(): number {
    return this.settings.abilitySettings.abilityRefreshPerRound;
  }

  /**
   * Получает абилку по ID
   */
  public getAbilityById(id: string): AbilityTemplate | null {
    return this.abilityTemplates.find(template => template.id === id) || null;
  }

  /**
   * Получает все абилки для специализации
   */
  public getAbilitiesForSpecialization(specialization: PlayerSpecialization): AbilityTemplate[] {
    return this.abilityTemplates.filter(template =>
      template.type === specialization || template.type === 'fullstack'
    );
  }

  /**
   * Получает количество доступных абилок для специализации
   */
  public getAvailableAbilitiesCount(specialization: PlayerSpecialization): number {
    return this.getAbilitiesForSpecialization(specialization).length;
  }

  /**
   * Проверяет можно ли использовать абилку для задачи
   */
  public canUseAbilityForTask(ability: Ability, taskSkill: string): boolean {
    return ability.targetSkill === 'any' || ability.targetSkill === taskSkill;
  }

  private selectRandomAbilities(availableAbilities: AbilityTemplate[], count: number): AbilityTemplate[] {
    if (count >= availableAbilities.length) {
      return [...availableAbilities];
    }

    const selected: AbilityTemplate[] = [];
    const available = [...availableAbilities];

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      selected.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }

    return selected;
  }

  private convertTemplateToAbility(template: AbilityTemplate): Ability {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      used: false,
      effect: template.effect,
      value: template.value,
      targetSkill: template.targetSkill
    };
  }
}
