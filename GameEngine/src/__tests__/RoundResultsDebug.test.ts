import { PlayerActionRequest } from '../interfaces/PlayerInterface';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('Round Results Task Resolution Debug', () => {
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
      description: 'Test project for debug',
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

  test('должен корректно включать все задачи в currentRoundTasks', async () => {
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

    // Получаем все задачи раунда ПЕРЕД завершением
    const allRoundTasksBefore = gameSession.getAllRoundTasks();
    console.log('📋 All round tasks before completeRound:', allRoundTasksBefore.length);

    // Завершаем первый раунд
    const roundResult = await gameSession.completeRound();

    // Проверяем, что currentRoundTasks содержит все задачи
    expect(roundResult.currentRoundTasks.length).toBeGreaterThan(0);

    // Проверяем, что все действия могут найти свои задачи
    for (const action of roundResult.playerActions) {
      const task = roundResult.currentRoundTasks.find(t => t.id === action.taskId);
      expect(task).toBeDefined();
      console.log(`✅ Action ${action.taskId} found task: ${task?.name}`);
    }

    console.log('📊 Round result summary:');
    console.log('  Player actions:', roundResult.playerActions.length);
    console.log('  Current round tasks:', roundResult.currentRoundTasks.length);
    console.log('  Next round tasks:', roundResult.nextRoundTasks.length);
  });
});
