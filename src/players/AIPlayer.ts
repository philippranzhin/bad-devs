import { PlayerAction, PlayerActionRequest, PlayerInterface } from '../interfaces/PlayerInterface';
import { Player } from '../models/Player';
import { ProjectProgress } from '../models/Project';
import { Task } from '../models/Task';
import { Investment } from '../services/TaskSolver';

export class AIPlayer implements PlayerInterface {
  public readonly id: string;
  public readonly name: string;
  private readonly player: Player;

  constructor(player: Player) {
    this.player = player;
    this.id = player.name;
    this.name = player.name;
  }

  async selectActions(
    availableTasks: Task[],
    maxActions: number,
    currentEnthusiasm: number
  ): Promise<PlayerActionRequest[]> {
    const actions: PlayerActionRequest[] = [];
    const tasksCopy = [...availableTasks]; // Копия для модификации

    for (let i = 0; i < maxActions && tasksCopy.length > 0; i++) {
      const task = this.selectBestTask(tasksCopy);
      if (!task) break;

      const investment = this.calculateInvestment(task, currentEnthusiasm);
      actions.push({
        playerId: this.id,
        taskId: task.id,
        investment
      });

      // Убираем выбранную задачу
      const taskIndex = tasksCopy.findIndex(t => t.id === task.id);
      tasksCopy.splice(taskIndex, 1);
    }

    return actions;
  }

  private selectBestTask(availableTasks: Task[]): Task | null {
    if (availableTasks.length === 0) return null;

    // Простая логика AI - выбираем задачу с лучшим соотношением навыков
    return availableTasks.sort((a, b) => {
      const scoreA = this.calculateTaskScore(a);
      const scoreB = this.calculateTaskScore(b);
      return scoreB - scoreA;
    })[0];
  }

  private calculateTaskScore(task: Task): number {
    const playerSkill = this.player.skills[task.requiredSkill];
    let score = playerSkill;

    // Бонус за специализацию
    if (this.player.specialization === task.requiredSkill) {
      score += 2;
    }

    // Штраф за сложность
    score -= task.complexity * 0.5;

    // Бонус за опыт
    score += task.experienceReward * 0.1;

    return score;
  }

  private calculateInvestment(task: Task, enthusiasm: number): Investment {
    const investment: Investment = {};
    const playerSkill = this.player.skills[task.requiredSkill];

    // Вкладываем навыки
    if (playerSkill > 0) {
      investment[task.requiredSkill] = Math.min(playerSkill, task.complexity);
    }

    // Вкладываем энтузиазм если нужно
    if (enthusiasm > 0 && task.complexity > (investment[task.requiredSkill] || 0)) {
      investment.enthusiasm = Math.min(enthusiasm, 1);
    }

    return investment;
  }

  onRoundStart(roundNumber: number, tasks: Task[]): void {
    // AI может анализировать задачи
    console.log(`AI Player ${this.name} starting round ${roundNumber} with ${tasks.length} tasks`);
  }

  onRoundEnd(roundNumber: number, results: PlayerAction[]): void {
    // AI может учиться на результатах
    const successfulActions = results.filter(r => r.success).length;
    console.log(`AI Player ${this.name} completed round ${roundNumber}: ${successfulActions}/${results.length} successful`);
  }

  onProjectProgress(progress: ProjectProgress): void {
    // AI может адаптировать стратегию
    console.log(`AI Player ${this.name} sees project progress:`, progress);
  }
}
