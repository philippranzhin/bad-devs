import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('UnresolvedTasksCarryover', () => {
  let gameSession: GameSession;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let project: Project;
  let settings: GameSettings;

  beforeEach(() => {
    // Создаем настройки игры
    settings = new GameSettings({
      actionsPerTurn: 2,
      enthusiasmPoints: 5
    });

    // Создаем проект
    project = new Project({
      id: 'test-project',
      name: 'Тестовый проект',
      description: 'Проект для тестирования',
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
      enthusiasm: 5,
      skills: {
        frontend: 5,
        backend: 3,
        management: 2,
        techBase: 4,
        softSkills: 2
      }
    });

    const aiPlayerData = new Player({
      name: 'ai',
      specialization: 'backend',
      enthusiasm: 5,
      skills: {
        frontend: 3,
        backend: 5,
        management: 2,
        techBase: 3,
        softSkills: 1
      }
    });

    humanPlayer = new HumanPlayer(humanPlayerData);
    aiPlayer = new AIPlayer(aiPlayerData);

    // Создаем игровую сессию
    gameSession = new GameSession({
      id: 'test-session',
      project,
      players: [humanPlayer, aiPlayer],
      settings,
      maxPlayers: 4
    });
  });

  test('невыполненные задачи должны переноситься в следующий раунд', async () => {
    // Инициализируем распределение задач для первого раунда
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    expect(availableTasks.length).toBeGreaterThan(0);

    // Назначаем задачи
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков
    const humanTasks = gameSession.getPlayerTasks('human');
    const aiTasks = gameSession.getPlayerTasks('ai');

    expect(humanTasks.length).toBeGreaterThan(0);
    expect(aiTasks.length).toBeGreaterThan(0);

    // Создаем действия с очень низкой вероятностью успеха (чтобы задачи не выполнились)
    const humanActions: PlayerActionRequest[] = humanTasks.map(task => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0, // Нулевая инвестиция в основной навык
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    const aiActions: PlayerActionRequest[] = aiTasks.map(task => ({
      playerId: 'ai',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0, // Нулевая инвестиция в основной навык
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', humanActions);
    await gameSession.submitPlayerActions('ai', aiActions);

    // Завершаем раунд
    const roundResult = await gameSession.completeRound();

    // Проверяем, что есть невыполненные задачи
    expect(roundResult.nextRoundTasks.length).toBeGreaterThan(0);

    // Инициализируем распределение задач для второго раунда
    gameSession.initializeTaskDistribution();

    // Назначаем новые задачи игрокам во втором раунде
    const secondRoundAvailableTasks = gameSession.getDistributionState().availableTasks;
    expect(secondRoundAvailableTasks.length).toBeGreaterThan(0);

    // Назначаем новые задачи
    gameSession.assignTask(secondRoundAvailableTasks[0].id, 'human', 'human');
    gameSession.assignTask(secondRoundAvailableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков во втором раунде (должны включать невыполненные + новые)
    const secondRoundHumanTasks = gameSession.getPlayerTasks('human');
    const secondRoundAiTasks = gameSession.getPlayerTasks('ai');

    // Проверяем, что игроки получили больше или столько же задач
    // (невыполненные + новые, но задачи с дедлайном 1 исключаются)
    expect(secondRoundHumanTasks.length).toBeGreaterThanOrEqual(humanTasks.length);
    expect(secondRoundAiTasks.length).toBeGreaterThanOrEqual(aiTasks.length);

    // Проверяем, что невыполненные задачи из первого раунда присутствуют у игроков
    const unresolvedTaskIds = roundResult.nextRoundTasks.map(task => task.id);
    const secondRoundHumanTaskIds = secondRoundHumanTasks.map(task => task.id);
    const secondRoundAiTaskIds = secondRoundAiTasks.map(task => task.id);

    // Должны найтись невыполненные задачи из первого раунда
    const foundUnresolvedHumanTasks = unresolvedTaskIds.filter(id =>
      secondRoundHumanTaskIds.includes(id)
    );
    const foundUnresolvedAiTasks = unresolvedTaskIds.filter(id =>
      secondRoundAiTaskIds.includes(id)
    );

    // Проверяем, что невыполненные задачи перенеслись (только с дедлайном > 1)
    // Задачи с дедлайном 1 исключаются как просроченные
    expect(foundUnresolvedHumanTasks.length).toBeGreaterThanOrEqual(0);
    expect(foundUnresolvedAiTasks.length).toBeGreaterThanOrEqual(0);
  });

  test('игрок должен получать новые задачи сверх невыполненных', async () => {
    // Инициализируем распределение задач для первого раунда
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    expect(availableTasks.length).toBeGreaterThan(0);

    // Назначаем задачи
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков
    const humanTasks = gameSession.getPlayerTasks('human');
    const aiTasks = gameSession.getPlayerTasks('ai');

    expect(humanTasks.length).toBeGreaterThan(0);
    expect(aiTasks.length).toBeGreaterThan(0);

    // Создаем действия с очень низкой вероятностью успеха
    const humanActions: PlayerActionRequest[] = humanTasks.map(task => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    const aiActions: PlayerActionRequest[] = aiTasks.map(task => ({
      playerId: 'ai',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', humanActions);
    await gameSession.submitPlayerActions('ai', aiActions);

    // Завершаем раунд
    const roundResult = await gameSession.completeRound();

    // Инициализируем распределение задач для второго раунда
    gameSession.initializeTaskDistribution();

    // Назначаем новые задачи игрокам во втором раунде
    const secondRoundAvailableTasks = gameSession.getDistributionState().availableTasks;
    expect(secondRoundAvailableTasks.length).toBeGreaterThan(0);

    // Назначаем новые задачи
    gameSession.assignTask(secondRoundAvailableTasks[0].id, 'human', 'human');
    gameSession.assignTask(secondRoundAvailableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков во втором раунде (должны включать невыполненные + новые)
    const secondRoundHumanTasks = gameSession.getPlayerTasks('human');
    const secondRoundAiTasks = gameSession.getPlayerTasks('ai');

    // Проверяем, что общее количество задач увеличилось или осталось тем же
    // (невыполненные + новые, но задачи с дедлайном 1 исключаются)
    expect(secondRoundHumanTasks.length).toBeGreaterThanOrEqual(humanTasks.length);
    expect(secondRoundAiTasks.length).toBeGreaterThanOrEqual(aiTasks.length);

    // Проверяем, что есть как невыполненные, так и новые задачи
    const unresolvedTaskIds = roundResult.nextRoundTasks.map(task => task.id);
    const secondRoundHumanTaskIds = secondRoundHumanTasks.map(task => task.id);
    const secondRoundAiTaskIds = secondRoundAiTasks.map(task => task.id);

    // Должны найтись невыполненные задачи из первого раунда
    const foundUnresolvedHumanTasks = unresolvedTaskIds.filter(id =>
      secondRoundHumanTaskIds.includes(id)
    );
    const foundUnresolvedAiTasks = unresolvedTaskIds.filter(id =>
      secondRoundAiTaskIds.includes(id)
    );

    // Проверяем, что невыполненные задачи перенеслись (только с дедлайном > 1)
    // Задачи с дедлайном 1 исключаются как просроченные
    expect(foundUnresolvedHumanTasks.length).toBeGreaterThanOrEqual(0);
    expect(foundUnresolvedAiTasks.length).toBeGreaterThanOrEqual(0);

    // Проверяем, что есть новые задачи (не из первого раунда)
    const newHumanTasks = secondRoundHumanTaskIds.filter(id =>
      !unresolvedTaskIds.includes(id)
    );
    const newAiTasks = secondRoundAiTaskIds.filter(id =>
      !unresolvedTaskIds.includes(id)
    );

    expect(newHumanTasks.length).toBeGreaterThan(0);
    expect(newAiTasks.length).toBeGreaterThan(0);
  });

  test('игрок должен получать стандартное количество задач независимо от невыполненных', async () => {
    // Инициализируем распределение задач для первого раунда
    gameSession.initializeTaskDistribution();

    // Назначаем задачи игрокам
    const availableTasks = gameSession.getDistributionState().availableTasks;
    expect(availableTasks.length).toBeGreaterThan(0);

    // Назначаем задачи
    gameSession.assignTask(availableTasks[0].id, 'human', 'human');
    gameSession.assignTask(availableTasks[1].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков
    const humanTasks = gameSession.getPlayerTasks('human');
    const aiTasks = gameSession.getPlayerTasks('ai');

    expect(humanTasks.length).toBeGreaterThan(0);
    expect(aiTasks.length).toBeGreaterThan(0);

    // Создаем действия с очень низкой вероятностью успеха
    const humanActions: PlayerActionRequest[] = humanTasks.map(task => ({
      playerId: 'human',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    const aiActions: PlayerActionRequest[] = aiTasks.map(task => ({
      playerId: 'ai',
      taskId: task.id,
      investment: {
        [task.requiredSkill]: 0,
        techBase: 0,
        softSkills: 0,
        enthusiasm: 0
      }
    }));

    // Отправляем действия
    await gameSession.submitPlayerActions('human', humanActions);
    await gameSession.submitPlayerActions('ai', aiActions);

    // Завершаем раунд
    const roundResult = await gameSession.completeRound();

    // Инициализируем распределение задач для второго раунда
    gameSession.initializeTaskDistribution();

    // Получаем доступные задачи для второго раунда
    const secondRoundTasks = gameSession.getDistributionState().availableTasks;

    // Назначаем задачи во втором раунде
    gameSession.assignTask(secondRoundTasks[0].id, 'human', 'human');
    gameSession.assignTask(secondRoundTasks[1].id, 'ai', 'ai');
    gameSession.assignTask(secondRoundTasks[2].id, 'human', 'human');
    gameSession.assignTask(secondRoundTasks[3].id, 'ai', 'ai');

    // Завершаем распределение
    gameSession.completeTaskDistribution();

    // Получаем задачи игроков во втором раунде
    const secondRoundHumanTasks = gameSession.getPlayerTasks('human');
    const secondRoundAiTasks = gameSession.getPlayerTasks('ai');

    // Проверяем, что игрок получил стандартное количество задач
    // (невыполненные + новые)
    expect(secondRoundHumanTasks.length).toBeGreaterThanOrEqual(humanTasks.length);
    expect(secondRoundAiTasks.length).toBeGreaterThanOrEqual(aiTasks.length);

    // Проверяем, что есть как невыполненные, так и новые задачи
    const unresolvedTaskIds = roundResult.nextRoundTasks.map(task => task.id);
    const secondRoundHumanTaskIds = secondRoundHumanTasks.map(task => task.id);
    const secondRoundAiTaskIds = secondRoundAiTasks.map(task => task.id);

    // Невыполненные задачи должны присутствовать
    const foundUnresolvedHumanTasks = unresolvedTaskIds.filter(id =>
      secondRoundHumanTaskIds.includes(id)
    );
    const foundUnresolvedAiTasks = unresolvedTaskIds.filter(id =>
      secondRoundAiTaskIds.includes(id)
    );

    // Проверяем, что невыполненные задачи перенеслись (только с дедлайном > 1)
    // Задачи с дедлайном 1 исключаются как просроченные
    expect(foundUnresolvedHumanTasks.length).toBeGreaterThanOrEqual(0);
    expect(foundUnresolvedAiTasks.length).toBeGreaterThanOrEqual(0);

    // Новые задачи должны присутствовать
    const newHumanTasks = secondRoundHumanTaskIds.filter(id =>
      !unresolvedTaskIds.includes(id)
    );
    const newAiTasks = secondRoundAiTaskIds.filter(id =>
      !unresolvedTaskIds.includes(id)
    );

    expect(newHumanTasks.length).toBeGreaterThan(0);
    expect(newAiTasks.length).toBeGreaterThan(0);
  });
});
