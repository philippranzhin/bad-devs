import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('RoundResult with currentRoundTasks', () => {
  let gameSession: GameSession;
  let project: Project;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let humanPlayerData: Player;
  let aiPlayerData: Player;

  beforeEach(() => {
    // Создаем проект
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project description',
      requiredLevel: 1,
      requirements: {
        frontend: 10,
        backend: 10,
        management: 5
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.5,
        experienceReward: 100
      }
    });

    // Создаем игроков
    humanPlayerData = new Player({
      name: 'Human',
      specialization: 'frontend',
      skills: {
        frontend: 5,
        backend: 2,
        management: 1,
        techBase: 3,
        softSkills: 2
      },
      enthusiasm: 10,
      level: 1,
      experience: 0,
      money: 0,
      abilities: []
    });

    aiPlayerData = new Player({
      name: 'AI',
      specialization: 'backend',
      skills: {
        frontend: 2,
        backend: 5,
        management: 1,
        techBase: 3,
        softSkills: 2
      },
      enthusiasm: 10,
      level: 1,
      experience: 0,
      money: 0,
      abilities: []
    });

    humanPlayer = new HumanPlayer(humanPlayerData);
    aiPlayer = new AIPlayer(aiPlayerData);

    // Создаем настройки игры
    const settings = new GameSettings({
      rounds: 3,
      startingSkills: 10,
      enthusiasmPoints: 10,
      actionsPerTurn: 2,
      difficultyLevel: 5
    });

    // Создаем игровую сессию
    gameSession = new GameSession({
      id: 'test-session',
      project: project,
      players: [humanPlayer, aiPlayer],
      settings: settings,
      maxPlayers: 4
    });
  });

  test('RoundResult should include currentRoundTasks', async () => {
    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Получаем задачи из пула задач
    const taskPool = gameSession.getDistributionState().availableTasks;
    expect(taskPool.length).toBeGreaterThan(0);

    // Назначаем задачи вручную, чтобы создать раунд
    const task1 = taskPool[0];
    const task2 = taskPool[1] || taskPool[0]; // Если есть только одна задача, используем её

    // Назначаем задачи игрокам
    gameSession.assignTask(task1.id, humanPlayer.id, humanPlayer.id);
    if (task2.id !== task1.id) {
      gameSession.assignTask(task2.id, aiPlayer.id, aiPlayer.id);
    }

    // Завершаем распределение задач
    gameSession.completeTaskDistribution();

    // Получаем задачи раунда из currentRoundObj
    const roundTasks = gameSession.getCurrentRoundTasks();
    expect(roundTasks.length).toBeGreaterThan(0);
    
    // Получаем задачи из currentRoundObj для сравнения
    const currentRoundObjTasks = gameSession['currentRoundObj']?.tasks || [];

    // Создаем действия игроков только для существующих задач
    const humanActions = [];
    const aiActions = [];

    // Находим задачи для каждого игрока
    const humanTasks = gameSession.getPlayerTasks(humanPlayer.id);
    const aiTasks = gameSession.getPlayerTasks(aiPlayer.id);

    if (humanTasks.length > 0) {
      const task = humanTasks[0];
      const investment: any = {
        techBase: 1,
        enthusiasm: 1
      };
      
      // Добавляем основной навык в зависимости от типа задачи
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(3, humanPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(3, humanPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(3, humanPlayerData.skills.management);
      }

      humanActions.push({
        playerId: humanPlayer.id,
        taskId: task.id,
        investment
      });
    }

    if (aiTasks.length > 0) {
      const task = aiTasks[0];
      const investment: any = {
        techBase: 1,
        enthusiasm: 1
      };
      
      // Добавляем основной навык в зависимости от типа задачи
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(3, aiPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(3, aiPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(3, aiPlayerData.skills.management);
      }

      aiActions.push({
        playerId: aiPlayer.id,
        taskId: task.id,
        investment
      });
    }

    // Отправляем действия только если они есть
    if (humanActions.length > 0) {
      await gameSession.submitPlayerActions(humanPlayer.id, humanActions);
    }
    if (aiActions.length > 0) {
      await gameSession.submitPlayerActions(aiPlayer.id, aiActions);
    }

    // Завершаем раунд
    const roundResult = await gameSession.completeRound();

    // Проверяем, что RoundResult содержит currentRoundTasks
    expect(roundResult).toBeDefined();
    expect(roundResult.currentRoundTasks).toBeDefined();
    expect(Array.isArray(roundResult.currentRoundTasks)).toBe(true);
    expect(roundResult.currentRoundTasks.length).toBeGreaterThan(0);

    // Проверяем, что задачи в currentRoundTasks соответствуют задачам раунда
    expect(roundResult.currentRoundTasks.length).toBe(currentRoundObjTasks.length);

    // Проверяем, что все задачи из раунда присутствуют в currentRoundTasks
    console.log('CurrentRoundObj tasks:', currentRoundObjTasks.map(t => ({ id: t.id, name: t.name })));
    console.log('Current round tasks:', roundResult.currentRoundTasks.map(t => ({ id: t.id, name: t.name })));
    
    for (const task of currentRoundObjTasks) {
      const foundTask = roundResult.currentRoundTasks.find(t => t.id === task.id);
      expect(foundTask).toBeDefined();
      expect(foundTask?.name).toBe(task.name);
      expect(foundTask?.description).toBe(task.description);
      expect(foundTask?.requiredSkill).toBe(task.requiredSkill);
      expect(foundTask?.complexity).toBe(task.complexity);
    }

    // Проверяем, что playerActions ссылаются на задачи из currentRoundTasks
    for (const action of roundResult.playerActions) {
      const task = roundResult.currentRoundTasks.find(t => t.id === action.taskId);
      expect(task).toBeDefined();
    }
  });

  test('getCurrentRoundResult should include currentRoundTasks', async () => {
    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Получаем задачи из пула задач
    const taskPool = gameSession.getDistributionState().availableTasks;
    expect(taskPool.length).toBeGreaterThan(0);

    // Назначаем задачу вручную
    const task1 = taskPool[0];
    gameSession.assignTask(task1.id, humanPlayer.id, humanPlayer.id);

    // Завершаем распределение задач
    gameSession.completeTaskDistribution();

    // Получаем задачи раунда
    const roundTasks = gameSession.getCurrentRoundTasks();
    
    // Получаем задачи из currentRoundObj для сравнения
    const currentRoundObjTasks = gameSession['currentRoundObj']?.tasks || [];

    // Создаем действия игроков только для существующих задач
    const humanTasks = gameSession.getPlayerTasks(humanPlayer.id);

    if (humanTasks.length > 0) {
      const task = humanTasks[0];
      const investment: any = {
        techBase: 1,
        enthusiasm: 1
      };
      
      // Добавляем основной навык в зависимости от типа задачи
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(3, humanPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(3, humanPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(3, humanPlayerData.skills.management);
      }

      const humanActions = [
        {
          playerId: humanPlayer.id,
          taskId: task.id,
          investment
        }
      ];

      // Отправляем действия
      await gameSession.submitPlayerActions(humanPlayer.id, humanActions);
    }

    // Завершаем раунд
    await gameSession.completeRound();

    // Получаем результат через getCurrentRoundResult
    const roundResult = gameSession.getCurrentRoundResult();

    // Проверяем, что результат содержит currentRoundTasks
    expect(roundResult).toBeDefined();
    expect(roundResult?.currentRoundTasks).toBeDefined();
    expect(Array.isArray(roundResult?.currentRoundTasks)).toBe(true);
    expect(roundResult?.currentRoundTasks.length).toBeGreaterThan(0);
  });

  test('RoundResult should have consistent task data', async () => {
    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Получаем задачи из пула задач
    const taskPool = gameSession.getDistributionState().availableTasks;
    expect(taskPool.length).toBeGreaterThan(0);

    // Назначаем задачу вручную
    const task1 = taskPool[0];
    gameSession.assignTask(task1.id, humanPlayer.id, humanPlayer.id);

    // Завершаем распределение задач
    gameSession.completeTaskDistribution();

    // Получаем задачи раунда
    const roundTasks = gameSession.getCurrentRoundTasks();
    
    // Получаем задачи из currentRoundObj для сравнения
    const currentRoundObjTasks = gameSession['currentRoundObj']?.tasks || [];

    // Создаем действия игроков только для существующих задач
    const humanTasks = gameSession.getPlayerTasks(humanPlayer.id);

    if (humanTasks.length > 0) {
      const task = humanTasks[0];
      const investment: any = {
        techBase: 1,
        enthusiasm: 1
      };
      
      // Добавляем основной навык в зависимости от типа задачи
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(3, humanPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(3, humanPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(3, humanPlayerData.skills.management);
      }

      const humanActions = [
        {
          playerId: humanPlayer.id,
          taskId: task.id,
          investment
        }
      ];

      // Отправляем действия
      await gameSession.submitPlayerActions(humanPlayer.id, humanActions);

      // Завершаем раунд
      const roundResult = await gameSession.completeRound();

      // Проверяем консистентность данных задач
      for (const action of roundResult.playerActions) {
        const originalTask = currentRoundObjTasks.find(t => t.id === action.taskId);
        const resultTask = roundResult.currentRoundTasks.find(t => t.id === action.taskId);

        expect(originalTask).toBeDefined();
        expect(resultTask).toBeDefined();

        // Проверяем, что данные задач идентичны
        expect(resultTask?.id).toBe(originalTask?.id);
        expect(resultTask?.name).toBe(originalTask?.name);
        expect(resultTask?.description).toBe(originalTask?.description);
        expect(resultTask?.requiredSkill).toBe(originalTask?.requiredSkill);
        expect(resultTask?.complexity).toBe(originalTask?.complexity);
        expect(resultTask?.experienceReward).toBe(originalTask?.experienceReward);
      }
    }
  });
});
