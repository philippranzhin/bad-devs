import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Unresolved Tasks Validation', () => {
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
      description: 'Test project for unresolved tasks validation',
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

    settings = new GameSettings({
      rounds: 2,
      actionsPerTurn: 2,
      allowUnlimitedActions: true
    });

    gameSession = new GameSession({
      id: 'test-session',
      project,
      players: [humanPlayer, aiPlayer],
      settings,
      maxPlayers: 4
    });
  });

  test('должен разрешать действия для невыполненных задач из предыдущего раунда', async () => {
    // Первый раунд - создаем невыполненные задачи
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игрока
    const humanTasks = gameSession.getPlayerTasks('human');
    expect(humanTasks.length).toBe(1);

    // Создаем действия с нулевой инвестицией (чтобы задачи не выполнились)
    const actions: PlayerActionRequest[] = humanTasks.map(task => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0, // Нулевая инвестиция
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', actions);

    // Завершаем первый раунд
    const roundResult = await gameSession.completeRound();

    // Проверяем, что есть невыполненные задачи
    expect(roundResult.nextRoundTasks.length).toBeGreaterThan(0);

    // Подготавливаем второй раунд
    gameSession.prepareNextRound();

    // Инициализируем второй раунд
    gameSession.initializeTaskDistribution();

    // Назначаем новые задачи
    const secondRoundTasks = gameSession.getDistributionState().availableTasks;
    gameSession.assignTask(secondRoundTasks[0].id, 'human', 'human');
    gameSession.assignTask(secondRoundTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игрока во втором раунде (должны включать невыполненные)
    const secondRoundHumanTasks = gameSession.getPlayerTasks('human');
    expect(secondRoundHumanTasks.length).toBe(2); // 1 невыполненная + 1 новая

    // Находим невыполненную задачу из первого раунда
    const unresolvedTask = secondRoundHumanTasks.find(task => 
      roundResult.nextRoundTasks.some(unresolved => unresolved.id === task.id)
    );
    expect(unresolvedTask).toBeDefined();

    // Создаем действие для невыполненной задачи
    const unresolvedAction: PlayerActionRequest = {
      playerId: 'human',
      taskId: unresolvedTask!.id,
      investment: {
        [unresolvedTask!.requiredSkill]: 1,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    };

    // Должно пройти без ошибки "Task not found"
    await expect(gameSession.submitPlayerActions('human', [unresolvedAction]))
      .resolves.not.toThrow();
  });

  test('должен выбрасывать ошибку для несуществующих задач', async () => {
    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Создаем действие для несуществующей задачи
    const invalidAction: PlayerActionRequest = {
      playerId: 'human',
      taskId: 'non-existent-task-id',
      investment: {
        frontend: 1,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    };

    // Должна быть ошибка "Task not found"
    await expect(gameSession.submitPlayerActions('human', [invalidAction]))
      .rejects.toThrow('Task non-existent-task-id not found');
  });
});
