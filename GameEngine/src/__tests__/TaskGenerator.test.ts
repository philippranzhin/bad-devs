import { GameSettings } from '../models/GameSettings';
import { TaskGenerator } from '../services/TaskGenerator';

describe('TaskGenerator', () => {
  let settings: GameSettings;
  let taskGenerator: TaskGenerator;

  beforeEach(() => {
    settings = new GameSettings({
      actionsPerTurn: 5,
      difficultyLevel: 5
    });
    taskGenerator = new TaskGenerator(settings);
  });

  describe('generation', () => {
    it('should generate correct number of tasks for round', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 3;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      expect(tasks).toHaveLength(15); // 3 players × 5 actions per turn
    });

    it('should generate tasks with unique IDs', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 2;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      const ids = tasks.map(task => task.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should generate tasks with valid properties', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 1;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      tasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.name).toBeDefined();
        expect(task.description).toBeDefined();
        expect(['frontend', 'backend', 'management']).toContain(task.requiredSkill);
        expect(task.complexity).toBeGreaterThanOrEqual(1);
        expect(task.complexity).toBeLessThanOrEqual(5);
        expect(task.deadline).toBeGreaterThanOrEqual(1);
        expect(task.deadline).toBeLessThanOrEqual(3);
        expect(task.experienceReward).toBeGreaterThanOrEqual(5);
        expect(task.experienceReward).toBeLessThanOrEqual(15);
        expect(task.contributesToCommonGoal).toBe(true);
        expect(task.commonGoalSkill).toBe(task.requiredSkill);
      });
    });

    it('should use custom configuration when provided', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 1;
      const config = {
        complexityRange: { min: 3, max: 3 },
        deadlineRange: { min: 2, max: 2 },
        experienceRange: { min: 10, max: 10 }
      };

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined, config);

      // Assert
      tasks.forEach(task => {
        expect(task.complexity).toBe(3);
        expect(task.deadline).toBe(2);
        expect(task.experienceReward).toBe(10);
      });
    });
  });

  describe('skill distribution', () => {
    it('should generate tasks for different skill types', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 10; // Больше задач для лучшей статистики

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      const skillTypes = tasks.map(task => task.requiredSkill);
      const uniqueSkills = new Set(skillTypes);
      expect(uniqueSkills.size).toBeGreaterThan(1); // Должны быть разные навыки
    });

    it('should not generate tasks for techBase and softSkills', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 20; // Много задач для проверки

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      tasks.forEach(task => {
        expect(['techBase', 'softSkills']).not.toContain(task.requiredSkill);
      });
    });
  });

  describe('templates', () => {
    it('should have templates for all skill types', () => {
      // Act & Assert
      expect(taskGenerator.getAvailableTemplatesCount('frontend')).toBeGreaterThan(0);
      expect(taskGenerator.getAvailableTemplatesCount('backend')).toBeGreaterThan(0);
      expect(taskGenerator.getAvailableTemplatesCount('management')).toBeGreaterThan(0);
      expect(taskGenerator.getAvailableTemplatesCount('techBase')).toBe(0);
      expect(taskGenerator.getAvailableTemplatesCount('softSkills')).toBe(0);
    });

    it('should return all templates', () => {
      // Act
      const allTemplates = taskGenerator.getAllTemplates();

      // Assert
      expect(allTemplates.frontend.length).toBeGreaterThan(0);
      expect(allTemplates.backend.length).toBeGreaterThan(0);
      expect(allTemplates.management.length).toBeGreaterThan(0);
      expect(allTemplates.techBase.length).toBe(0);
      expect(allTemplates.softSkills.length).toBe(0);
    });

    it('should generate tasks with real names and descriptions', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 5;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      tasks.forEach(task => {
        expect(task.name.length).toBeGreaterThan(0);
        expect(task.description.length).toBeGreaterThan(0);
        expect(task.name).not.toBe('undefined');
        expect(task.description).not.toBe('undefined');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero players', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 0;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      expect(tasks).toHaveLength(0);
    });

    it('should handle single player', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 1;

      // Act
      const tasks = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      expect(tasks).toHaveLength(5); // 1 player × 5 actions per turn
    });

    it('should handle different round numbers', () => {
      // Arrange
      const playerCount = 1;

      // Act
      const tasks1 = taskGenerator.generateTasksForRound(1, playerCount, undefined);
      const tasks2 = taskGenerator.generateTasksForRound(5, playerCount, undefined);

      // Assert
      expect(tasks1).toHaveLength(5);
      expect(tasks2).toHaveLength(5);

      // IDs должны быть разными
      const ids1 = tasks1.map(t => t.id);
      const ids2 = tasks2.map(t => t.id);
      const allIds = [...ids1, ...ids2];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  describe('randomness', () => {
    it('should generate different tasks on multiple calls', () => {
      // Arrange
      const roundNumber = 1;
      const playerCount = 1;

      // Act
      const tasks1 = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);
      const tasks2 = taskGenerator.generateTasksForRound(roundNumber, playerCount, undefined);

      // Assert
      // Хотя бы одна задача должна отличаться (название, описание или параметры)
      let hasDifference = false;
      for (let i = 0; i < Math.min(tasks1.length, tasks2.length); i++) {
        const task1 = tasks1[i];
        const task2 = tasks2[i];

        if (task1.name !== task2.name ||
            task1.description !== task2.description ||
            task1.complexity !== task2.complexity ||
            task1.deadline !== task2.deadline ||
            task1.experienceReward !== task2.experienceReward) {
          hasDifference = true;
          break;
        }
      }

      expect(hasDifference).toBe(true);
    });
  });
});
