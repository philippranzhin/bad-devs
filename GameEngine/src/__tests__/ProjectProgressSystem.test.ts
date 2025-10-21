import { Project } from '../models/Project';
import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { HumanPlayer } from '../players/HumanPlayer';
import { AIPlayer } from '../players/AIPlayer';
import { TaskGenerator } from '../services/TaskGenerator';

describe('Project Progress System', () => {
  let project: Project;
  let settings: GameSettings;
  let players: Player[];
  let humanPlayer: HumanPlayer;
  let aiPlayer: AIPlayer;
  let gameSession: GameSession;
  let humanPlayerData: Player;
  let aiPlayerData: Player;

  beforeEach(() => {
    // Создаем проект с требованиями
    project = new Project({
      id: 'test-project',
      name: 'Test Project',
      description: 'Test project for progress system',
      requiredLevel: 1,
      requirements: {
        frontend: 20,
        backend: 15,
        management: 10
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.2,
        experienceReward: 100
      }
    });

    settings = new GameSettings({
      actionsPerTurn: 3,
      allowUnlimitedActions: true
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

    aiPlayerData = new Player({
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

    gameSession = new GameSession({
      id: 'session-1',
      project,
      players: [humanPlayer, aiPlayer],
      settings,
      maxPlayers: 4
    });
  });

  describe('Project Completion Detection', () => {
    it('should detect when project is completed', () => {
      // Arrange
      project.addProgress('frontend', 20);
      project.addProgress('backend', 15);
      project.addProgress('management', 10);

      // Assert
      expect(project.isCompleted).toBe(true);
      expect(project.isProjectCompleted()).toBe(true);
    });

    it('should detect when project is not completed', () => {
      // Arrange
      project.addProgress('frontend', 10);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Assert
      expect(project.isCompleted).toBe(false);
      expect(project.isProjectCompleted()).toBe(false);
    });

    it('should detect when specific direction is completed', () => {
      // Arrange
      project.addProgress('frontend', 20);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Assert
      expect(project.isCompleted).toBe(false);
      expect(project.currentProgress.frontend).toBe(20);
      expect(project.currentProgress.frontend).toBeGreaterThanOrEqual(project.requirements.frontend);
    });
  });

  describe('Task Generation Based on Progress', () => {
    it('should generate tasks only for incomplete directions when some directions are completed', () => {
      // Arrange - завершаем frontend направление
      project.addProgress('frontend', 20);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Act - генерируем задачи
      const taskGenerator = new TaskGenerator(settings);
      const tasks = taskGenerator.generateTasksForRound(1, 2, project);

      // Assert - все задачи должны быть только по backend или management
      tasks.forEach(task => {
        expect(['backend', 'management']).toContain(task.requiredSkill);
        expect(task.requiredSkill).not.toBe('frontend');
      });
    });

    it('should generate tasks for all directions when none are completed', () => {
      // Arrange - проект не завершен
      project.addProgress('frontend', 5);
      project.addProgress('backend', 3);
      project.addProgress('management', 2);

      // Act - генерируем задачи
      const taskGenerator = new TaskGenerator(settings);
      const tasks = taskGenerator.generateTasksForRound(1, 2, project);

      // Assert - задачи могут быть по любому направлению, но с учетом приоритизации
      const skillTypes = tasks.map(task => task.requiredSkill);
      
      // Проверяем, что есть задачи по всем направлениям (может быть неравномерно из-за приоритизации)
      const uniqueSkills = [...new Set(skillTypes)];
      expect(uniqueSkills.length).toBeGreaterThanOrEqual(2); // Минимум 2 направления
      
      // Проверяем, что есть задачи по backend и management (они менее завершены)
      expect(skillTypes).toContain('backend');
      expect(skillTypes).toContain('management');
    });

    it('should not generate tasks when project is fully completed', () => {
      // Arrange - проект полностью завершен
      project.addProgress('frontend', 20);
      project.addProgress('backend', 15);
      project.addProgress('management', 10);

      // Act - генерируем задачи
      const taskGenerator = new TaskGenerator(settings);
      const tasks = taskGenerator.generateTasksForRound(1, 2, project);

      // Assert - задач не должно быть
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Game Session Integration', () => {
    it('should stop generating tasks when project is completed', async () => {
      // Arrange - завершаем проект
      project.addProgress('frontend', 20);
      project.addProgress('backend', 15);
      project.addProgress('management', 10);

      // Act - пытаемся инициализировать распределение задач
      gameSession.initializeTaskDistribution();

      // Assert - задач не должно быть
      const tasks = gameSession.getCurrentRoundTasks();
      expect(tasks).toHaveLength(0);
    });

    it('should continue game when project is not completed', async () => {
      // Arrange - проект не завершен
      project.addProgress('frontend', 10);
      project.addProgress('backend', 5);
      project.addProgress('management', 3);

      // Act - инициализируем распределение задач
      gameSession.initializeTaskDistribution();

      // Assert - задачи должны быть сгенерированы
      const tasks = gameSession.getCurrentRoundTasks();
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should update project progress after round completion', async () => {
      // Arrange
      gameSession.initializeTaskDistribution();
      const tasks = gameSession.getCurrentRoundTasks();
      
      // Назначаем задачи
      if (tasks.length > 0) {
        gameSession.assignTask(tasks[0].id, 'human', 'human');
        if (tasks.length > 1) {
          gameSession.assignTask(tasks[1].id, 'ai', 'ai');
        }
      }
      gameSession.completeTaskDistribution();

      // Выполняем действия
      const humanTasks = gameSession.getPlayerTasks('human');
      if (humanTasks.length > 0) {
        const task = humanTasks[0];
        // Используем данные игрока из beforeEach
        const playerSkills = humanPlayerData.skills;
        const skillAmount = playerSkills[task.requiredSkill as keyof typeof playerSkills] || 0;
        
        const actions = [{
          playerId: 'human',
          taskId: task.id,
          investment: {
            [task.requiredSkill]: Math.min(3, skillAmount),
            techBase: 0,
            softSkills: 0,
            enthusiasm: 0
          }
        }];
        await gameSession.submitPlayerActions('human', actions);
      }

      // Act - завершаем раунд
      const roundResult = await gameSession.completeRound();

      // Assert - прогресс должен обновиться
      expect(roundResult.projectProgress).toBeDefined();
      expect(roundResult.projectProgress.frontend).toBeGreaterThanOrEqual(0);
      expect(roundResult.projectProgress.backend).toBeGreaterThanOrEqual(0);
      expect(roundResult.projectProgress.management).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Progressive Task Generation', () => {
    it('should generate fewer tasks as project progresses', () => {
      // Arrange - частично завершенный проект
      project.addProgress('frontend', 20); // Завершено
      project.addProgress('backend', 10);  // Частично завершено
      project.addProgress('management', 3); // Почти не завершено

      // Act - генерируем задачи
      const taskGenerator = new TaskGenerator(settings);
      const tasks = taskGenerator.generateTasksForRound(1, 2, project);

      // Assert - задачи только по незавершенным направлениям
      tasks.forEach(task => {
        expect(['backend', 'management']).toContain(task.requiredSkill);
        expect(task.requiredSkill).not.toBe('frontend');
      });
    });

    it('should prioritize tasks for least completed directions', () => {
      // Arrange - management почти не завершено
      project.addProgress('frontend', 20); // Завершено
      project.addProgress('backend', 15);  // Завершено
      project.addProgress('management', 2); // Почти не завершено

      // Act - генерируем много задач
      const taskGenerator = new TaskGenerator(settings);
      const tasks = taskGenerator.generateTasksForRound(1, 10);

      // Assert - большинство задач должны быть по management (из-за приоритизации)
      const managementTasks = tasks.filter(task => task.requiredSkill === 'management');
      expect(managementTasks.length).toBeGreaterThan(tasks.length * 0.3); // 30%+ должны быть management
    });
  });
});
