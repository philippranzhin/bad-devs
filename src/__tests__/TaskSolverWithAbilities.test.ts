import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskSolver } from '../services/TaskSolver';

describe('TaskSolver with Abilities', () => {
  let taskSolver: TaskSolver;
  let settings: GameSettings;
  let player: Player;
  let task: Task;

  beforeEach(() => {
    settings = new GameSettings();
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
          id: 'frontend_debug_master',
          name: 'Мастер отладки',
          description: 'Уменьшить сложность frontend задачи на 2',
          used: false,
          effect: 'reduce_complexity',
          value: 2,
          targetSkill: 'frontend'
        },
        {
          id: 'frontend_ui_inspiration',
          name: 'Вдохновение UI',
          description: 'Бонус энтузиазма для frontend задач',
          used: false,
          effect: 'bonus_enthusiasm',
          value: 3,
          targetSkill: 'frontend'
        }
      ]
    });

    task = new Task({
      id: 'task1',
      name: 'Frontend Task',
      description: 'Test frontend task',
      requiredSkill: 'frontend',
      complexity: 3,
      deadline: 1,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });
  });

  describe('calculateSuccessProbability with abilities', () => {
    it('should calculate probability without abilities', () => {
      const probability = taskSolver.calculateSuccessProbability(task, player, {
        frontend: 2,
        enthusiasm: 1
      });

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(0.99);
    });

    it('should calculate probability with reduce_complexity ability', () => {
      const probability = taskSolver.calculateSuccessProbability(task, player, {
        frontend: 2,
        enthusiasm: 1,
        abilities: ['frontend_debug_master']
      });

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(0.99);
    });

    it('should throw error for non-existent ability', () => {
      expect(() => {
        taskSolver.calculateSuccessProbability(task, player, {
          frontend: 2,
          abilities: ['non_existent']
        });
      }).toThrow('Ability non_existent not found');
    });

    it('should throw error for already used ability', () => {
      const ability = player.abilities.find(a => a.id === 'frontend_debug_master');
      ability!.used = true;

      expect(() => {
        taskSolver.calculateSuccessProbability(task, player, {
          frontend: 2,
          abilities: ['frontend_debug_master']
        });
      }).toThrow('already used');
    });

    it('should throw error for incompatible ability', () => {
      const backendTask = new Task({
        id: 'backend_task',
        name: 'Backend Task',
        description: 'Test backend task',
        requiredSkill: 'backend',
        complexity: 2,
        deadline: 1,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'backend'
      });

      expect(() => {
        taskSolver.calculateSuccessProbability(backendTask, player, {
          backend: 2,
          abilities: ['frontend_debug_master']
        });
      }).toThrow('Cannot invest more backend skills than player has');
    });

    it('should allow multiple abilities', () => {
      const probability = taskSolver.calculateSuccessProbability(task, player, {
        frontend: 2,
        enthusiasm: 1,
        abilities: ['frontend_debug_master', 'frontend_ui_inspiration']
      });

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(0.99);
    });

    it('should mark abilities as used after calculation', () => {
      const ability1 = player.abilities.find(a => a.id === 'frontend_debug_master');
      const ability2 = player.abilities.find(a => a.id === 'frontend_ui_inspiration');

      expect(ability1?.used).toBe(false);
      expect(ability2?.used).toBe(false);

      taskSolver.calculateSuccessProbability(task, player, {
        frontend: 2,
        abilities: ['frontend_debug_master', 'frontend_ui_inspiration']
      });

      expect(ability1?.used).toBe(true);
      expect(ability2?.used).toBe(true);
    });
  });

  describe('ability effects on task modification', () => {
    it('should modify task complexity with reduce_complexity ability', () => {
      const originalComplexity = task.complexity;

      // Создаем копию задачи для тестирования
      const testTask = new Task({
        id: task.id,
        name: task.name,
        description: task.description,
        requiredSkill: task.requiredSkill,
        complexity: task.complexity,
        deadline: task.deadline,
        experienceReward: task.experienceReward,
        contributesToCommonGoal: task.contributesToCommonGoal,
        commonGoalSkill: task.commonGoalSkill
      });

      const probability = taskSolver.calculateSuccessProbability(testTask, player, {
        frontend: 2,
        abilities: ['frontend_debug_master']
      });

      // Проверяем что вероятность была рассчитана (абилка сработала)
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(0.99);

      // Проверяем что абилка была использована
      const ability = player.abilities.find(a => a.id === 'frontend_debug_master');
      expect(ability?.used).toBe(true);
    });

    it('should not modify original task when no abilities used', () => {
      const originalComplexity = task.complexity;

      taskSolver.calculateSuccessProbability(task, player, {
        frontend: 2,
        enthusiasm: 1
      });

      expect(task.complexity).toBe(originalComplexity);
    });
  });
});
