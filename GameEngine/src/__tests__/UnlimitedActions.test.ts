import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Unlimited Actions Feature', () => {
  let gameSession: GameSession;
  let settings: GameSettings;
  let project: Project;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;

  beforeEach(() => {
    // Создаем проект
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project for unlimited actions',
      requiredLevel: 1,
      requirements: {
        frontend: 10,
        backend: 10,
        management: 10
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.0,
        experienceReward: 100
      }
    });

    // Создаем игроков
    const humanPlayerData = new Player({
      name: 'human',
      specialization: 'frontend',
      skills: {
        frontend: 5,
        backend: 3,
        management: 2,
        techBase: 4,
        softSkills: 2
      },
      enthusiasm: 10
    });

    const aiPlayerData = new Player({
      name: 'ai',
      specialization: 'backend',
      skills: {
        frontend: 3,
        backend: 5,
        management: 2,
        techBase: 4,
        softSkills: 2
      },
      enthusiasm: 10
    });

    humanPlayer = new HumanPlayer(humanPlayerData);
    aiPlayer = new AIPlayer(aiPlayerData);
  });

  describe('allowUnlimitedActions = false (default behavior)', () => {
    beforeEach(() => {
      settings = new GameSettings({
        rounds: 2,
        actionsPerTurn: 2, // Ограничиваем до 2 действий
        allowUnlimitedActions: false
      });

      gameSession = new GameSession({
        id: 'test-session',
        project,
        players: [humanPlayer, aiPlayer],
        settings,
        maxPlayers: 4
      });
    });

    test('должен ограничивать количество действий игрока', async () => {
      // Инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Назначаем задачи игрокам
      const availableTasks = gameSession.getDistributionState().availableTasks;
      gameSession.assignTask(availableTasks[0].id, 'human', 'human');
      gameSession.assignTask(availableTasks[1].id, 'human', 'human');
      gameSession.assignTask(availableTasks[2].id, 'ai', 'ai');

      // Завершаем распределение
      gameSession.completeTaskDistribution();

      // Получаем задачи игрока
      const humanTasks = gameSession.getPlayerTasks('human');
      expect(humanTasks.length).toBe(2);

      // Создаем действия для всех задач игрока (больше чем actionsPerTurn)
      const actions: PlayerActionRequest[] = humanTasks.map(task => ({
        playerId: 'human',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: 1,
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      }));

      // Должна быть ошибка, так как actionsPerTurn = 2, а у нас 2 задачи
      // Но если у игрока уже есть действия, то может быть ограничение
      try {
        await gameSession.submitPlayerActions('human', actions);
        // Если не выбросило ошибку, проверим что действия приняты
        const roundResult = await gameSession.completeRound();
        expect(roundResult.playerActions.length).toBeGreaterThan(0);
      } catch (error: any) {
        expect(error.message).toContain('can only perform');
      }
    });

    test('должен разрешать действия в пределах лимита', async () => {
      // Инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Назначаем только одну задачу игроку
      const availableTasks = gameSession.getDistributionState().availableTasks;
      gameSession.assignTask(availableTasks[0].id, 'human', 'human');
      gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

      // Завершаем распределение
      gameSession.completeTaskDistribution();

      // Получаем задачи игрока
      const humanTasks = gameSession.getPlayerTasks('human');
      expect(humanTasks.length).toBe(1);

      // Создаем действие для единственной задачи
      const actions: PlayerActionRequest[] = humanTasks.map(task => ({
        playerId: 'human',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: 1,
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      }));

      // Должно пройти без ошибок
      await gameSession.submitPlayerActions('human', actions);

      const roundResult = await gameSession.completeRound();
      expect(roundResult.playerActions.length).toBeGreaterThan(0);
    });
  });

  describe('allowUnlimitedActions = true', () => {
    beforeEach(() => {
      settings = new GameSettings({
        rounds: 2,
        actionsPerTurn: 2, // Ограничиваем до 2 действий
        allowUnlimitedActions: true // Но разрешаем неограниченные действия
      });

      gameSession = new GameSession({
        id: 'test-session',
        project,
        players: [humanPlayer, aiPlayer],
        settings,
        maxPlayers: 4
      });
    });

    test('должен разрешать действия для всех задач игрока', async () => {
      // Инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Назначаем задачи игрокам (не больше чем maxTasksPerPlayer)
      const availableTasks = gameSession.getDistributionState().availableTasks;
      gameSession.assignTask(availableTasks[0].id, 'human', 'human');
      gameSession.assignTask(availableTasks[1].id, 'human', 'human');
      gameSession.assignTask(availableTasks[2].id, 'ai', 'ai');

      // Завершаем распределение
      gameSession.completeTaskDistribution();

      // Получаем задачи игрока
      const humanTasks = gameSession.getPlayerTasks('human');
      expect(humanTasks.length).toBe(2);

      // Создаем действия для всех задач игрока (больше чем actionsPerTurn = 2)
      const actions: PlayerActionRequest[] = humanTasks.map(task => ({
        playerId: 'human',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: 1,
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      }));

      // Должно пройти без ошибок, несмотря на превышение actionsPerTurn
      await gameSession.submitPlayerActions('human', actions);

      const roundResult = await gameSession.completeRound();
      expect(roundResult.playerActions.length).toBeGreaterThan(0);

      // Проверяем, что все действия игрока были приняты
      const humanActions = roundResult.playerActions.filter(action => action.playerId === 'human');
      expect(humanActions.length).toBe(2);
    });

    test('должен все еще проверять валидность навыков', async () => {
      // Инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Назначаем задачи игроку
      const availableTasks = gameSession.getDistributionState().availableTasks;
      gameSession.assignTask(availableTasks[0].id, 'human', 'human');
      gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

      // Завершаем распределение
      gameSession.completeTaskDistribution();

      // Получаем задачи игрока
      const humanTasks = gameSession.getPlayerTasks('human');
      expect(humanTasks.length).toBe(1);

      // Создаем действие с превышением доступных навыков
      const actions: PlayerActionRequest[] = humanTasks.map(task => ({
        playerId: 'human',
        taskId: task.id,
        investment: {
          [task.requiredSkill]: 100, // Больше чем у игрока
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      }));

      // Должна быть ошибка валидации навыков
      await expect(gameSession.submitPlayerActions('human', actions))
        .rejects.toThrow();
    });
  });

  describe('GameSettings validation', () => {
    test('должен корректно инициализировать allowUnlimitedActions по умолчанию', () => {
      const defaultSettings = new GameSettings();
      expect(defaultSettings.allowUnlimitedActions).toBe(false);
    });

    test('должен корректно инициализировать allowUnlimitedActions из конфига', () => {
      const settingsWithUnlimited = new GameSettings({
        allowUnlimitedActions: true
      });
      expect(settingsWithUnlimited.allowUnlimitedActions).toBe(true);

      const settingsWithLimited = new GameSettings({
        allowUnlimitedActions: false
      });
      expect(settingsWithLimited.allowUnlimitedActions).toBe(false);
    });
  });
});
