import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Round Results Include Unresolved Tasks', () => {
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
      description: 'Test project for round results',
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

  test('должен включать невыполненные задачи в currentRoundTasks', async () => {
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

    // Проверяем, что currentRoundTasks включает все задачи раунда
    expect(roundResult.currentRoundTasks.length).toBeGreaterThan(0);

    // Проверяем, что невыполненные задачи есть в currentRoundTasks
    const unresolvedTaskIds = roundResult.nextRoundTasks.map(t => t.id);
    const currentRoundTaskIds = roundResult.currentRoundTasks.map(t => t.id);

    // Все невыполненные задачи должны быть в currentRoundTasks
    for (const unresolvedTaskId of unresolvedTaskIds) {
      expect(currentRoundTaskIds).toContain(unresolvedTaskId);
    }

    console.log('✅ Unresolved tasks in currentRoundTasks:',
      unresolvedTaskIds.filter(id => currentRoundTaskIds.includes(id)).length);
  });

  test('должен включать все задачи раунда в getAllRoundTasks', () => {
    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем все задачи раунда
    const allRoundTasks = gameSession.getAllRoundTasks();

    // Должны быть задачи текущего раунда
    expect(allRoundTasks.length).toBeGreaterThan(0);

    // Проверяем, что все задачи уникальны
    const uniqueTaskIds = new Set(allRoundTasks.map(t => t.id));
    expect(uniqueTaskIds.size).toBe(allRoundTasks.length);

    console.log('✅ All round tasks count:', allRoundTasks.length);
  });
});
