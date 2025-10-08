import { ProjectProgress } from '../models/Project';
import { Task } from '../models/Task';
import { Investment } from '../services/TaskSolver';

export interface PlayerActionRequest {
  playerId: string;
  taskId: string;
  investment: Investment;
}

export interface PlayerAction {
  playerId: string;
  taskId: string;
  investment: Investment;
  success: boolean;
  pointsEarned: number;
  enthusiasmSpent: number;
}

export interface PlayerInterface {
  readonly id: string;
  readonly name: string;

  // Игрок принимает решение о действиях в раунде
  selectActions(
    availableTasks: Task[],
    maxActions: number,
    currentEnthusiasm: number
  ): Promise<PlayerActionRequest[]>;

  // Игрок может получить информацию о состоянии игры
  onRoundStart(roundNumber: number, tasks: Task[]): void;
  onRoundEnd(roundNumber: number, results: PlayerAction[]): void;
  onProjectProgress(progress: ProjectProgress): void;
}
