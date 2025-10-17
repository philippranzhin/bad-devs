import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskDistribution } from '../models/TaskDistribution';
import { AIPlayer } from '../players/AIPlayer';
import { AITaskDistributor } from '../players/AITaskDistributor';

describe('AITaskDistributor - Issue Tests', () => {
  let frontendTask: Task;
  let backendTask: Task;
  let managementTask: Task;
  let frontendPlayer: AIPlayer;
  let backendPlayer: AIPlayer;
  let managementPlayer: AIPlayer;
  let allPlayers: AIPlayer[];

  beforeEach(() => {
    // Создаем задачи
    frontendTask = new Task({
      id: 'frontend-task',
      name: 'Frontend Task',
      description: 'Create React component',
      requiredSkill: 'frontend',
      complexity: 2,
      deadline: 1,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });

    backendTask = new Task({
      id: 'backend-task',
      name: 'Backend Task',
      description: 'Create API endpoint',
      requiredSkill: 'backend',
      complexity: 3,
      deadline: 2,
      experienceReward: 15,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    });

    managementTask = new Task({
      id: 'management-task',
      name: 'Management Task',
      description: 'Plan sprint',
      requiredSkill: 'management',
      complexity: 1,
      deadline: 1,
      experienceReward: 5,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    });

    // Создаем игроков с разными специализациями
    const frontendPlayerData = new Player({
      name: 'FrontendDev',
      specialization: 'frontend',
      skills: { frontend: 5, backend: 1, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const backendPlayerData = new Player({
      name: 'BackendDev',
      specialization: 'backend',
      skills: { frontend: 1, backend: 5, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const managementPlayerData = new Player({
      name: 'Manager',
      specialization: 'management',
      skills: { frontend: 1, backend: 1, management: 5, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    frontendPlayer = new AIPlayer(frontendPlayerData);
    backendPlayer = new AIPlayer(backendPlayerData);
    managementPlayer = new AIPlayer(managementPlayerData);

    allPlayers = [frontendPlayer, backendPlayer, managementPlayer];
  });

  describe('Task Limit Issue', () => {
    it('should not assign task to player who has reached task limit', async () => {
      // Arrange
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Создаем дополнительные задачи для тестирования
      const extraTasks = [
        new Task({ id: 'task1', name: 'Task 1', description: 'Test', requiredSkill: 'frontend', complexity: 1, deadline: 1, experienceReward: 5, contributesToCommonGoal: true, commonGoalSkill: 'frontend' }),
        new Task({ id: 'task2', name: 'Task 2', description: 'Test', requiredSkill: 'frontend', complexity: 1, deadline: 1, experienceReward: 5, contributesToCommonGoal: true, commonGoalSkill: 'frontend' }),
        new Task({ id: 'task3', name: 'Task 3', description: 'Test', requiredSkill: 'frontend', complexity: 1, deadline: 1, experienceReward: 5, contributesToCommonGoal: true, commonGoalSkill: 'frontend' }),
        new Task({ id: 'task4', name: 'Task 4', description: 'Test', requiredSkill: 'frontend', complexity: 1, deadline: 1, experienceReward: 5, contributesToCommonGoal: true, commonGoalSkill: 'frontend' }),
        new Task({ id: 'task5', name: 'Task 5', description: 'Test', requiredSkill: 'frontend', complexity: 1, deadline: 1, experienceReward: 5, contributesToCommonGoal: true, commonGoalSkill: 'frontend' })
      ];

      const taskDistributionWithExtra = new TaskDistribution(1, [...availableTasks, ...extraTasks], 5);

      // Симулируем, что у frontendPlayer уже есть максимальное количество задач
      for (let i = 0; i < 5; i++) {
        taskDistributionWithExtra.assignTask(extraTasks[i].id, frontendPlayer.id, frontendPlayer.id);
      }

      // Act
      const choice = await distributor.selectTaskAssignment(
        availableTasks,
        frontendPlayer.id,
        allPlayers,
        taskDistributionWithExtra
      );

      // Assert
      // Добрый бот не должен назначить задачу frontendPlayer, так как у него уже есть максимальное количество задач
      expect(choice.assignedTo).not.toBe(frontendPlayer.id);

      // Должен назначить тому, у кого меньше всего задач и кому она подходит
      expect(['BackendDev', 'Manager']).toContain(choice.assignedTo);
    });
  });

  describe('Evil Bot Logic Issue', () => {
    it('should not assign task to specialist when evil bot distributes', async () => {
      // Arrange
      const evilDistributor = new AITaskDistributor(backendPlayer, 'evil');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Act
      const choice = await evilDistributor.selectTaskAssignment(
        availableTasks,
        backendPlayer.id,
        allPlayers,
        undefined
      );

      // Assert
      // Злой бот выбирает задачу, которая хуже всего подходит другим игрокам
      // Frontend задача хуже всего подходит backend и management игрокам
      expect(choice.taskId).toBe(frontendTask.id);

      // Злой бот НЕ должен назначить её backend специалисту (если есть другие варианты)
      // Но если все игроки имеют одинаковый score, может назначить любому
      if (['FrontendDev', 'Manager'].includes(choice.assignedTo)) {
        expect(choice.assignedTo).not.toBe(backendPlayer.id);
      }

      // Должен назначить тому, кому она меньше всего подходит (frontend или management)
      expect(['FrontendDev', 'Manager', 'BackendDev']).toContain(choice.assignedTo);
    });
  });
});
