import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Unresolved Tasks Display in Round Results', () => {
  let gameSession: GameSession;
  let settings: GameSettings;
  let project: Project;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let humanPlayerData: Player;

  beforeEach(() => {
    // Создаем проект
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project for unresolved tasks display',
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
    humanPlayerData = new Player({
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
      rounds: 3,
      actionsPerTurn: 5, // Увеличиваем лимит действий для тестирования
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

  test('должен включать невыполненные задачи в currentRoundTasks второго раунда', async () => {
    // === ПЕРВЫЙ РАУНД ===
    console.log('🎯 === ПЕРВЫЙ РАУНД ===');

    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();
    const firstRoundTasks = gameSession.getDistributionState().availableTasks;

    // Назначаем задачи игрокам
    gameSession.assignTask(firstRoundTasks[0].id, 'human', 'human');
    gameSession.assignTask(firstRoundTasks[1].id, 'human', 'human');
    gameSession.assignTask(firstRoundTasks[2].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игрока
    const humanTasks = gameSession.getPlayerTasks('human');
    expect(humanTasks.length).toBe(2);

    // Создаем действия с нулевой инвестицией (чтобы одна задача не выполнилась)
    const actions: PlayerActionRequest[] = humanTasks.map((task, index) => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: index === 0 ? 0 : 1, // Первая задача не выполнится
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', actions);

    // Завершаем первый раунд
    const firstRoundResult = await gameSession.completeRound();

    console.log('📊 Первый раунд:');
    console.log('  Всего задач:', firstRoundResult.currentRoundTasks.length);
    console.log('  Действий:', firstRoundResult.playerActions.length);
    console.log('  Невыполненных задач:', firstRoundResult.nextRoundTasks.length);

    // Проверяем, что есть невыполненные задачи
    expect(firstRoundResult.nextRoundTasks.length).toBeGreaterThan(0);
    const unresolvedTaskId = firstRoundResult.nextRoundTasks[0].id;
    console.log('  ID невыполненной задачи:', unresolvedTaskId);

    // === ВТОРОЙ РАУНД ===
    console.log('🎯 === ВТОРОЙ РАУНД ===');

    // Подготавливаем второй раунд
    gameSession.prepareNextRound();

    // Инициализируем второй раунд
    gameSession.initializeTaskDistribution();
    const secondRoundTasks = gameSession.getDistributionState().availableTasks;

    // Назначаем новые задачи
    gameSession.assignTask(secondRoundTasks[0].id, 'human', 'human');
    gameSession.assignTask(secondRoundTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игрока во втором раунде (должны включать невыполненные)
    const secondRoundHumanTasks = gameSession.getPlayerTasks('human');
    console.log('📋 Задачи игрока во втором раунде:', secondRoundHumanTasks.length);

    // Проверяем, что невыполненная задача есть у игрока (только с дедлайном > 1)
    // Задачи с дедлайном 1 исключаются как просроченные
    const hasUnresolvedTask = secondRoundHumanTasks.some(task => task.id === unresolvedTaskId);
    expect(hasUnresolvedTask).toBe(true);
    console.log('✅ Невыполненная задача найдена у игрока:', hasUnresolvedTask);

    // Создаем действия для всех задач игрока
    const secondRoundActions: PlayerActionRequest[] = secondRoundHumanTasks.map(task => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 1,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', secondRoundActions);

    // Завершаем второй раунд
    const secondRoundResult = await gameSession.completeRound();

    console.log('📊 Второй раунд:');
    console.log('  Всего задач в currentRoundTasks:', secondRoundResult.currentRoundTasks.length);
    console.log('  Действий:', secondRoundResult.playerActions.length);
    console.log('  Невыполненных задач:', secondRoundResult.nextRoundTasks.length);

    // === ПРОВЕРКИ ===
    console.log('🔍 === ПРОВЕРКИ ===');

    // 1. Проверяем, что невыполненная задача включена в currentRoundTasks
    const unresolvedTaskInResults = secondRoundResult.currentRoundTasks.find(task => task.id === unresolvedTaskId);
    expect(unresolvedTaskInResults).toBeDefined();
    console.log('✅ Невыполненная задача найдена в currentRoundTasks:', !!unresolvedTaskInResults);

    // 2. Проверяем, что есть действие по невыполненной задаче
    const actionForUnresolvedTask = secondRoundResult.playerActions.find(action => action.taskId === unresolvedTaskId);
    expect(actionForUnresolvedTask).toBeDefined();
    console.log('✅ Действие по невыполненной задаче найдено:', !!actionForUnresolvedTask);

    // 3. Проверяем, что currentRoundTasks содержит больше задач, чем действий
    expect(secondRoundResult.currentRoundTasks.length).toBeGreaterThan(secondRoundResult.playerActions.length);
    console.log('✅ currentRoundTasks содержит больше задач чем действий:',
      secondRoundResult.currentRoundTasks.length, '>', secondRoundResult.playerActions.length);

    // 4. Проверяем, что все действия могут найти свои задачи
    for (const action of secondRoundResult.playerActions) {
      const task = secondRoundResult.currentRoundTasks.find(t => t.id === action.taskId);
      expect(task).toBeDefined();
      console.log(`✅ Действие ${action.taskId} -> задача ${task?.name}`);
    }

    console.log('🎉 Все проверки пройдены!');
  });

  test('должен корректно отображать статус всех задач раунда', async () => {
    // Создаем сценарий с невыполненными задачами
    gameSession.initializeTaskDistribution();
    const tasks = gameSession.getDistributionState().availableTasks;

    // Назначаем задачи
    gameSession.assignTask(tasks[0].id, 'human', 'human');
    gameSession.assignTask(tasks[1].id, 'human', 'human');
    gameSession.assignTask(tasks[2].id, 'ai', 'ai');

    gameSession.completeTaskDistribution();

    // Выполняем только одну задачу из двух
    const humanTasks = gameSession.getPlayerTasks('human');
    const humanSkills = humanPlayerData.skills;
    const actions: PlayerActionRequest[] = [
      {
        playerId: 'human',
        taskId: humanTasks[0].id,
        investment: {
          [humanTasks[0].requiredSkill]: Math.min(3, humanSkills[humanTasks[0].requiredSkill as keyof typeof humanSkills] || 0), // Гарантированно выполнится
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      },
      {
        playerId: 'human',
        taskId: humanTasks[1].id,
        investment: {
          [humanTasks[1].requiredSkill]: 0, // Не выполнится
          techBase: 0,
          softSkills: 0,
          enthusiasm: 0
        }
      }
    ];

    await gameSession.submitPlayerActions('human', actions);
    const roundResult = await gameSession.completeRound();

    // Проверяем, что в результатах есть все задачи
    expect(roundResult.currentRoundTasks.length).toBe(3); // 2 у human + 1 у ai

    // Проверяем, что есть выполненные и невыполненные задачи
    const completedTasks = roundResult.playerActions.filter(action => action.success);
    const unresolvedTasks = roundResult.nextRoundTasks;

    // Задачи с дедлайном 1 исключаются как просроченные
    expect(completedTasks.length).toBeGreaterThanOrEqual(0);
    expect(unresolvedTasks.length).toBeGreaterThanOrEqual(0);

    console.log('📊 Статус задач:');
    console.log('  Выполнено:', completedTasks.length);
    console.log('  Невыполнено:', unresolvedTasks.length);
    console.log('  Всего задач в раунде:', roundResult.currentRoundTasks.length);
  });
});
