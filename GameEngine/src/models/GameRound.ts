import { PlayerAction } from '../interfaces/PlayerInterface';
import { Task } from './Task';

export class GameRound {
  public readonly roundNumber: number;
  public readonly tasks: Task[];
  public readonly actions: PlayerAction[] = [];
  public isCompleted: boolean = false;
  public readonly maxActionsPerPlayer: number;

  constructor(roundNumber: number, tasks: Task[], maxActionsPerPlayer: number) {
    this.roundNumber = roundNumber;
    this.tasks = [...tasks];
    this.maxActionsPerPlayer = maxActionsPerPlayer;
  }

  public addPlayerAction(action: PlayerAction): void {
    if (this.isCompleted) {
      throw new Error('Cannot add actions to completed round');
    }

    const playerActions = this.actions.filter(a => a.playerId === action.playerId);
    if (playerActions.length >= this.maxActionsPerPlayer) {
      throw new Error(`Player ${action.playerId} has reached action limit`);
    }

    this.actions.push(action);
  }

  public completeRound(): void {
    this.isCompleted = true;
  }

  public getPlayerActions(playerId: string): PlayerAction[] {
    return this.actions.filter(a => a.playerId === playerId);
  }

  public getRemainingActions(playerId: string): number {
    const usedActions = this.getPlayerActions(playerId).length;
    return this.maxActionsPerPlayer - usedActions;
  }

  public getUnresolvedTasks(): Task[] {
    const resolvedTaskIds = this.actions
      .filter(action => action.success)
      .map(action => action.taskId);

    return this.tasks.filter(task =>
      !resolvedTaskIds.includes(task.id)
    );
  }
}
