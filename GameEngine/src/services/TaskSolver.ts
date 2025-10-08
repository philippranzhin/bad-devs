import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { AbilityService } from './AbilityService';

export interface Investment {
  frontend?: number;
  backend?: number;
  management?: number;
  techBase?: number;
  softSkills?: number;
  enthusiasm?: number;
  abilities?: string[]; // ID использованных абилок
}

export class TaskSolver {
  private abilityService: AbilityService;

  constructor(private settings: GameSettings) {
    this.abilityService = new AbilityService(this.settings);
  }

  calculateSuccessProbability(task: Task, player: Player, investment: Investment): number {
    // Валидация: проверяем соответствие навыков типу задачи
    this.validateSkillMatching(task, investment);

    // Валидация: проверяем, что игрок не вкладывает больше навыков, чем у него есть
    this.validateSkillAvailability(player, investment);

    // Валидация: проверяем, что игрок не вкладывает больше энтузиазма, чем у него есть
    this.validateEnthusiasmAvailability(player, investment);

    // Валидация: проверяем доступность абилок
    this.validateAbilitiesAvailability(player, investment);

    // Применяем эффекты абилок к задаче
    const modifiedTask = this.applyAbilityEffects(task, player, investment);

    // Рассчитываем вероятность успеха
    return this.calculateProbability(modifiedTask, investment);
  }

  private validateSkillMatching(task: Task, investment: Investment): void {
    const taskSkill = task.requiredSkill;

    // Проверяем, что вкладываются только соответствующие навыки
    for (const [skillType, amount] of Object.entries(investment)) {
      if (amount && amount > 0 && skillType !== taskSkill && skillType !== 'techBase' && skillType !== 'softSkills' && skillType !== 'enthusiasm') {
        throw new Error(`Cannot invest ${skillType} skill in ${taskSkill} task`);
      }
    }
  }

  private validateSkillAvailability(player: Player, investment: Investment): void {
    for (const [skillType, amount] of Object.entries(investment)) {
      if (amount && amount > 0 && skillType !== 'enthusiasm') {
        const playerSkillAmount = player.skills[skillType as keyof typeof player.skills];
        if (amount > playerSkillAmount) {
          throw new Error(`Cannot invest more ${skillType} skills than player has`);
        }
      }
    }
  }

  private validateEnthusiasmAvailability(player: Player, investment: Investment): void {
    if (investment.enthusiasm && investment.enthusiasm > player.enthusiasm) {
      throw new Error('Cannot invest more enthusiasm than player has');
    }
  }

  private validateAbilitiesAvailability(player: Player, investment: Investment): void {
    if (!investment.abilities || investment.abilities.length === 0) {
      return;
    }

    // Проверяем можно ли использовать несколько абилок на одну задачу
    if (!this.abilityService.canUseMultipleAbilitiesPerTask() && investment.abilities.length > 1) {
      throw new Error('Multiple abilities per task are not allowed');
    }

    for (const abilityId of investment.abilities) {
      const ability = player.abilities.find(a => a.id === abilityId);
      if (!ability) {
        throw new Error(`Ability ${abilityId} not found`);
      }
      if (ability.used) {
        throw new Error(`Ability ${ability.name} already used`);
      }
    }
  }

  private applyAbilityEffects(task: Task, player: Player, investment: Investment): Task {
    if (!investment.abilities || investment.abilities.length === 0) {
      return task;
    }

    let modifiedTask = task;

    for (const abilityId of investment.abilities) {
      const ability = player.abilities.find(a => a.id === abilityId);
      if (!ability) continue;

      const result = this.abilityService.useAbility(player, abilityId, modifiedTask, []);
      if (result.success && result.modifiedTask) {
        modifiedTask = result.modifiedTask;
      }
    }

    return modifiedTask;
  }

  private calculateProbability(task: Task, investment: Investment): number {
    // Базовая вероятность без навыков зависит от уровня сложности
    const difficultyMultiplier = this.settings.difficultyLevel / 10; // 0.0 - 1.0
    const baseProbability = 0.03 + (0.1 * (1 - difficultyMultiplier)); // от 13% до 3%

    // Получаем вложенные очки по типам
    const skillPoints = investment[task.requiredSkill] || 0;
    const techBasePoints = investment.techBase || 0;
    const softSkillsPoints = investment.softSkills || 0;
    const enthusiasmPoints = investment.enthusiasm || 0;

    // Рассчитываем вероятность на основе правил игры
    let probability = baseProbability;

    // Основной навык дает базовый буст
    if (skillPoints > 0) {
      probability += skillPoints * 0.2; // каждый очко основного навыка дает +20%
    }

    // Тех база дает дополнительный буст
    if (techBasePoints > 0) {
      probability += techBasePoints * 0.15; // каждый очко тех базы дает +15%
    }

    // Софты дают минимальный буст
    if (softSkillsPoints > 0) {
      probability += softSkillsPoints * 0.05; // каждый очко софтов дает +5%
    }

    // Энтузиазм дает значительный буст
    if (enthusiasmPoints > 0) {
      probability += enthusiasmPoints * 0.35; // каждый очко энтузиазма дает +35%
    }

    // Ограничиваем максимальную вероятность
    return Math.min(0.99, probability);
  }

  private getTotalInvestedPoints(investment: Investment): number {
    let total = 0;
    for (const amount of Object.values(investment)) {
      if (amount) {
        total += amount;
      }
    }
    return total;
  }
}
