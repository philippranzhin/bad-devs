import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskSolver } from '../services/TaskSolver';

describe('TaskSolver', () => {
  let settings: GameSettings;
  let solver: TaskSolver;

  beforeEach(() => {
    settings = new GameSettings({
      difficultyLevel: 5
    });
    solver = new TaskSolver(settings);
  });

  it('should throw error when investing non-matching skills', () => {
    // Arrange
    const frontendTask = new Task({
      id: 'test-frontend-task',
      name: 'Frontend Task',
      description: 'Test frontend task',
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
         backend: 3,
         techBase: 1,
         softSkills: 1,
         management: 0
       },
       enthusiasm: 10
     });

    // Act & Assert - должно падать с ошибкой
    expect(() => {
      solver.calculateSuccessProbability(frontendTask, player, {
        backend: 1 // несоответствующий навык
      });
    }).toThrow('Cannot invest backend skill in frontend task');
  });

  it('should allow investing matching skills, enthusiasm and tech base', () => {
    // Arrange
    const frontendTask = new Task({
      id: 'test-frontend-task',
      name: 'Frontend Task',
      description: 'Test frontend task',
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
         backend: 3,
         techBase: 1,
         softSkills: 1,
         management: 0
       },
       enthusiasm: 10
     });

    // Act - вкладываем соответствующие ресурсы
    const probability = solver.calculateSuccessProbability(frontendTask, player, {
      frontend: 1,    // соответствующий навык
      enthusiasm: 1,  // можно в любую задачу
      techBase: 1     // можно в любую задачу
    });

    // Assert
    // При сложности 3: базовая вероятность = 1/3 = 0.333 (33.3%)
    // 1 фронтенд (33.3%) + 1 тех база (18%) + 1 энтузиазм (35%) = 86.3%
    expect(probability).toBeCloseTo(0.863, 2);
  });

  it('should throw error when investing more skills than player has', () => {
    // Arrange
    const frontendTask = new Task({
      id: 'test-frontend-task',
      name: 'Frontend Task',
      description: 'Test frontend task',
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
         techBase: 1,
         softSkills: 1,
         backend: 0,
         management: 0
       },
       enthusiasm: 10
     });

    // Act & Assert - пытаемся вложить больше фронтенда, чем есть
    expect(() => {
      solver.calculateSuccessProbability(frontendTask, player, {
        frontend: 2 // у игрока только 1 очко фронтенда
      });
    }).toThrow('Cannot invest more frontend skills than player has');
  });
});
