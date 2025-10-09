import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('GameSession - New Methods Tests', () => {
  let project: Project;
  let settings: GameSettings;
  let players: Player[];
  let aiPlayers: AIPlayer[];
  let humanPlayer: HumanPlayer;
  let session: GameSession;

  beforeEach(() => {
    project = new Project({
      id: 'proj-1',
      name: 'Test Project',
      description: 'Test',
      requiredLevel: 1,
      requirements: { frontend: 20, backend: 15, management: 10 },
      rewards: { baseSalary: 500, bonusMultiplier: 1.2, experienceReward: 50 }
    });

    settings = new GameSettings();

    players = [
      new Player({
        name: 'AI1',
        specialization: 'frontend',
        skills: { frontend: 5, backend: 2, management: 1, techBase: 2, softSkills: 1 },
        enthusiasm: 10,
        experience: 20
      }),
      new Player({
        name: 'AI2',
        specialization: 'backend',
        skills: { frontend: 2, backend: 5, management: 1, techBase: 2, softSkills: 1 },
        enthusiasm: 10,
        experience: 20
      })
    ];

    const humanPlayerData = new Player({
      name: 'Фил',
      specialization: 'management',
      skills: { frontend: 1, backend: 1, management: 5, techBase: 2, softSkills: 1 },
      enthusiasm: 10,
      experience: 20
    });

    aiPlayers = players.map(player => new AIPlayer(player));
    humanPlayer = new HumanPlayer(humanPlayerData);

    session = new GameSession({
      id: 'session-1',
      project,
      players: [humanPlayer, ...aiPlayers],
      settings,
      maxPlayers: 4
    });
  });

  describe('processCurrentAITurn', () => {
    beforeEach(() => {
      session.initializeTaskDistribution();
    });

    it('should process AI turn and assign task', async () => {
      // Arrange
      const initialState = session.getDistributionState();
      const initialAssignedCount = initialState.assignedTasks.length;
      const currentPlayerId = initialState.currentPlayerId;

      // Act
      await session.processCurrentAITurn();

      // Assert
      const afterState = session.getDistributionState();
      expect(afterState.assignedTasks.length).toBe(initialAssignedCount + 1);

      // Check that the task was assigned to the current player
      const lastAssignment = afterState.assignedTasks[afterState.assignedTasks.length - 1];
      expect(lastAssignment.assignedTo).toBe(currentPlayerId);
      expect(lastAssignment.assignedBy).toBe(currentPlayerId);
    });

    it('should throw error when no active distribution', async () => {
      // Arrange - complete distribution first
      const tasks = session.getCurrentRoundTasks();
      tasks.forEach((task, index) => {
        const playerId = `AI${(index % 2) + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });
      session.completeTaskDistribution();

      // Act & Assert
      await expect(session.processCurrentAITurn()).rejects.toThrow('No active task distribution');
    });

    it('should handle case when no tasks available', async () => {
      // Arrange - assign all tasks
      const tasks = session.getCurrentRoundTasks();
      tasks.forEach((task, index) => {
        const playerId = `AI${(index % 2) + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });

      // Act - should not throw, but also not assign anything
      await session.processCurrentAITurn();

      // Assert - no new assignments
      const state = session.getDistributionState();
      expect(state.assignedTasks.length).toBe(tasks.length);
    });
  });

  describe('previewCurrentAIChoice', () => {
    beforeEach(() => {
      session.initializeTaskDistribution();
    });

    it('should preview AI choice without assigning', async () => {
      // Arrange
      const initialState = session.getDistributionState();
      const initialAssignedCount = initialState.assignedTasks.length;

      // Act
      const preview = await session.previewCurrentAIChoice();

      // Assert
      expect(preview).not.toBeNull();
      expect(preview).toHaveProperty('taskId');
      expect(preview).toHaveProperty('assignedTo');
      expect(preview).toHaveProperty('assignedBy');

      // Should not have actually assigned anything
      const afterState = session.getDistributionState();
      expect(afterState.assignedTasks.length).toBe(initialAssignedCount);
    });

    it('should return null when no active distribution', async () => {
      // Arrange - complete distribution first
      const tasks = session.getCurrentRoundTasks();
      tasks.forEach((task, index) => {
        const playerId = `AI${(index % 2) + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });
      session.completeTaskDistribution();

      // Act
      const preview = await session.previewCurrentAIChoice();

      // Assert
      expect(preview).toBeNull();
    });

    it('should return null when no tasks available', async () => {
      // Arrange - assign all tasks
      const tasks = session.getCurrentRoundTasks();
      tasks.forEach((task, index) => {
        const playerId = `AI${(index % 2) + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });

      // Act
      const preview = await session.previewCurrentAIChoice();

      // Assert
      expect(preview).toBeNull();
    });

    it('should return consistent preview for same state', async () => {
      // Act - get preview twice
      const preview1 = await session.previewCurrentAIChoice();
      const preview2 = await session.previewCurrentAIChoice();

      // Assert - should be the same (AI makes deterministic choice)
      expect(preview1).toEqual(preview2);
    });
  });

  describe('getCurrentPlayerId edge cases', () => {
    beforeEach(() => {
      session.initializeTaskDistribution();
    });

    it('should return correct player ID for human player turn', () => {
      // Arrange - assign tasks to AI players first to get to human turn
      const tasks = session.getCurrentRoundTasks();
      const aiTasks = tasks.slice(0, 2); // Take first 2 tasks for AI players

      aiTasks.forEach((task, index) => {
        const playerId = `AI${index + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });

      // Act
      const state = session.getDistributionState();
      const currentPlayerId = state.currentPlayerId;

      // Assert
      expect(currentPlayerId).toBe('Фил');
    });

    it('should return null when distribution is complete', () => {
      // Arrange - complete distribution
      const tasks = session.getCurrentRoundTasks();
      tasks.forEach((task, index) => {
        const playerId = `AI${(index % 2) + 1}`;
        session.assignTask(task.id, playerId, playerId);
      });
      session.completeTaskDistribution();

      // Act
      const state = session.getDistributionState();
      const currentPlayerId = state.currentPlayerId;

      // Assert
      expect(currentPlayerId).toBeNull();
    });

    it('should cycle through players correctly', () => {
      // Arrange
      const tasks = session.getCurrentRoundTasks();
      const state1 = session.getDistributionState();
      const firstPlayerId = state1.currentPlayerId;

      // Act - assign one task
      session.assignTask(tasks[0].id, firstPlayerId!, firstPlayerId!);

      const state2 = session.getDistributionState();
      const secondPlayerId = state2.currentPlayerId;

      // Assert
      expect(secondPlayerId).not.toBe(firstPlayerId);
      expect(['AI1', 'AI2', 'Фил']).toContain(secondPlayerId);
    });
  });

  describe('TaskDistribution integration', () => {
    beforeEach(() => {
      session.initializeTaskDistribution();
    });

    it('should maintain correct player order', () => {
      // Arrange
      const tasks = session.getCurrentRoundTasks();
      const expectedOrder = ['AI1', 'AI2', 'Фил']; // Based on player creation order
      const actualOrder: string[] = [];

      // Act - assign tasks and track order
      for (let i = 0; i < Math.min(tasks.length, 3); i++) {
        const state = session.getDistributionState();
        const currentPlayerId = state.currentPlayerId;
        if (currentPlayerId) {
          actualOrder.push(currentPlayerId);
          session.assignTask(tasks[i].id, currentPlayerId, currentPlayerId);
        }
      }

      // Assert
      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should handle task limits correctly', () => {
      // Arrange
      const tasks = session.getCurrentRoundTasks();
      const maxTasksPerPlayer = settings.actionsPerTurn;

      // Act - assign max tasks to first player
      for (let i = 0; i < maxTasksPerPlayer && i < tasks.length; i++) {
        const state = session.getDistributionState();
        const currentPlayerId = state.currentPlayerId;
        if (currentPlayerId) {
          session.assignTask(tasks[i].id, currentPlayerId, currentPlayerId);
        }
      }

      // Assert - first player should have max tasks
      const state = session.getDistributionState();
      const firstPlayerTasks = state.assignedTasks.filter(a => a.assignedTo === 'AI1');
      expect(firstPlayerTasks.length).toBe(maxTasksPerPlayer);
    });
  });
});

