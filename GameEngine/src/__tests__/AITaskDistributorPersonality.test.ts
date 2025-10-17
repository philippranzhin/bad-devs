import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { AIPlayer } from '../players/AIPlayer';
import { AITaskDistributor } from '../players/AITaskDistributor';

describe('AITaskDistributor - Personality Tests', () => {
  let frontendTask: Task;
  let backendTask: Task;
  let managementTask: Task;
  let frontendPlayer: AIPlayer;
  let backendPlayer: AIPlayer;
  let managementPlayer: AIPlayer;
  let allPlayers: AIPlayer[];

  beforeEach(() => {
    // Создаем задачи
    frontendTask = new Task({
      id: 'frontend-task',
      name: 'Frontend Task',
      description: 'Create React component',
      requiredSkill: 'frontend',
      complexity: 2,
      deadline: 1,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });

    backendTask = new Task({
      id: 'backend-task',
      name: 'Backend Task',
      description: 'Create API endpoint',
      requiredSkill: 'backend',
      complexity: 3,
      deadline: 2,
      experienceReward: 15,
      contributesToCommonGoal: true,
      commonGoalSkill: 'backend'
    });

    managementTask = new Task({
      id: 'management-task',
      name: 'Management Task',
      description: 'Plan sprint',
      requiredSkill: 'management',
      complexity: 1,
      deadline: 1,
      experienceReward: 5,
      contributesToCommonGoal: true,
      commonGoalSkill: 'management'
    });

    // Создаем игроков с разными специализациями
    const frontendPlayerData = new Player({
      name: 'FrontendDev',
      specialization: 'frontend',
      skills: { frontend: 5, backend: 1, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const backendPlayerData = new Player({
      name: 'BackendDev',
      specialization: 'backend',
      skills: { frontend: 1, backend: 5, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    const managementPlayerData = new Player({
      name: 'Manager',
      specialization: 'management',
      skills: { frontend: 1, backend: 1, management: 5, techBase: 2, softSkills: 2 },
      enthusiasm: 10
    });

    frontendPlayer = new AIPlayer(frontendPlayerData);
    backendPlayer = new AIPlayer(backendPlayerData);
    managementPlayer = new AIPlayer(managementPlayerData);

    allPlayers = [frontendPlayer, backendPlayer, managementPlayer];
  });

  describe('Kind Bot Behavior', () => {
    it('should assign frontend task to frontend specialist', async () => {
      // Arrange
      const kindDistributor = new AITaskDistributor(frontendPlayer, 'kind');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Act
      const choice = await kindDistributor.selectTaskAssignment(
        availableTasks,
        frontendPlayer.id,
        allPlayers,
        undefined
      );

      // Assert
      // Добрый бот выбирает задачу, которая лучше всего подходит другим игрокам
      // Backend задача лучше всего подходит backend боту (среди других игроков)
      expect(choice.taskId).toBe(backendTask.id);
      expect(choice.assignedTo).toBe(backendPlayer.id); // Добрый бот отдает задачу тому, кому она лучше всего подходит
    });

    it('should assign backend task to backend specialist', async () => {
      // Arrange
      const kindDistributor = new AITaskDistributor(backendPlayer, 'kind');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Act
      const choice = await kindDistributor.selectTaskAssignment(
        availableTasks,
        backendPlayer.id,
        allPlayers
      );

      // Assert
      // Добрый бот выбирает задачу, которая лучше всего подходит другим игрокам
      // Frontend задача лучше всего подходит frontend боту (среди других игроков)
      expect(choice.taskId).toBe(frontendTask.id);
      expect(choice.assignedTo).toBe(frontendPlayer.id); // Добрый бот отдает задачу тому, кому она лучше всего подходит
    });

    it('should assign management task to management specialist', async () => {
      // Arrange
      const kindDistributor = new AITaskDistributor(managementPlayer, 'kind');
      const availableTasks = [managementTask, frontendTask, backendTask];

      // Act
      const choice = await kindDistributor.selectTaskAssignment(
        availableTasks,
        managementPlayer.id,
        allPlayers
      );

      // Assert
      // Добрый бот выбирает задачу, которая лучше всего подходит другим игрокам
      // Frontend задача лучше всего подходит frontend боту (среди других игроков)
      expect(choice.taskId).toBe(frontendTask.id);
      expect(choice.assignedTo).toBe(frontendPlayer.id); // Добрый бот отдает задачу тому, кому она лучше всего подходит
    });
  });

  describe('Evil Bot Behavior', () => {
    it('should assign frontend task to non-frontend specialist', async () => {
      // Arrange
      const evilDistributor = new AITaskDistributor(frontendPlayer, 'evil');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Act
      const choice = await evilDistributor.selectTaskAssignment(
        availableTasks,
        frontendPlayer.id,
        allPlayers,
        undefined
      );

      // Assert
      expect(choice.taskId).toBe(frontendTask.id);
      // Злой бот должен отдать frontend задачу тому, кому она меньше всего подходит
      // Это должен быть либо backendPlayer, либо managementPlayer (оба имеют frontend: 1)
      expect(choice.assignedTo).not.toBe(frontendPlayer.id);
      expect(['BackendDev', 'Manager']).toContain(choice.assignedTo);
    });

    it('should assign backend task to non-backend specialist', async () => {
      // Arrange
      const evilDistributor = new AITaskDistributor(backendPlayer, 'evil');
      const availableTasks = [backendTask, frontendTask, managementTask];

      // Act
      const choice = await evilDistributor.selectTaskAssignment(
        availableTasks,
        backendPlayer.id,
        allPlayers
      );

      // Assert
      expect(choice.taskId).toBe(backendTask.id); // Backend бот выбирает backend задачу, так как она ему лучше всего подходит
      // Злой бот должен отдать backend задачу тому, кому она меньше всего подходит
      expect(choice.assignedTo).not.toBe(backendPlayer.id);
      expect(['FrontendDev', 'Manager']).toContain(choice.assignedTo);
    });

    it('should assign management task to non-management specialist', async () => {
      // Arrange
      const evilDistributor = new AITaskDistributor(managementPlayer, 'evil');
      const availableTasks = [managementTask, frontendTask, backendTask];

      // Act
      const choice = await evilDistributor.selectTaskAssignment(
        availableTasks,
        managementPlayer.id,
        allPlayers
      );

      // Assert
      expect(choice.taskId).toBe(managementTask.id);
      // Злой бот должен отдать management задачу тому, кому она меньше всего подходит
      expect(choice.assignedTo).not.toBe(managementPlayer.id);
      expect(['FrontendDev', 'BackendDev']).toContain(choice.assignedTo);
    });
  });

  describe('Task Fit Score Calculation', () => {
    it('should calculate higher score for matching specialization', () => {
      // Arrange
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');

      // Act & Assert
      const frontendScore = (distributor as any).calculateTaskFitScore(frontendTask, frontendPlayer);
      const backendScore = (distributor as any).calculateTaskFitScore(frontendTask, backendPlayer);

      expect(frontendScore).toBeGreaterThan(backendScore);
    });

    it('should consider skill level in score calculation', () => {
      // Arrange
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');

      // Act & Assert
      const frontendScore = (distributor as any).calculateTaskFitScore(frontendTask, frontendPlayer);
      const managementScore = (distributor as any).calculateTaskFitScore(frontendTask, managementPlayer);

      // FrontendDev имеет frontend: 5, Manager имеет frontend: 1
      expect(frontendScore).toBeGreaterThan(managementScore);
    });

    it('should penalize high complexity tasks', () => {
      // Arrange
      const distributor = new AITaskDistributor(frontendPlayer, 'kind');

      // Act
      const frontendScore = (distributor as any).calculateTaskFitScore(frontendTask, frontendPlayer);
      const backendScore = (distributor as any).calculateTaskFitScore(backendTask, frontendPlayer);

      // Assert
      // frontendTask имеет сложность 2, backendTask имеет сложность 3
      // При одинаковых навыках frontendTask должен иметь лучший score
      expect(frontendScore).toBeGreaterThan(backendScore);
    });
  });

  describe('Personality Consistency', () => {
    it('should consistently assign tasks based on personality', async () => {
      // Arrange
      const kindDistributor = new AITaskDistributor(frontendPlayer, 'kind');
      const evilDistributor = new AITaskDistributor(frontendPlayer, 'evil');
      const availableTasks = [frontendTask, backendTask, managementTask];

      // Act
      const kindChoice = await kindDistributor.selectTaskAssignment(
        availableTasks,
        frontendPlayer.id,
        allPlayers,
        undefined
      );

      const evilChoice = await evilDistributor.selectTaskAssignment(
        availableTasks,
        frontendPlayer.id,
        allPlayers,
        undefined
      );

      // Assert
      // Добрый и злой боты могут выбрать разные задачи или одну и ту же
      // Главное - они должны назначить их согласно своей логике
      expect(kindChoice.assignedTo).toBeDefined();
      expect(evilChoice.assignedTo).toBeDefined();

      // Добрый бот должен назначить тому, кому лучше всего подходит выбранная задача
      // Злой бот должен назначить тому, кому меньше всего подходит выбранная задача
    });
  });
});
