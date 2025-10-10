import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskSolver } from '../services/TaskSolver';

describe('TaskSolver - Skill Distribution Tests', () => {
  let player: Player;
  let taskSolver: TaskSolver;
  let gameSettings: GameSettings;
  let frontendTask: Task;

  beforeEach(() => {
    gameSettings = new GameSettings();
    taskSolver = new TaskSolver(gameSettings);

    // Создаем игрока с конкретными скиллами
    player = new Player({
      name: 'TestPlayer',
      specialization: 'frontend',
      skills: {
        frontend: 5,    // 5 очков фронтенда
        backend: 1,
        management: 1,
        techBase: 4,    // 4 очка техбазы
        softSkills: 2   // 2 очка софтскиллов
      },
      enthusiasm: 10
    });

    // Создаем задачу фронтенда со сложностью 3
    frontendTask = new Task({
      id: 'frontend-task-1',
      name: 'Frontend Task 1',
      description: 'Test frontend task',
      requiredSkill: 'frontend',
      complexity: 3, // требует 3 очка фронтенда для 100% успеха
      deadline: 2,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });
  });

  describe('Skill Distribution Validation', () => {
    it('should allow distributing all skills across multiple tasks', () => {
      // Создаем 4 одинаковые задачи
      const tasks = [
        frontendTask,
        new Task({ ...frontendTask, id: 'frontend-task-2', name: 'Frontend Task 2' }),
        new Task({ ...frontendTask, id: 'frontend-task-3', name: 'Frontend Task 3' }),
        new Task({ ...frontendTask, id: 'frontend-task-4', name: 'Frontend Task 4' })
      ];

      // Распределяем скиллы между задачами
      const investments = [
        { frontend: 2, techBase: 1, softSkills: 0 }, // Задача 1: 2 фронт + 1 техбаза
        { frontend: 2, techBase: 1, softSkills: 1 }, // Задача 2: 2 фронт + 1 техбаза + 1 софт
        { frontend: 1, techBase: 2, softSkills: 1 }, // Задача 3: 1 фронт + 2 техбазы + 1 софт
        { frontend: 0, techBase: 0, softSkills: 0 }  // Задача 4: без вложений
      ];

      // Проверяем, что все инвестиции валидны
      investments.forEach((investment, index) => {
        expect(() => {
          taskSolver.calculateSuccessProbability(tasks[index], player, investment);
        }).not.toThrow();
      });

      // Проверяем, что общее количество вложенных скиллов не превышает доступные
      const totalFrontendInvested = investments.reduce((sum, inv) => sum + (inv.frontend || 0), 0);
      const totalTechBaseInvested = investments.reduce((sum, inv) => sum + (inv.techBase || 0), 0);
      const totalSoftSkillsInvested = investments.reduce((sum, inv) => sum + (inv.softSkills || 0), 0);

      expect(totalFrontendInvested).toBeLessThanOrEqual(player.skills.frontend);
      expect(totalTechBaseInvested).toBeLessThanOrEqual(player.skills.techBase);
      expect(totalSoftSkillsInvested).toBeLessThanOrEqual(player.skills.softSkills);
    });

    it('should throw error when trying to invest more skills than available', () => {
      // Пытаемся вложить больше фронтенда, чем есть у игрока
      const invalidInvestment = {
        frontend: 6, // у игрока только 5
        techBase: 0,
        softSkills: 0
      };

      expect(() => {
        taskSolver.calculateSuccessProbability(frontendTask, player, invalidInvestment);
      }).toThrow('Cannot invest more frontend skills than player has');
    });

    it('should throw error when trying to invest more techBase than available', () => {
      const invalidInvestment = {
        frontend: 2,
        techBase: 5, // у игрока только 4
        softSkills: 0
      };

      expect(() => {
        taskSolver.calculateSuccessProbability(frontendTask, player, invalidInvestment);
      }).toThrow('Cannot invest more techBase skills than player has');
    });

    it('should throw error when trying to invest more softSkills than available', () => {
      const invalidInvestment = {
        frontend: 2,
        techBase: 1,
        softSkills: 3 // у игрока только 2
      };

      expect(() => {
        taskSolver.calculateSuccessProbability(frontendTask, player, invalidInvestment);
      }).toThrow('Cannot invest more softSkills skills than player has');
    });
  });

  describe('Probability Calculation with New Rules', () => {
    it('should calculate probability based on invested/required skill ratio', () => {
      // Задача требует 3 очка фронтенда (сложность 3)
      // Игрок вкладывает 2 очка фронтенда
      const investment = { frontend: 2, techBase: 0, softSkills: 0 };

      const probability = taskSolver.calculateSuccessProbability(frontendTask, player, investment);

      // Базовая вероятность = 2/3 = 0.67 (67%)
      expect(probability).toBeCloseTo(0.67, 2);
    });

    it('should give 100% probability when investing required amount', () => {
      // Задача требует 3 очка фронтенда
      // Игрок вкладывает 3 очка фронтенда
      const investment = { frontend: 3, techBase: 0, softSkills: 0 };

      const probability = taskSolver.calculateSuccessProbability(frontendTask, player, investment);

      // Базовая вероятность = 3/3 = 1.0 (100%)
      expect(probability).toBeCloseTo(0.99, 2); // ограничено максимумом 99%
    });

    it('should add techBase boost correctly', () => {
      // Задача требует 3 очка фронтенда
      // Игрок вкладывает 1 очко фронтенда + 2 очка техбазы
      const investment = { frontend: 1, techBase: 2, softSkills: 0 };

      const probability = taskSolver.calculateSuccessProbability(frontendTask, player, investment);

      // Базовая вероятность = 1/3 = 0.33
      // + техбаза = 2 * 0.18 = 0.36
      // Итого = 0.33 + 0.36 = 0.69 (69%)
      expect(probability).toBeCloseTo(0.69, 2);
    });

    it('should add softSkills boost correctly', () => {
      // Задача требует 3 очка фронтенда
      // Игрок вкладывает 1 очко фронтенда + 2 очка софтскиллов
      const investment = { frontend: 1, techBase: 0, softSkills: 2 };

      const probability = taskSolver.calculateSuccessProbability(frontendTask, player, investment);

      // Базовая вероятность = 1/3 = 0.33
      // + софтскиллы = 2 * 0.05 = 0.10
      // Итого = 0.33 + 0.10 = 0.43 (43%)
      expect(probability).toBeCloseTo(0.43, 2);
    });

    it('should add enthusiasm boost correctly', () => {
      // Задача требует 3 очка фронтенда
      // Игрок вкладывает 1 очко фронтенда + 1 очко энтузиазма
      const investment = { frontend: 1, techBase: 0, softSkills: 0, enthusiasm: 1 };

      const probability = taskSolver.calculateSuccessProbability(frontendTask, player, investment);

      // Базовая вероятность = 1/3 = 0.33
      // + энтузиазм = 1 * 0.35 = 0.35
      // Итого = 0.33 + 0.35 = 0.68 (68%)
      expect(probability).toBeCloseTo(0.68, 2);
    });
  });

  describe('Realistic Skill Distribution Scenario', () => {
    it('should handle realistic distribution across 4 tasks', () => {
      // Создаем 4 одинаковые задачи фронтенда со сложностью 3
      const tasks = Array.from({ length: 4 }, (_, i) => new Task({
        id: `frontend-task-${i + 1}`,
        name: `Frontend Task ${i + 1}`,
        description: 'Test frontend task',
        requiredSkill: 'frontend',
        complexity: 3,
        deadline: 2,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      }));

      // Реалистичное распределение скиллов
      const investments = [
        { frontend: 2, techBase: 1, softSkills: 0 }, // Задача 1: 2 фронт + 1 техбаза
        { frontend: 2, techBase: 1, softSkills: 1 }, // Задача 2: 2 фронт + 1 техбаза + 1 софт
        { frontend: 1, techBase: 2, softSkills: 1 }, // Задача 3: 1 фронт + 2 техбазы + 1 софт
        { frontend: 0, techBase: 0, softSkills: 0 }  // Задача 4: без вложений (риск)
      ];

      // Проверяем валидность всех инвестиций
      const probabilities = investments.map((investment, index) => {
        expect(() => {
          return taskSolver.calculateSuccessProbability(tasks[index], player, investment);
        }).not.toThrow();

        return taskSolver.calculateSuccessProbability(tasks[index], player, investment);
      });

      // Проверяем, что вероятности разумные
      expect(probabilities[0]).toBeCloseTo(0.67 + 0.18, 2); // 2/3 + 1*0.18 = 85%
      expect(probabilities[1]).toBeCloseTo(0.67 + 0.18 + 0.05, 2); // 2/3 + 1*0.18 + 1*0.05 = 90%
      expect(probabilities[2]).toBeCloseTo(0.33 + 0.36 + 0.05, 2); // 1/3 + 2*0.18 + 1*0.05 = 74%
      expect(probabilities[3]).toBeCloseTo(0, 2); // 0/3 = 0%

      // Проверяем, что общее количество вложенных скиллов не превышает доступные
      const totalFrontendInvested = investments.reduce((sum, inv) => sum + (inv.frontend || 0), 0);
      const totalTechBaseInvested = investments.reduce((sum, inv) => sum + (inv.techBase || 0), 0);
      const totalSoftSkillsInvested = investments.reduce((sum, inv) => sum + (inv.softSkills || 0), 0);

      expect(totalFrontendInvested).toBe(5); // использовали все 5 очков фронтенда
      expect(totalTechBaseInvested).toBe(4); // использовали все 4 очка техбазы
      expect(totalSoftSkillsInvested).toBe(2); // использовали все 2 очка софтскиллов

      console.log('\n=== SKILL DISTRIBUTION TEST RESULTS ===');
      console.log(`Player skills: Frontend=${player.skills.frontend}, TechBase=${player.skills.techBase}, SoftSkills=${player.skills.softSkills}`);
      console.log('Task complexity: 3 (requires 3 frontend points for 100% success)');
      console.log('');

      investments.forEach((investment, index) => {
        const prob = probabilities[index];
        console.log(`Task ${index + 1}:`);
        console.log(`  Investment: Frontend=${investment.frontend || 0}, TechBase=${investment.techBase || 0}, SoftSkills=${investment.softSkills || 0}`);
        console.log(`  Probability: ${(prob * 100).toFixed(1)}%`);
        console.log('');
      });

      console.log(`Total invested: Frontend=${totalFrontendInvested}, TechBase=${totalTechBaseInvested}, SoftSkills=${totalSoftSkillsInvested}`);
    });
  });
});
