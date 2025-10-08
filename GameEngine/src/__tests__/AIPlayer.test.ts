import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { AIPlayer } from '../players/AIPlayer';

describe('AIPlayer', () => {
  let settings: GameSettings;
  let player: Player;
  let aiPlayer: AIPlayer;

  beforeEach(() => {
    settings = new GameSettings();
    player = new Player({
      name: 'TestAI',
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
    aiPlayer = new AIPlayer(player);
  });

  describe('constructor', () => {
    it('should create AI player with correct id and name', () => {
      expect(aiPlayer.id).toBe('TestAI');
      expect(aiPlayer.name).toBe('TestAI');
    });
  });

  describe('selectActions', () => {
    it('should select actions based on available tasks', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Frontend Task',
          description: 'Test frontend task',
          requiredSkill: 'frontend',
          complexity: 2,
          deadline: 1,
          experienceReward: 10,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        }),
        new Task({
          id: 'task2',
          name: 'Backend Task',
          description: 'Test backend task',
          requiredSkill: 'backend',
          complexity: 3,
          deadline: 2,
          experienceReward: 15,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actions = await aiPlayer.selectActions(tasks, 2, 5);

      expect(actions).toHaveLength(2);
      expect(actions[0].playerId).toBe('TestAI');
      expect(actions[1].playerId).toBe('TestAI');
      expect(actions[0].taskId).toBeDefined();
      expect(actions[1].taskId).toBeDefined();
    });

    it('should prefer tasks matching player specialization', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Frontend Task',
          description: 'Test frontend task',
          requiredSkill: 'frontend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        }),
        new Task({
          id: 'task2',
          name: 'Backend Task',
          description: 'Test backend task',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actions = await aiPlayer.selectActions(tasks, 1, 5);

      expect(actions).toHaveLength(1);
      expect(actions[0].taskId).toBe('task1'); // Should prefer frontend task
    });

    it('should limit actions to maxActions parameter', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          requiredSkill: 'frontend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        }),
        new Task({
          id: 'task2',
          name: 'Task 2',
          description: 'Test task 2',
          requiredSkill: 'frontend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        }),
        new Task({
          id: 'task3',
          name: 'Task 3',
          description: 'Test task 3',
          requiredSkill: 'frontend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        })
      ];

      const actions = await aiPlayer.selectActions(tasks, 2, 5);

      expect(actions).toHaveLength(2);
    });

    it('should return empty array when no tasks available', async () => {
      const actions = await aiPlayer.selectActions([], 2, 5);

      expect(actions).toHaveLength(0);
    });
  });

  describe('investment calculation', () => {
    it('should invest skills matching task requirement', async () => {
      const task = new Task({
        id: 'task1',
        name: 'Frontend Task',
        description: 'Test frontend task',
        requiredSkill: 'frontend',
        complexity: 2,
        deadline: 1,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      });

      const actions = await aiPlayer.selectActions([task], 1, 5);

      expect(actions).toHaveLength(1);
      expect(actions[0].investment.frontend).toBeDefined();
      expect(actions[0].investment.frontend).toBeLessThanOrEqual(3); // Player has 3 frontend skill
    });

    it('should invest enthusiasm when needed', async () => {
      const task = new Task({
        id: 'task1',
        name: 'Complex Task',
        description: 'Test complex task',
        requiredSkill: 'frontend',
        complexity: 5, // Higher than player skill
        deadline: 1,
        experienceReward: 20,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      });

      const actions = await aiPlayer.selectActions([task], 1, 5);

      expect(actions).toHaveLength(1);
      expect(actions[0].investment.enthusiasm).toBeDefined();
      expect(actions[0].investment.enthusiasm).toBeLessThanOrEqual(1);
    });
  });

  describe('event handlers', () => {
    it('should handle round start events', () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Test Task',
          description: 'Test task',
          requiredSkill: 'frontend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'frontend'
        })
      ];

      // Should not throw
      expect(() => aiPlayer.onRoundStart(1, tasks)).not.toThrow();
    });

    it('should handle round end events', () => {
      const results = [
        {
          playerId: 'TestAI',
          taskId: 'task1',
          investment: { frontend: 2 },
          success: true,
          pointsEarned: 2,
          enthusiasmSpent: 0
        }
      ];

      // Should not throw
      expect(() => aiPlayer.onRoundEnd(1, results)).not.toThrow();
    });

    it('should handle project progress events', () => {
      const progress = {
        frontend: 10,
        backend: 5,
        management: 3
      };

      // Should not throw
      expect(() => aiPlayer.onProjectProgress(progress)).not.toThrow();
    });
  });
});
