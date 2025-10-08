import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { Ability } from '../types/AbilityType';
import { SkillType } from '../types/SkillType';

export interface AbilityResult {
  success: boolean;
  modifiedTask?: Task;
  bonusEnthusiasm?: number;
  bonusExperience?: number;
  message: string;
}

export class AbilityService {
  constructor(private settings: GameSettings) {}

  /**
   * Использует абилку игрока
   */
  public useAbility(
    player: Player,
    abilityId: string,
    task: Task,
    allPlayers: Player[]
  ): AbilityResult {
    const ability = player.abilities.find(a => a.id === abilityId);

    if (!ability) {
      return {
        success: false,
        message: `Ability ${abilityId} not found`
      };
    }

    if (ability.used) {
      return {
        success: false,
        message: `Ability ${ability.name} already used`
      };
    }

    // Проверяем совместимость абилки с задачей
    if (!this.canUseAbilityForTask(ability, task)) {
      return {
        success: false,
        message: `Ability ${ability.name} cannot be used for ${task.requiredSkill} tasks`
      };
    }

    // Применяем эффект абилки
    const result = this.applyAbilityEffect(ability, task, allPlayers);

    if (result.success) {
      // Помечаем абилку как использованную
      ability.used = true;
    }

    return result;
  }

  /**
   * Проверяет можно ли использовать несколько абилок на одну задачу
   */
  public canUseMultipleAbilitiesPerTask(): boolean {
    return this.settings.abilitySettings.allowMultipleAbilitiesPerTask;
  }

  /**
   * Получает стоимость абилки в энтузиазме
   */
  public getAbilityCost(baseCost: number = 1): number {
    return Math.ceil(baseCost * this.settings.abilitySettings.abilityCostMultiplier);
  }

  /**
   * Проверяет можно ли использовать абилку для задачи
   */
  public canUseAbilityForTask(ability: Ability, task: Task): boolean {
    return ability.targetSkill === 'any' || ability.targetSkill === task.requiredSkill;
  }

  /**
   * Получает доступные абилки для задачи
   */
  public getAvailableAbilitiesForTask(player: Player, task: Task): Ability[] {
    return player.abilities.filter(ability =>
      !ability.used && this.canUseAbilityForTask(ability, task)
    );
  }

  /**
   * Проверяет есть ли у игрока неиспользованные абилки
   */
  public hasAvailableAbilities(player: Player): boolean {
    return player.abilities.some(ability => !ability.used);
  }

  /**
   * Получает количество неиспользованных абилок
   */
  public getAvailableAbilitiesCount(player: Player): number {
    return player.abilities.filter(ability => !ability.used).length;
  }

  private applyAbilityEffect(
    ability: Ability,
    task: Task,
    allPlayers: Player[]
  ): AbilityResult {
    switch (ability.effect) {
      case 'reduce_complexity':
        return this.reduceComplexity(ability, task);

      case 'increase_complexity':
        return this.increaseComplexity(ability, task);

      case 'extend_deadline':
        return this.extendDeadline(ability, task);

      case 'dump_task':
        return this.dumpTask(ability, task);

      case 'bonus_enthusiasm':
        return this.bonusEnthusiasm(ability, task);

      case 'free_enthusiasm':
        return this.freeEnthusiasm(ability, task);

      case 'double_experience':
        return this.doubleExperience(ability, task);

      case 'skill_conversion':
        return this.skillConversion(ability, task);

      case 'skill_swap':
        return this.skillSwap(ability, task);

      case 'borrow_skill':
        return this.borrowSkill(ability, task, allPlayers);

      default:
        return {
          success: false,
          message: `Unknown ability effect: ${ability.effect}`
        };
    }
  }

  private reduceComplexity(ability: Ability, task: Task): AbilityResult {
    const newComplexity = Math.max(1, task.complexity - ability.value);
    const modifiedTask = new Task({
      ...task,
      complexity: newComplexity
    });

    return {
      success: true,
      modifiedTask,
      message: `Complexity reduced by ${ability.value}`
    };
  }

  private increaseComplexity(ability: Ability, task: Task): AbilityResult {
    const newComplexity = task.complexity + ability.value;
    const modifiedTask = new Task({
      ...task,
      complexity: newComplexity
    });

    return {
      success: true,
      modifiedTask,
      message: `Complexity increased by ${ability.value} for more experience`
    };
  }

  private extendDeadline(ability: Ability, task: Task): AbilityResult {
    const newDeadline = task.deadline + ability.value;
    const modifiedTask = new Task({
      ...task,
      deadline: newDeadline
    });

    return {
      success: true,
      modifiedTask,
      message: `Deadline extended by ${ability.value}`
    };
  }

  private dumpTask(ability: Ability, task: Task): AbilityResult {
    // Шанс успеха зависит от soft skills игрока
    const success = Math.random() < ability.value;

    return {
      success,
      message: success ? 'Task successfully dumped!' : 'Failed to dump task'
    };
  }

  private bonusEnthusiasm(ability: Ability, task: Task): AbilityResult {
    return {
      success: true,
      bonusEnthusiasm: ability.value,
      message: `Gained ${ability.value} bonus enthusiasm`
    };
  }

  private freeEnthusiasm(ability: Ability, task: Task): AbilityResult {
    return {
      success: true,
      bonusEnthusiasm: -1, // Специальное значение для "бесплатного" энтузиазма
      message: 'Task can be solved without spending enthusiasm'
    };
  }

  private doubleExperience(ability: Ability, task: Task): AbilityResult {
    return {
      success: true,
      bonusExperience: ability.value,
      message: `Experience reward doubled (x${ability.value})`
    };
  }

  private skillConversion(ability: Ability, task: Task): AbilityResult {
    // Конвертация techBase в целевой навык
    return {
      success: true,
      message: `Can use techBase as ${ability.targetSkill} skill`
    };
  }

  private skillSwap(ability: Ability, task: Task): AbilityResult {
    // Меняем тип навыка задачи
    const newSkill = ability.targetSkill === 'any' ? 'frontend' : ability.targetSkill as SkillType;
    const modifiedTask = new Task({
      ...task,
      requiredSkill: newSkill
    });

    return {
      success: true,
      modifiedTask,
      message: `Task skill changed to ${newSkill}`
    };
  }

  private borrowSkill(ability: Ability, task: Task, allPlayers: Player[]): AbilityResult {
    // Находим игрока с наибольшим навыком для задачи
    const bestPlayer = allPlayers
      .filter(p => p.name !== task.id) // Исключаем текущего игрока
      .reduce((best, current) => {
        const currentSkill = current.skills[task.requiredSkill];
        const bestSkill = best.skills[task.requiredSkill];
        return currentSkill > bestSkill ? current : best;
      });

    return {
      success: true,
      message: `Borrowed ${ability.value} ${task.requiredSkill} skill from ${bestPlayer.name}`
    };
  }
}
