import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Project Completion Bug', () => {
  let gameSession: GameSession;
  let project: Project;
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let humanPlayerData: Player;
  let aiPlayerData: Player;

  beforeEach(() => {
    // Создаем проект с низкими требованиями (как в клиенте)
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project description',
      requiredLevel: 1,
      requirements: {
        frontend: 15,  // Низкие требования
        backend: 20,
        management: 10
      },
      rewards: {
        baseSalary: 2000,
        bonusMultiplier: 1.5,
        experienceReward: 500
      }
    });

    // Создаем игроков с хорошими навыками
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

  test('should reproduce the "Cannot add progress to completed project" error', async () => {
    // Симулируем ситуацию, когда проект уже завершен, но мы пытаемся добавить прогресс

    // Сначала завершаем проект вручную
    project.addProgress('frontend', 15);
    project.addProgress('backend', 20);
    project.addProgress('management', 10);

    // Проверяем, что проект завершен
    expect(project.isCompleted).toBe(true);

    // Теперь пытаемся добавить прогресс в завершенный проект
    expect(() => {
      project.addProgress('frontend', 1);
    }).toThrow('Cannot add progress to completed project');
  });

  test('should handle project completion during round execution', async () => {
    // Симулируем ситуацию, когда проект завершается во время выполнения раунда

    // Сначала добавляем почти весь необходимый прогресс
    project.addProgress('frontend', 14); // Осталось 1
    project.addProgress('backend', 19);  // Осталось 1
    project.addProgress('management', 9); // Осталось 1

    // Проверяем, что проект еще не завершен
    expect(project.isCompleted).toBe(false);

    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Получаем задачи из пула задач
    const taskPool = gameSession.getDistributionState().availableTasks;
    expect(taskPool.length).toBeGreaterThan(0);

    // Назначаем задачи вручную
    const task1 = taskPool[0];
    gameSession.assignTask(task1.id, humanPlayer.id, humanPlayer.id);

    // Завершаем распределение задач
    gameSession.completeTaskDistribution();

    // Получаем задачи раунда
    const roundTasks = gameSession.getCurrentRoundTasks();

    // Создаем действия игроков, которые завершат проект
    const humanTasks = gameSession.getPlayerTasks(humanPlayer.id);

    if (humanTasks.length > 0) {
      const task = humanTasks[0];
      const investment: any = {
        techBase: 3,
        enthusiasm: 10
      };

      // Добавляем основной навык в зависимости от типа задачи (не больше чем есть у игрока)
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(5, humanPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(5, humanPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(5, humanPlayerData.skills.management);
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

      // Завершаем раунд - это может вызвать ошибку, если проект завершится
      try {
        const roundResult = await gameSession.completeRound();
        console.log('Round completed successfully, project completed:', roundResult.isProjectCompleted);
      } catch (error) {
        console.log('Error during round completion:', (error as Error).message);
        // Это ожидаемая ошибка, если проект завершается во время выполнения
        expect((error as Error).message).toContain('Cannot add progress to completed project');
      }
    }
  });

  test('should show project requirements are too low', () => {
    // Проверяем, что требования проекта действительно низкие
    const totalRequirements = project.requirements.frontend +
                             project.requirements.backend +
                             project.requirements.management;

    console.log('Project requirements:', project.requirements);
    console.log('Total requirements:', totalRequirements);

    // Требования должны быть достаточно высокими для многокраундовой игры
    // Но в клиенте они действительно низкие (45), что может приводить к быстрому завершению
    expect(totalRequirements).toBe(45); // Подтверждаем, что требования низкие
  });

  test('should handle project completion gracefully in GameSession', async () => {
    // Тест для проверки исправления в GameSession.updateProjectProgress

    // Сначала завершаем проект
    project.addProgress('frontend', 15);
    project.addProgress('backend', 20);
    project.addProgress('management', 10);

    // Проверяем, что проект завершен
    expect(project.isCompleted).toBe(true);

    // Инициализируем распределение задач
    gameSession.initializeTaskDistribution();

    // Получаем задачи из пула задач
    const taskPool = gameSession.getDistributionState().availableTasks;
    expect(taskPool.length).toBeGreaterThan(0);

    // Назначаем задачи вручную
    const task1 = taskPool[0];
    gameSession.assignTask(task1.id, humanPlayer.id, humanPlayer.id);

    // Завершаем распределение задач
    gameSession.completeTaskDistribution();

    // Получаем задачи раунда
    const roundTasks = gameSession.getCurrentRoundTasks();

    // Создаем действия игроков
    const humanTasks = gameSession.getPlayerTasks(humanPlayer.id);

    if (humanTasks.length > 0) {
      const task = humanTasks[0];
      const investment: any = {
        techBase: 1,
        enthusiasm: 1
      };

      // Добавляем основной навык в зависимости от типа задачи
      if (task.requiredSkill === 'frontend') {
        investment.frontend = Math.min(2, humanPlayerData.skills.frontend);
      } else if (task.requiredSkill === 'backend') {
        investment.backend = Math.min(2, humanPlayerData.skills.backend);
      } else if (task.requiredSkill === 'management') {
        investment.management = Math.min(2, humanPlayerData.skills.management);
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

      // Завершаем раунд - это должно работать без ошибок, даже если проект завершен
      const roundResult = await gameSession.completeRound();

      // Проверяем результат
      expect(roundResult).toBeDefined();
      expect(roundResult.isProjectCompleted).toBe(true);
    }
  });
});
