// Простая реализация интерфейса игрока без TypeScript зависимостей

export class HumanPlayerInterface {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  // Callbacks для взаимодействия с UI
  setTaskDistributionCallback(callback) {
    this.onTaskDistributionCallback = callback;
  }

  setActionSelectionCallback(callback) {
    this.onActionSelectionCallback = callback;
  }

  // Реализация интерфейса PlayerInterface
  async selectActions(availableTasks, maxActions, currentEnthusiasm) {
    if (this.onActionSelectionCallback) {
      return await this.onActionSelectionCallback(availableTasks, maxActions, currentEnthusiasm);
    }

    // Fallback - возвращаем пустой массив
    return [];
  }

  onRoundStart(roundNumber, tasks) {
    console.log(`Round ${roundNumber} started for ${this.name}`);
    console.log('Available tasks:', tasks);
  }

  onRoundEnd(roundNumber, results) {
    console.log(`Round ${roundNumber} ended for ${this.name}`);
    console.log('Results:', results);
  }

  onProjectProgress(progress) {
    console.log(`Project progress update for ${this.name}:`, progress);
  }

  // Метод для распределения задач (используется в TaskDistribution)
  async selectTaskAssignment(availableTasks, currentPlayerId, allPlayers) {
    if (this.onTaskDistributionCallback) {
      return await this.onTaskDistributionCallback(availableTasks, currentPlayerId, allPlayers);
    }

    // Fallback - выбираем первую задачу для себя
    return {
      taskId: availableTasks[0]?.id || '',
      assignedTo: this.id
    };
  }
}
