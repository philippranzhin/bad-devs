import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { AbilityGenerator } from '../services/AbilityGenerator';
import { AbilityService } from '../services/AbilityService';
import { TaskSolver } from '../services/TaskSolver';

describe('Ability Configuration', () => {
  describe('GameSettings with Ability Settings', () => {
    it('should create default ability settings', () => {
      const settings = new GameSettings();

      expect(settings.abilitySettings.maxAbilitiesPerPlayer).toBe(5);
      expect(settings.abilitySettings.abilitiesPerSession).toBe(3);
      expect(settings.abilitySettings.abilityCostMultiplier).toBe(1.0);
      expect(settings.abilitySettings.allowMultipleAbilitiesPerTask).toBe(true);
      expect(settings.abilitySettings.abilityRefreshPerRound).toBe(0);
    });

    it('should create custom ability settings', () => {
      const settings = new GameSettings({
        abilitySettings: {
          maxAbilitiesPerPlayer: 7,
          abilitiesPerSession: 4,
          abilityCostMultiplier: 1.5,
          allowMultipleAbilitiesPerTask: false,
          abilityRefreshPerRound: 1
        }
      });

      expect(settings.abilitySettings.maxAbilitiesPerPlayer).toBe(7);
      expect(settings.abilitySettings.abilitiesPerSession).toBe(4);
      expect(settings.abilitySettings.abilityCostMultiplier).toBe(1.5);
      expect(settings.abilitySettings.allowMultipleAbilitiesPerTask).toBe(false);
      expect(settings.abilitySettings.abilityRefreshPerRound).toBe(1);
    });

    it('should validate ability settings', () => {
      expect(() => {
        new GameSettings({
          abilitySettings: {
            maxAbilitiesPerPlayer: 0 // Invalid
          }
        });
      }).toThrow('Max abilities per player must be between 1 and 10');

      expect(() => {
        new GameSettings({
          abilitySettings: {
            abilitiesPerSession: 6, // More than maxAbilitiesPerPlayer (5)
            maxAbilitiesPerPlayer: 5
          }
        });
      }).toThrow('Abilities per session must be between 0 and maxAbilitiesPerPlayer');

      expect(() => {
        new GameSettings({
          abilitySettings: {
            abilityCostMultiplier: -1 // Invalid
          }
        });
      }).toThrow('Ability cost multiplier must be between 0 and 5');

      expect(() => {
        new GameSettings({
          abilitySettings: {
            abilityRefreshPerRound: 6, // More than maxAbilitiesPerPlayer (5)
            maxAbilitiesPerPlayer: 5
          }
        });
      }).toThrow('Ability refresh per round must be between 0 and maxAbilitiesPerPlayer');
    });
  });

  describe('AbilityGenerator with Settings', () => {
    let settings: GameSettings;
    let abilityGenerator: AbilityGenerator;

    beforeEach(() => {
      settings = new GameSettings({
        abilitySettings: {
          maxAbilitiesPerPlayer: 6,
          abilitiesPerSession: 4,
          abilityCostMultiplier: 1.2,
          allowMultipleAbilitiesPerTask: false,
          abilityRefreshPerRound: 1
        }
      });
      abilityGenerator = new AbilityGenerator(settings);
    });

    it('should generate abilities according to session settings', () => {
      const abilities = abilityGenerator.generateAbilitiesForSession('frontend');

      expect(abilities).toHaveLength(4); // abilitiesPerSession
    });

    it('should return correct max abilities per player', () => {
      expect(abilityGenerator.getMaxAbilitiesPerPlayer()).toBe(6);
    });

    it('should calculate ability cost correctly', () => {
      expect(abilityGenerator.getAbilityCost(1)).toBe(2); // Math.ceil(1 * 1.2)
      expect(abilityGenerator.getAbilityCost(2)).toBe(3); // Math.ceil(2 * 1.2)
    });

    it('should return ability refresh per round', () => {
      expect(abilityGenerator.getAbilityRefreshPerRound()).toBe(1);
    });
  });

  describe('AbilityService with Settings', () => {
    let settings: GameSettings;
    let abilityService: AbilityService;

    beforeEach(() => {
      settings = new GameSettings({
        abilitySettings: {
          allowMultipleAbilitiesPerTask: false,
          abilityCostMultiplier: 1.5
        }
      });
      abilityService = new AbilityService(settings);
    });

    it('should respect multiple abilities per task setting', () => {
      expect(abilityService.canUseMultipleAbilitiesPerTask()).toBe(false);
    });

    it('should calculate ability cost correctly', () => {
      expect(abilityService.getAbilityCost(1)).toBe(2); // Math.ceil(1 * 1.5)
      expect(abilityService.getAbilityCost(3)).toBe(5); // Math.ceil(3 * 1.5)
    });
  });

  describe('TaskSolver with Ability Restrictions', () => {
    let settings: GameSettings;
    let taskSolver: TaskSolver;
    let player: Player;
    let task: Task;

    beforeEach(() => {
      settings = new GameSettings({
        abilitySettings: {
          allowMultipleAbilitiesPerTask: false
        }
      });
      taskSolver = new TaskSolver(settings);

      player = new Player({
        name: 'TestPlayer',
        specialization: 'frontend',
        skills: {
          frontend: 3,
          backend: 1,
          management: 1,
          techBase: 2,
          softSkills: 2
        },
        enthusiasm: 5,
        abilities: [
          {
            id: 'ability1',
            name: 'Ability 1',
            description: 'Test ability 1',
            used: false,
            effect: 'reduce_complexity',
            value: 1,
            targetSkill: 'frontend'
          },
          {
            id: 'ability2',
            name: 'Ability 2',
            description: 'Test ability 2',
            used: false,
            effect: 'bonus_enthusiasm',
            value: 2,
            targetSkill: 'frontend'
          }
        ]
      });

      task = new Task({
        id: 'task1',
        name: 'Frontend Task',
        description: 'Test frontend task',
        requiredSkill: 'frontend',
        complexity: 2,
        deadline: 1,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      });
    });

    it('should allow single ability usage', () => {
      expect(() => {
        taskSolver.calculateSuccessProbability(task, player, {
          frontend: 2,
          abilities: ['ability1']
        });
      }).not.toThrow();
    });

    it('should reject multiple abilities when not allowed', () => {
      expect(() => {
        taskSolver.calculateSuccessProbability(task, player, {
          frontend: 2,
          abilities: ['ability1', 'ability2']
        });
      }).toThrow('Multiple abilities per task are not allowed');
    });

    it('should allow multiple abilities when setting is enabled', () => {
      const allowMultipleSettings = new GameSettings({
        abilitySettings: {
          allowMultipleAbilitiesPerTask: true
        }
      });
      const allowMultipleSolver = new TaskSolver(allowMultipleSettings);

      expect(() => {
        allowMultipleSolver.calculateSuccessProbability(task, player, {
          frontend: 2,
          abilities: ['ability1', 'ability2']
        });
      }).not.toThrow();
    });
  });
});
