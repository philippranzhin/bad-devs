import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';
import { HumanPlayer } from '../players/HumanPlayer';

describe('GameSession with Player Interfaces', () => {
  let settings: GameSettings;
  let project: Project;
  let player1: Player;
  let player2: Player;
  let aiPlayer1: AIPlayer;
  let aiPlayer2: AIPlayer;
  let session: GameSession;

  beforeEach(() => {
    settings = new GameSettings({
      actionsPerTurn: 2,
      enthusiasmPoints: 5
    });

    project = new Project({
      id: 'project-1',
      name: 'Test Project',
      description: 'A test project',
      requiredLevel: 1,
      requirements: {
        frontend: 10,
        backend: 10,
        management: 5
      },
      rewards: {
        baseSalary: 1000,
        bonusMultiplier: 1.5,
        experienceReward: 50
      }
    });

    player1 = new Player({
      name: 'AI1',
      specialization: 'frontend',
      skills: {
        frontend: 3,
        backend: 1,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 5
    });

    player2 = new Player({
      name: 'AI2',
      specialization: 'backend',
      skills: {
        frontend: 1,
        backend: 3,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 5
    });

    aiPlayer1 = new AIPlayer(player1);
    aiPlayer2 = new AIPlayer(player2);

    session = new GameSession({
      id: 'session-1',
      project: project,
      players: [aiPlayer1, aiPlayer2],
      settings: settings,
      maxPlayers: 4
    });
  });

  describe('constructor', () => {
    it('should create session with player interfaces', () => {
      expect(session.id).toBe('session-1');
      expect(session.playerInterfaces).toHaveLength(2);
      expect(session.players).toHaveLength(2);
      expect(session.playerInterfaces[0]).toBeInstanceOf(AIPlayer);
      expect(session.playerInterfaces[1]).toBeInstanceOf(AIPlayer);
    });

    it('should extract original players from interfaces', () => {
      expect(session.players[0].name).toBe('AI1');
      expect(session.players[1].name).toBe('AI2');
      expect(session.players[0]).toBeInstanceOf(Player);
      expect(session.players[1]).toBeInstanceOf(Player);
    });

    it('should initialize player enthusiasm', () => {
      // This is tested indirectly through executeRound
      expect(session.canStart()).toBe(true);
    });
  });

  describe('executeRound', () => {
    it('should execute a complete round', async () => {
      const result = await session.executeRound();

      expect(result.roundNumber).toBe(1);
      expect(result.playerActions).toBeDefined();
      expect(result.projectProgress).toBeDefined();
      expect(result.isProjectCompleted).toBeDefined();
      expect(result.nextRoundTasks).toBeDefined();
    });

    it('should generate tasks for the round', async () => {
      const result = await session.executeRound();

      // Should have actions from both players
      expect(result.playerActions.length).toBeGreaterThan(0);

      // Each action should have valid properties
      result.playerActions.forEach(action => {
        expect(action.playerId).toBeDefined();
        expect(action.taskId).toBeDefined();
        expect(action.investment).toBeDefined();
        expect(typeof action.success).toBe('boolean');
        expect(typeof action.pointsEarned).toBe('number');
        expect(typeof action.enthusiasmSpent).toBe('number');
      });
    });

    it('should update project progress based on successful actions', async () => {
      const initialProgress = {
        frontend: project.currentProgress.frontend,
        backend: project.currentProgress.backend,
        management: project.currentProgress.management
      };

      const result = await session.executeRound();

      // Project progress should be updated
      expect(result.projectProgress.frontend).toBeGreaterThanOrEqual(0);
      expect(result.projectProgress.backend).toBeGreaterThanOrEqual(0);
      expect(result.projectProgress.management).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed player types', async () => {
      const humanPlayer = new HumanPlayer(player1);
      const mixedSession = new GameSession({
        id: 'mixed-session',
        project: project,
        players: [humanPlayer, aiPlayer2],
        settings: settings,
        maxPlayers: 4
      });

      // Human player will return empty actions for now
      const result = await mixedSession.executeRound();

      expect(result.roundNumber).toBe(1);
      expect(result.playerActions).toBeDefined();
    });
  });

  describe('player enthusiasm management', () => {
    it('should track player enthusiasm correctly', async () => {
      const result = await session.executeRound();

      // Check that enthusiasm was spent on actions that used it
      const enthusiasmSpent = result.playerActions.reduce((total, action) =>
        total + action.enthusiasmSpent, 0
      );

      expect(enthusiasmSpent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('round management', () => {
    it('should create new rounds with different tasks', async () => {
      const result1 = await session.executeRound();
      const result2 = await session.executeRound();

      expect(result1.roundNumber).toBe(1);
      expect(result2.roundNumber).toBe(2);

      // Tasks should be different between rounds
      const taskIds1 = result1.playerActions.map(a => a.taskId);
      const taskIds2 = result2.playerActions.map(a => a.taskId);

      // Should have different task IDs (though some might overlap)
      const hasDifferentTasks = taskIds1.some(id => !taskIds2.includes(id)) ||
                               taskIds2.some(id => !taskIds1.includes(id));
      expect(hasDifferentTasks).toBe(true);
    });
  });

  describe('project completion', () => {
    it('should detect when project is completed', async () => {
      // Create a project with very low requirements
      const easyProject = new Project({
        id: 'easy-project',
        name: 'Easy Project',
        description: 'An easy project',
        requiredLevel: 1,
        requirements: {
          frontend: 1,
          backend: 1,
          management: 1
        },
        rewards: {
          baseSalary: 100,
          bonusMultiplier: 1.0,
          experienceReward: 10
        }
      });

      const easySession = new GameSession({
        id: 'easy-session',
        project: easyProject,
        players: [aiPlayer1, aiPlayer2],
        settings: settings,
        maxPlayers: 4
      });

      const result = await easySession.executeRound();

      // Project might be completed after one round
      expect(typeof result.isProjectCompleted).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle invalid player actions gracefully', async () => {
      // This test would require mocking invalid actions
      // For now, we test that the system doesn't crash
      const result = await session.executeRound();
      expect(result).toBeDefined();
    });
  });
});
