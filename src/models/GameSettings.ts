
import { PlayerSpecialization, SkillSet } from '../types/SkillType';

export interface DefaultSkillSets {
  frontend: SkillSet;
  backend: SkillSet;
  management: SkillSet;
  fullstack: SkillSet;
}

export interface AbilitySettings {
  maxAbilitiesPerPlayer: number; // Максимальное количество абилок у игрока
  abilitiesPerSession: number; // Сколько абилок дается в начале сессии
  abilityCostMultiplier: number; // Множитель стоимости абилок (в энтузиазме)
  allowMultipleAbilitiesPerTask: boolean; // Можно ли использовать несколько абилок на одну задачу
  abilityRefreshPerRound: number; // Сколько абилок восстанавливается за раунд (0 = не восстанавливаются)
}

export class GameSettings {
  public readonly rounds: number;
  public readonly startingSkills: number;
  public readonly enthusiasmPoints: number;
  public readonly actionsPerTurn: number;
  public readonly difficultyLevel: number; // 0-10
  public readonly defaultSkillSets: DefaultSkillSets;
  public readonly abilitySettings: AbilitySettings;

  constructor(config: {
    rounds?: number;
    startingSkills?: number;
    enthusiasmPoints?: number;
    actionsPerTurn?: number;
    difficultyLevel?: number;
    defaultSkillSets?: Partial<DefaultSkillSets>;
    abilitySettings?: Partial<AbilitySettings>;
  } = {}) {
    this.rounds = config.rounds ?? 5;
    this.startingSkills = config.startingSkills ?? 10;
    this.enthusiasmPoints = config.enthusiasmPoints ?? 10;
    this.actionsPerTurn = config.actionsPerTurn ?? 5;
    this.difficultyLevel = config.difficultyLevel ?? 5;

    this.validateActionsPerTurn(this.actionsPerTurn);

    // Настройки абилок
    this.abilitySettings = {
      maxAbilitiesPerPlayer: config.abilitySettings?.maxAbilitiesPerPlayer ?? 5,
      abilitiesPerSession: config.abilitySettings?.abilitiesPerSession ?? 3,
      abilityCostMultiplier: config.abilitySettings?.abilityCostMultiplier ?? 1.0,
      allowMultipleAbilitiesPerTask: config.abilitySettings?.allowMultipleAbilitiesPerTask ?? true,
      abilityRefreshPerRound: config.abilitySettings?.abilityRefreshPerRound ?? 0
    };

    this.validateAbilitySettings(this.abilitySettings);

    // Дефолтные скиллсеты для каждой специализации
    this.defaultSkillSets = {
      frontend: config.defaultSkillSets?.frontend ?? {
        frontend: 4,
        backend: 1,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      backend: config.defaultSkillSets?.backend ?? {
        frontend: 1,
        backend: 4,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      management: config.defaultSkillSets?.management ?? {
        frontend: 1,
        backend: 1,
        management: 4,
        techBase: 2,
        softSkills: 2
      },
      fullstack: config.defaultSkillSets?.fullstack ?? {
        frontend: 2,
        backend: 2,
        management: 1,
        techBase: 2,
        softSkills: 3
      }
    };
  }

  public getDefaultSkillsForSpecialization(specialization: PlayerSpecialization): SkillSet {
    return { ...this.defaultSkillSets[specialization] };
  }

  private validateActionsPerTurn(actionsPerTurn: number): void {
    if (actionsPerTurn < 1 || actionsPerTurn > 10) {
      throw new Error(`Actions per turn must be between 1 and 10, got: ${actionsPerTurn}`);
    }
  }

  private validateAbilitySettings(abilitySettings: AbilitySettings): void {
    if (abilitySettings.maxAbilitiesPerPlayer < 1 || abilitySettings.maxAbilitiesPerPlayer > 10) {
      throw new Error(`Max abilities per player must be between 1 and 10, got: ${abilitySettings.maxAbilitiesPerPlayer}`);
    }

    if (abilitySettings.abilitiesPerSession < 0 || abilitySettings.abilitiesPerSession > abilitySettings.maxAbilitiesPerPlayer) {
      throw new Error(`Abilities per session must be between 0 and maxAbilitiesPerPlayer (${abilitySettings.maxAbilitiesPerPlayer}), got: ${abilitySettings.abilitiesPerSession}`);
    }

    if (abilitySettings.abilityCostMultiplier < 0 || abilitySettings.abilityCostMultiplier > 5) {
      throw new Error(`Ability cost multiplier must be between 0 and 5, got: ${abilitySettings.abilityCostMultiplier}`);
    }

    if (abilitySettings.abilityRefreshPerRound < 0 || abilitySettings.abilityRefreshPerRound > abilitySettings.maxAbilitiesPerPlayer) {
      throw new Error(`Ability refresh per round must be between 0 and maxAbilitiesPerPlayer (${abilitySettings.maxAbilitiesPerPlayer}), got: ${abilitySettings.abilityRefreshPerRound}`);
    }
  }
}
