import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Expired Task Penalties System', () => {
  let gameSession: GameSession;
  let humanPlayer: HumanPlayer;
  let aiPlayer1: AIPlayer;
  let aiPlayer2: AIPlayer;

  const createDefaultSettings = (): GameSettings => {
    return new GameSettings({
      actionsPerTurn: 2,
      rounds: 10,
      allowUnlimitedActions: false
    });
  };

  const createDefaultProject = (): Project => {
    return new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project for penalties',
      requiredLevel: 1,
      requirements: {
        frontend: 20,
        backend: 20,
        management: 10
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.5,
        experienceReward: 100
      }
    });
  };

  beforeEach(() => {
    const humanPlayerData = new Player({
      name: 'Human',
      specialization: 'frontend',
      skills: {
        frontend: 3,
        backend: 1,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 10
    });

    const aiPlayer1Data = new Player({
      name: 'AI1',
      specialization: 'backend',
      skills: {
        frontend: 1,
        backend: 3,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 10
    });

    const aiPlayer2Data = new Player({
      name: 'AI2',
      specialization: 'management',
      skills: {
        frontend: 1,
        backend: 1,
        management: 3,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 10
    });

    humanPlayer = new HumanPlayer(humanPlayerData);
    aiPlayer1 = new AIPlayer(aiPlayer1Data);
    aiPlayer2 = new AIPlayer(aiPlayer2Data);

    const settings = createDefaultSettings();
    const project = createDefaultProject();

    gameSession = new GameSession({
      id: 'test-session',
      players: [humanPlayer, aiPlayer1, aiPlayer2],
      project,
      settings,
      maxPlayers: 3
    });
  });

  describe('Penalty Application', () => {
    test('should include penalty info in RoundResult for expired tasks', async () => {
      // Инициализируем распределение задач
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();

      if (tasks.length === 0) {
        return;
      }

      // Находим задачу с дедлайном = 1 (истечет в следующем раунде)
      const taskWithShortDeadline = tasks.find(t => t.deadline === 1) || tasks[0];

      // Назначаем задачу игроку
      gameSession.assignTask(taskWithShortDeadline.id, 'Human', 'Human');

      // Завершаем распределение задач
      gameSession.completeTaskDistribution();

      // Завершаем раунд без выполнения задач
      const roundResult = await gameSession.completeRound();

      // Проверяем структуру RoundResult
      expect(roundResult.expiredPenalties).toBeDefined();
      expect(roundResult.playerContributions).toBeDefined();
      expect(Array.isArray(roundResult.expiredPenalties)).toBe(true);
      expect(typeof roundResult.playerContributions).toBe('object');
    });

    test('should NOT apply penalty for active tasks (deadline > 0)', async () => {
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();

      if (tasks.length === 0) {
        return;
      }

      // Находим задачу с большим дедлайном (deadline > 1)
      const taskWithLongDeadline = tasks.find(t => t.deadline > 1);

      if (!taskWithLongDeadline) {
        return;
      }

      gameSession.assignTask(taskWithLongDeadline.id, 'Human', 'Human');
      gameSession.completeTaskDistribution();

      const roundResult = await gameSession.completeRound();

      // Проверяем, что штрафа НЕТ для задач с deadline > 0
      const humanPenalty = roundResult.expiredPenalties.find(
        (p: any) => p.playerId === 'Human' && p.taskId === taskWithLongDeadline.id
      );

      expect(humanPenalty).toBeUndefined();
    });
  });
});

