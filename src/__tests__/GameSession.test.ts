import { GameSession } from '../models/GameSession';
import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Project } from '../models/Project';
import { AIPlayer } from '../players/AIPlayer';

describe('GameSession (Legacy Tests)', () => {
  let project: Project;
  let settings: GameSettings;
  let players: Player[];
  let aiPlayers: AIPlayer[];

  beforeEach(() => {
    project = new Project({
      id: 'proj-1',
      name: 'Test Project',
      description: 'Test',
      requiredLevel: 2,
      requirements: { frontend: 20, backend: 15, management: 10 },
      rewards: { baseSalary: 500, bonusMultiplier: 1.2, experienceReward: 50 }
    });

    settings = new GameSettings();

    players = [
      new Player({
        name: 'Player1',
        specialization: 'frontend',
        skills: { frontend: 5, backend: 2, management: 1, techBase: 2, softSkills: 1 },
        enthusiasm: 10,
        experience: 20 // уровень 3
      }),
      new Player({
        name: 'Player2',
        specialization: 'backend',
        skills: { frontend: 2, backend: 5, management: 1, techBase: 2, softSkills: 1 },
        enthusiasm: 10,
        experience: 20 // уровень 3
      })
    ];

    aiPlayers = players.map(player => new AIPlayer(player));
  });

  describe('creation', () => {
    it('should create session with specified max players', () => {
      // Arrange & Act
      const session = new GameSession({
        id: 'session-1',
        project,
        players: aiPlayers,
        settings,
        maxPlayers: 3
      });

      // Assert
      expect(session.id).toBe('session-1');
      expect(session.maxPlayers).toBe(3);
      expect(session.players).toHaveLength(2);
      expect(session.isActive).toBe(true);
      expect(session.currentRound).toBe(1);
      expect(session.project).toBe(project);
      expect(session.settings).toBe(settings);
    });

    it('should create session with custom max players', () => {
      // Arrange & Act
      const session = new GameSession({
        id: 'session-1',
        project,
        players: aiPlayers,
        settings,
        maxPlayers: 5
      });

      // Assert
      expect(session.maxPlayers).toBe(5);
    });
  });

  describe('session status', () => {
    it('should check if session is full', () => {
      // Arrange
      const session = new GameSession({
        id: 'session-1',
        project,
        players: aiPlayers,
        settings,
        maxPlayers: 2
      });

      // Act & Assert
      expect(session.isSessionFull()).toBe(true);
    });

    it('should check if session can start', () => {
      // Arrange
      const session = new GameSession({
        id: 'session-1',
        project,
        players: aiPlayers,
        settings,
        maxPlayers: 3
      });

      // Act & Assert
      expect(session.canStart()).toBe(true);
    });

    it('should end session', () => {
      // Arrange
      const session = new GameSession({
        id: 'session-1',
        project,
        players: aiPlayers,
        settings,
        maxPlayers: 3
      });

      // Act
      session.endSession();

      // Assert
      expect(session.isActive).toBe(false);
      expect(session.canStart()).toBe(false);
    });
  });

  describe('validation', () => {
    it('should throw error for empty players list', () => {
      // Arrange & Act & Assert
      expect(() => {
        new GameSession({
          id: 'session-1',
          project,
          players: [],
          settings,
          maxPlayers: 3
        });
      }).toThrow('Game session must have at least one player');
    });

    it('should throw error for too many players', () => {
      // Arrange
      const tooManyPlayers = [
        ...players,
        new Player({
          name: 'Player3',
          specialization: 'management',
          skills: { frontend: 1, backend: 1, management: 5, techBase: 2, softSkills: 1 },
          enthusiasm: 10,
          experience: 20
        }),
        new Player({
          name: 'Player4',
          specialization: 'fullstack',
          skills: { frontend: 3, backend: 3, management: 1, techBase: 2, softSkills: 1 },
          enthusiasm: 10,
          experience: 20
        })
      ];

      // Act & Assert
      expect(() => {
        new GameSession({
          id: 'session-1',
          project,
          players: tooManyPlayers.map(p => new AIPlayer(p)),
          settings,
          maxPlayers: 3
        });
      }).toThrow('Cannot have more than 3 players');
    });

    it('should throw error for player with too low level', () => {
      // Arrange
      const lowLevelPlayer = new Player({
        name: 'LowLevel',
        specialization: 'frontend',
        skills: { frontend: 1, backend: 1, management: 1, techBase: 1, softSkills: 1 },
        enthusiasm: 10,
        experience: 0 // уровень 1
      });

      // Act & Assert
      expect(() => {
        new GameSession({
          id: 'session-1',
          project, // требует уровень 2
          players: [new AIPlayer(lowLevelPlayer)],
          settings,
          maxPlayers: 3
        });
      }).toThrow('Player LowLevel level 1 is too low for project requiring level 2');
    });

    it('should allow players with sufficient level', () => {
      // Arrange
      const highLevelPlayer = new Player({
        name: 'HighLevel',
        specialization: 'frontend',
        skills: { frontend: 5, backend: 2, management: 1, techBase: 2, softSkills: 1 },
        enthusiasm: 10,
        experience: 50 // уровень 6
      });

      // Act & Assert - не должно быть ошибки
      expect(() => {
        new GameSession({
          id: 'session-1',
          project, // требует уровень 2
          players: [new AIPlayer(highLevelPlayer)],
          settings,
          maxPlayers: 3
        });
      }).not.toThrow();
    });
  });
});
