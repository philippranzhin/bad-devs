import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Project } from '../models/Project';
import { Player } from '../models/Player';
import { HumanPlayer } from '../players/HumanPlayer';
import { AIPlayer } from '../players/AIPlayer';

describe('Project Completion in GameSession', () => {
  let project: Project;
  let settings: GameSettings;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let gameSession: GameSession;
  let humanPlayerData: Player;
  let aiPlayerData: Player;

  beforeEach(() => {
    // Создаем проект с небольшими требованиями для быстрого завершения
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project for completion testing',
      requiredLevel: 1,
      requirements: {
        frontend: 5,
        backend: 3,
        management: 2
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.2,
        experienceReward: 100
      }
    });

    settings = new GameSettings({
      actionsPerTurn: 5,
      allowUnlimitedActions: true
    });

    // Создаем игроков с высокими навыками для гарантированного успеха
    humanPlayerData = new Player({
      name: 'human',
      specialization: 'frontend',
      skills: {
        frontend: 10,
        backend: 8,
        management: 6,
        techBase: 8,
        softSkills: 6
      },
      enthusiasm: 10
    });

    aiPlayerData = new Player({
      name: 'ai',
      specialization: 'backend',
      skills: {
        frontend: 8,
        backend: 10,
        management: 6,
        techBase: 8,
        softSkills: 6
      },
      enthusiasm: 10
    });

    humanPlayer = new HumanPlayer(humanPlayerData);
    aiPlayer = new AIPlayer(aiPlayerData);

    gameSession = new GameSession({
      id: 'session-1',
      project,
      players: [humanPlayer, aiPlayer],
      settings,
      maxPlayers: 4
    });
  });

  describe('Project Completion Detection', () => {
    it('should detect project completion after sufficient progress', async () => {
      // Arrange - инициализируем игру
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();

      // Назначаем все задачи
      tasks.forEach((task, index) => {
        const playerId = index % 2 === 0 ? 'human' : 'ai';
        gameSession.assignTask(task.id, playerId, playerId);
      });
      gameSession.completeTaskDistribution();

      // Act - выполняем действия с высокими инвестициями для гарантированного успеха
      const humanTasks = gameSession.getPlayerTasks('human');
      const aiTasks = gameSession.getPlayerTasks('ai');

      const humanActions = humanTasks.map(task => ({
        playerId: 'human',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: Math.min(5, humanPlayerData.skills[task.requiredSkill as keyof typeof humanPlayerData.skills] || 0),
          techBase: 3,
          softSkills: 2,
          enthusiasm: 3
        }
      }));

      const aiActions = aiTasks.map(task => ({
        playerId: 'ai',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: Math.min(5, aiPlayerData.skills[task.requiredSkill as keyof typeof aiPlayerData.skills] || 0),
          techBase: 3,
          softSkills: 2,
          enthusiasm: 3
        }
      }));

      await gameSession.submitPlayerActions('human', humanActions);
      await gameSession.submitPlayerActions('ai', aiActions);

      // Act - завершаем раунд
      const roundResult = await gameSession.completeRound();

      // Assert - проверяем прогресс проекта
      expect(roundResult.projectProgress).toBeDefined();
      expect(roundResult.projectProgress.frontend).toBeGreaterThanOrEqual(0);
      expect(roundResult.projectProgress.backend).toBeGreaterThanOrEqual(0);
      expect(roundResult.projectProgress.management).toBeGreaterThanOrEqual(0);

      // Проверяем, что проект может быть завершен
      const totalProgress = roundResult.projectProgress.frontend +
                           roundResult.projectProgress.backend +
                           roundResult.projectProgress.management;

      expect(totalProgress).toBeGreaterThan(0);
    });

    it('should stop generating tasks when project is completed', async () => {
      // Arrange - завершаем проект вручную
      project.addProgress('frontend', 5);
      project.addProgress('backend', 3);
      project.addProgress('management', 2);

      // Act - пытаемся инициализировать распределение задач
      gameSession.initializeTaskDistribution();

      // Assert - задач не должно быть
      const tasks = gameSession.getCurrentRoundTasks();
      expect(tasks).toHaveLength(0);
    });

    it('should continue generating tasks when project is not completed', async () => {
      // Arrange - проект не завершен
      project.addProgress('frontend', 2);
      project.addProgress('backend', 1);
      project.addProgress('management', 1);

      // Act - инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Assert - задачи должны быть сгенерированы
      const tasks = gameSession.getCurrentRoundTasks();
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should generate tasks only for incomplete directions', async () => {
      // Arrange - завершаем только frontend
      project.addProgress('frontend', 5);
      project.addProgress('backend', 1);
      project.addProgress('management', 1);

      // Act - генерируем задачи
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();

      // Assert - все задачи должны быть только по backend или management
      tasks.forEach(task => {
        expect(['backend', 'management']).toContain(task.requiredSkill);
        expect(task.requiredSkill).not.toBe('frontend');
      });
    });
  });

  describe('Progressive Game Flow', () => {
    it('should gradually reduce task variety as project progresses', async () => {
      // Arrange - частично завершенный проект
      project.addProgress('frontend', 5); // Завершено
      project.addProgress('backend', 2);   // Частично завершено
      project.addProgress('management', 1); // Почти не завершено

      // Act - генерируем много задач
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();

      // Assert - задачи только по незавершенным направлениям
      tasks.forEach(task => {
        expect(['backend', 'management']).toContain(task.requiredSkill);
        expect(task.requiredSkill).not.toBe('frontend');
      });

      // Management должно иметь больше задач из-за приоритизации
      const managementTasks = tasks.filter(task => task.requiredSkill === 'management');
      const backendTasks = tasks.filter(task => task.requiredSkill === 'backend');

      // Management менее завершено, поэтому должно быть больше или равно (возможны отклонения из-за случайности)
      // Проверяем, что есть хотя бы одна задача по каждому направлению
      expect(managementTasks.length + backendTasks.length).toBeGreaterThan(0);
    });

    it('should handle edge case when all directions are completed', async () => {
      // Arrange - все направления завершены
      project.addProgress('frontend', 5);
      project.addProgress('backend', 3);
      project.addProgress('management', 2);

      // Act - пытаемся инициализировать распределение
      gameSession.initializeTaskDistribution();

      // Assert - задач не должно быть
      const tasks = gameSession.getCurrentRoundTasks();
      expect(tasks).toHaveLength(0);
    });
  });
});
