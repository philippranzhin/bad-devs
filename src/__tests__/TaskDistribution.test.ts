import { PlayerInterface } from '../interfaces/PlayerInterface';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { TaskDistribution } from '../models/TaskDistribution';
import { AIPlayer } from '../players/AIPlayer';

describe('TaskDistribution', () => {
  let taskDistribution: TaskDistribution;
  let tasks: Task[];
  let playerInterfaces: PlayerInterface[];

  beforeEach(() => {
    tasks = [
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
      }),
      new Task({
        id: 'task3',
        name: 'Management Task',
        description: 'Test management task',
        requiredSkill: 'management',
        complexity: 1,
        deadline: 1,
        experienceReward: 5,
        contributesToCommonGoal: true,
        commonGoalSkill: 'management'
      })
    ];

    const player1 = new Player({
      name: 'Player1',
      specialization: 'frontend',
      skills: { frontend: 3, backend: 1, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 5
    });

    const player2 = new Player({
      name: 'Player2',
      specialization: 'backend',
      skills: { frontend: 1, backend: 3, management: 1, techBase: 2, softSkills: 2 },
      enthusiasm: 5
    });

    playerInterfaces = [
      new AIPlayer(player1),
      new AIPlayer(player2)
    ];

    taskDistribution = new TaskDistribution(1, tasks, 2);
  });

  describe('constructor', () => {
    it('should create distribution with correct properties', () => {
      expect(taskDistribution.roundNumber).toBe(1);
      expect(taskDistribution.taskPool).toHaveLength(3);
      expect(taskDistribution.maxTasksPerPlayer).toBe(2);
      expect(taskDistribution.isCompleted).toBe(false);
      expect(taskDistribution.assignments).toHaveLength(0);
    });

    it('should initialize remaining tasks', () => {
      expect(taskDistribution.getAvailableTasks()).toHaveLength(3);
    });
  });

  describe('getCurrentPlayerId', () => {
    it('should return first player initially', () => {
      const currentPlayerId = taskDistribution.getCurrentPlayerId(playerInterfaces);
      expect(currentPlayerId).toBe('Player1');
    });

    it('should return null when distribution is completed', () => {
      taskDistribution.completeDistribution();
      const currentPlayerId = taskDistribution.getCurrentPlayerId(playerInterfaces);
      expect(currentPlayerId).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign task to player', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');

      expect(taskDistribution.assignments).toHaveLength(1);
      expect(taskDistribution.assignments[0].taskId).toBe('task1');
      expect(taskDistribution.assignments[0].assignedTo).toBe('Player1');
      expect(taskDistribution.assignments[0].assignedBy).toBe('Player1');
    });

    it('should remove task from available tasks', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');

      const availableTasks = taskDistribution.getAvailableTasks();
      expect(availableTasks).toHaveLength(2);
      expect(availableTasks.find(t => t.id === 'task1')).toBeUndefined();
    });

    it('should increment current player index', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');

      const currentPlayerId = taskDistribution.getCurrentPlayerId(playerInterfaces);
      expect(currentPlayerId).toBe('Player2');
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        taskDistribution.assignTask('nonexistent', 'Player1', 'Player1');
      }).toThrow('Task nonexistent is not available for assignment');
    });

    it('should throw error when player reaches task limit', () => {
      // Assign max tasks to Player1
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player1', 'Player2');

      expect(() => {
        taskDistribution.assignTask('task3', 'Player1', 'Player1');
      }).toThrow('Player Player1 has reached task limit');
    });

    it('should throw error when distribution is completed', () => {
      taskDistribution.completeDistribution();

      expect(() => {
        taskDistribution.assignTask('task1', 'Player1', 'Player1');
      }).toThrow('Cannot assign tasks to completed distribution');
    });
  });

  describe('getPlayerTasks', () => {
    it('should return empty array initially', () => {
      const playerTasks = taskDistribution.getPlayerTasks('Player1');
      expect(playerTasks).toHaveLength(0);
    });

    it('should return assigned tasks for player', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player1', 'Player2');

      const playerTasks = taskDistribution.getPlayerTasks('Player1');
      expect(playerTasks).toHaveLength(2);
      expect(playerTasks.map(t => t.id)).toContain('task1');
      expect(playerTasks.map(t => t.id)).toContain('task2');
    });
  });

  describe('getPlayerTaskCount', () => {
    it('should return 0 initially', () => {
      expect(taskDistribution.getPlayerTaskCount('Player1')).toBe(0);
    });

    it('should return correct count after assignments', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player1', 'Player2');

      expect(taskDistribution.getPlayerTaskCount('Player1')).toBe(2);
      expect(taskDistribution.getPlayerTaskCount('Player2')).toBe(0);
    });
  });

  describe('canAssignTask', () => {
    it('should return true initially', () => {
      expect(taskDistribution.canAssignTask('Player1')).toBe(true);
    });

    it('should return false when player reaches limit', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player1', 'Player2');

      expect(taskDistribution.canAssignTask('Player1')).toBe(false);
    });
  });

  describe('isDistributionComplete', () => {
    it('should return false initially', () => {
      expect(taskDistribution.isDistributionComplete(playerInterfaces)).toBe(false);
    });

    it('should return true when all players have max tasks', () => {
      // Assign max tasks to all players
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player1', 'Player2');
      taskDistribution.assignTask('task3', 'Player2', 'Player1');

      // Need to assign one more task to Player2 to reach max
      // But we only have 3 tasks and maxTasksPerPlayer is 2
      // So we need to create more tasks or adjust the test

      // Let's create a 4th task for the test
      const task4 = new Task({
        id: 'task4',
        name: 'Additional Task',
        description: 'Additional task',
        requiredSkill: 'frontend',
        complexity: 1,
        deadline: 1,
        experienceReward: 5,
        contributesToCommonGoal: true,
        commonGoalSkill: 'frontend'
      });

      // Add the task to the distribution manually
      taskDistribution.taskPool.push(task4);
      taskDistribution.remainingTasks.push(task4);

      taskDistribution.assignTask('task4', 'Player2', 'Player2');

      expect(taskDistribution.isDistributionComplete(playerInterfaces)).toBe(true);
    });
  });

  describe('getDistributionSummary', () => {
    it('should return empty summary initially', () => {
      const summary = taskDistribution.getDistributionSummary();
      expect(Object.keys(summary)).toHaveLength(0);
    });

    it('should return correct summary after assignments', () => {
      taskDistribution.assignTask('task1', 'Player1', 'Player1');
      taskDistribution.assignTask('task2', 'Player2', 'Player2');

      const summary = taskDistribution.getDistributionSummary();
      expect(summary['Player1']).toHaveLength(1);
      expect(summary['Player2']).toHaveLength(1);
      expect(summary['Player1'][0].id).toBe('task1');
      expect(summary['Player2'][0].id).toBe('task2');
    });
  });

  describe('completeDistribution', () => {
    it('should mark distribution as completed', () => {
      taskDistribution.completeDistribution();
      expect(taskDistribution.isCompleted).toBe(true);
    });
  });
});
