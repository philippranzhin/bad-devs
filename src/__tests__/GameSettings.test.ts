import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskSolver } from '../services/TaskSolver';

describe('GameSettings', () => {
  describe('default values', () => {
    it('should have correct default values', () => {
      // Arrange & Act
      const settings = new GameSettings();

      // Assert
      expect(settings.rounds).toBe(5);
      expect(settings.startingSkills).toBe(10);
      expect(settings.enthusiasmPoints).toBe(10);
      expect(settings.actionsPerTurn).toBe(5);
      expect(settings.difficultyLevel).toBe(5);
    });
  });

  describe('custom values', () => {
    it('should accept custom configuration', () => {
      // Arrange & Act
      const settings = new GameSettings({
        rounds: 3,
        startingSkills: 15,
        enthusiasmPoints: 20,
        actionsPerTurn: 7,
        difficultyLevel: 8
      });

      // Assert
      expect(settings.rounds).toBe(3);
      expect(settings.startingSkills).toBe(15);
      expect(settings.enthusiasmPoints).toBe(20);
      expect(settings.actionsPerTurn).toBe(7);
      expect(settings.difficultyLevel).toBe(8);
    });
  });

  describe('default skill sets', () => {
    it('should have correct default skill sets for all specializations', () => {
      // Arrange & Act
      const settings = new GameSettings();

      // Assert - Frontend specialist
      const frontendSkills = settings.getDefaultSkillsForSpecialization('frontend');
      expect(frontendSkills.frontend).toBe(4); // больше очков в специализации
      expect(frontendSkills.backend).toBe(1);
      expect(frontendSkills.management).toBe(1);
      expect(frontendSkills.techBase).toBe(2);
      expect(frontendSkills.softSkills).toBe(2);

      // Assert - Backend specialist
      const backendSkills = settings.getDefaultSkillsForSpecialization('backend');
      expect(backendSkills.frontend).toBe(1);
      expect(backendSkills.backend).toBe(4); // больше очков в специализации
      expect(backendSkills.management).toBe(1);
      expect(backendSkills.techBase).toBe(2);
      expect(backendSkills.softSkills).toBe(2);

      // Assert - Management specialist
      const managementSkills = settings.getDefaultSkillsForSpecialization('management');
      expect(managementSkills.frontend).toBe(1);
      expect(managementSkills.backend).toBe(1);
      expect(managementSkills.management).toBe(4); // больше очков в специализации
      expect(managementSkills.techBase).toBe(2);
      expect(managementSkills.softSkills).toBe(2);

      // Assert - Fullstack specialist
      const fullstackSkills = settings.getDefaultSkillsForSpecialization('fullstack');
      expect(fullstackSkills.frontend).toBe(2);
      expect(fullstackSkills.backend).toBe(2);
      expect(fullstackSkills.management).toBe(1);
      expect(fullstackSkills.techBase).toBe(2);
      expect(fullstackSkills.softSkills).toBe(3); // больше софтов у фулстека
    });

    it('should allow custom default skill sets', () => {
      // Arrange & Act
      const settings = new GameSettings({
        defaultSkillSets: {
          frontend: {
            frontend: 6,
            backend: 0,
            management: 0,
            techBase: 3,
            softSkills: 1
          }
        }
      });

      // Assert
      const frontendSkills = settings.getDefaultSkillsForSpecialization('frontend');
      expect(frontendSkills.frontend).toBe(6);
      expect(frontendSkills.backend).toBe(0);
      expect(frontendSkills.management).toBe(0);
      expect(frontendSkills.techBase).toBe(3);
      expect(frontendSkills.softSkills).toBe(1);

      // Other specializations should still have defaults
      const backendSkills = settings.getDefaultSkillsForSpecialization('backend');
      expect(backendSkills.backend).toBe(4); // default value
    });

    it('should return independent copy of skill sets', () => {
      // Arrange
      const settings = new GameSettings();

      // Act
      const skills1 = settings.getDefaultSkillsForSpecialization('frontend');
      const skills2 = settings.getDefaultSkillsForSpecialization('frontend');

      // Modify first copy
      skills1.frontend = 999;

      // Assert - second copy should not be affected
      expect(skills2.frontend).toBe(4);
      expect(skills1.frontend).toBe(999);
    });
  });

  describe('difficulty level impact', () => {
    it('should have different probabilities for different difficulty levels', () => {
      // Arrange
      const easySettings = new GameSettings({ difficultyLevel: 1 });
      const hardSettings = new GameSettings({ difficultyLevel: 9 });

      const easySolver = new TaskSolver(easySettings);
      const hardSolver = new TaskSolver(hardSettings);

      const task = new Task({
        id: 'test-task-1',
        name: 'Test Frontend Task',
        description: 'Test task description',
        requiredSkill: 'frontend',
        complexity: 3,
        deadline: 2,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      });

       const player = new Player({
         name: 'TestPlayer',
         specialization: 'frontend',
         skills: {
           frontend: 1,
           backend: 0,
           management: 0,
           techBase: 0,
           softSkills: 0
         },
         enthusiasm: 10
       });

      // Act
      const easyProbability = easySolver.calculateSuccessProbability(task, player, {
        frontend: 1
      });

      const hardProbability = hardSolver.calculateSuccessProbability(task, player, {
        frontend: 1
      });

      // Assert - легкая сложность должна давать более высокую вероятность
      expect(easyProbability).toBeGreaterThan(hardProbability);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum difficulty level', () => {
      // Arrange & Act
      const settings = new GameSettings({ difficultyLevel: 0 });

      // Assert
      expect(settings.difficultyLevel).toBe(0);
    });

    it('should handle maximum difficulty level', () => {
      // Arrange & Act
      const settings = new GameSettings({ difficultyLevel: 10 });

      // Assert
      expect(settings.difficultyLevel).toBe(10);
    });

    it('should handle partial configuration', () => {
      // Arrange & Act
      const settings = new GameSettings({
        difficultyLevel: 7,
        rounds: 2
        // остальные параметры должны быть по умолчанию
      });

      // Assert
      expect(settings.difficultyLevel).toBe(7);
      expect(settings.rounds).toBe(2);
      expect(settings.startingSkills).toBe(10); // default
      expect(settings.enthusiasmPoints).toBe(10); // default
      expect(settings.actionsPerTurn).toBe(5); // default
    });
  });

  describe('actionsPerTurn validation', () => {
    it('should accept valid actionsPerTurn values', () => {
      // Arrange & Act
      const settings1 = new GameSettings({ actionsPerTurn: 1 });
      const settings2 = new GameSettings({ actionsPerTurn: 5 });
      const settings3 = new GameSettings({ actionsPerTurn: 10 });

      // Assert
      expect(settings1.actionsPerTurn).toBe(1);
      expect(settings2.actionsPerTurn).toBe(5);
      expect(settings3.actionsPerTurn).toBe(10);
    });

    it('should throw error for actionsPerTurn less than 1', () => {
      // Arrange & Act & Assert
      expect(() => {
        new GameSettings({ actionsPerTurn: 0 });
      }).toThrow('Actions per turn must be between 1 and 10, got: 0');

      expect(() => {
        new GameSettings({ actionsPerTurn: -1 });
      }).toThrow('Actions per turn must be between 1 and 10, got: -1');
    });

    it('should throw error for actionsPerTurn greater than 10', () => {
      // Arrange & Act & Assert
      expect(() => {
        new GameSettings({ actionsPerTurn: 11 });
      }).toThrow('Actions per turn must be between 1 and 10, got: 11');

      expect(() => {
        new GameSettings({ actionsPerTurn: 15 });
      }).toThrow('Actions per turn must be between 1 and 10, got: 15');
    });
  });
});
