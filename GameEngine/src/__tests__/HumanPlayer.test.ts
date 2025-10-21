import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { HumanPlayer } from '../players/HumanPlayer';

describe('HumanPlayer', () => {
  let settings: GameSettings;
  let player: Player;
  let humanPlayer: HumanPlayer;

  beforeEach(() => {
    settings = new GameSettings();
    player = new Player({
      name: 'TestHuman',
      specialization: 'backend',
      skills: {
        frontend: 1,
        backend: 4,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 8
    });
    humanPlayer = new HumanPlayer(player);
  });

  describe('constructor', () => {
    it('should create human player with correct id and name', () => {
      expect(humanPlayer.id).toBe('TestHuman');
      expect(humanPlayer.name).toBe('TestHuman');
    });
  });

  describe('selectActions', () => {
    it('should return promise that resolves when actions are submitted', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Backend Task',
          description: 'Test backend task',
          requiredSkill: 'backend',
          complexity: 2,
          deadline: 1,
          experienceReward: 10,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actionsPromise = humanPlayer.selectActions(tasks, 1, 8);

      // Submit actions after promise is created
      const submittedActions = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 2, enthusiasm: 1 }
        }
      ];

      // Wait a bit for promise to be created, then submit
      setTimeout(() => {
        humanPlayer.submitActions(submittedActions);
      }, 20);

      const actions = await actionsPromise;

      expect(actions).toEqual(submittedActions);
    });

    it('should handle multiple action submissions', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        }),
        new Task({
          id: 'task2',
          name: 'Task 2',
          description: 'Test task 2',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actionsPromise = humanPlayer.selectActions(tasks, 2, 8);

      const submittedActions = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 1 }
        },
        {
          playerId: 'TestHuman',
          taskId: 'task2',
          investment: { backend: 1, enthusiasm: 1 }
        }
      ];

      // Wait a bit for promise to be created, then submit
      setTimeout(() => {
        humanPlayer.submitActions(submittedActions);
      }, 20);

      const actions = await actionsPromise;

      expect(actions).toHaveLength(2);
      expect(actions).toEqual(submittedActions);
    });

    it('should handle empty action submissions', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actionsPromise = humanPlayer.selectActions(tasks, 1, 8);

      // Wait a bit for promise to be created, then submit empty
      setTimeout(() => {
        humanPlayer.submitActions([]);
      }, 20);

      const actions = await actionsPromise;

      expect(actions).toHaveLength(0);
    });
  });

  describe('submitActions', () => {
    it('should resolve pending selectActions promise', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actionsPromise = humanPlayer.selectActions(tasks, 1, 8);

      const submittedActions = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 1 }
        }
      ];

      humanPlayer.submitActions(submittedActions);

      const actions = await actionsPromise;
      expect(actions).toEqual(submittedActions);
    });

    it('should handle multiple submitActions calls', async () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Task 1',
          description: 'Test task 1',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      const actionsPromise = humanPlayer.selectActions(tasks, 1, 8);

      // Wait a bit to ensure promise is pending
      await new Promise(resolve => setTimeout(resolve, 10));

      const firstActions = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 1 }
        }
      ];

      const secondActions = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 2 }
        }
      ];

      humanPlayer.submitActions(firstActions);
      humanPlayer.submitActions(secondActions); // Should be ignored

      const actions = await actionsPromise;
      expect(actions).toEqual(firstActions); // Should get first actions
    });
  });

  describe('event handlers', () => {
    it('should handle round start events', () => {
      const tasks = [
        new Task({
          id: 'task1',
          name: 'Test Task',
          description: 'Test task',
          requiredSkill: 'backend',
          complexity: 1,
          deadline: 1,
          experienceReward: 5,
          contributesToCommonGoal: true,
          commonGoalSkill: 'backend'
        })
      ];

      // Should not throw
      expect(() => humanPlayer.onRoundStart(1, tasks)).not.toThrow();
    });

    it('should handle round end events', () => {
      const results = [
        {
          playerId: 'TestHuman',
          taskId: 'task1',
          investment: { backend: 2 },
          success: true,
          pointsEarned: 2,
          enthusiasmSpent: 0
        }
      ];

      // Should not throw
      expect(() => humanPlayer.onRoundEnd(1, results)).not.toThrow();
    });

    it('should handle project progress events', () => {
      const progress = {
        frontend: 5,
        backend: 10,
        management: 3
      };

      // Should not throw
      expect(() => humanPlayer.onProjectProgress(progress)).not.toThrow();
    });
  });
});
