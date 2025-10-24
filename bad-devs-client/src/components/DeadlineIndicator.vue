<script setup lang="ts">
import type { Task } from 'bad-devs-gameengine';
import { computed } from 'vue';

interface Props {
  task: Task
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
})

function getDeadlineStatus(task: Task): { status: 'expired' | 'urgent' | 'warning' | 'normal', text: string, class: string, icon: string } {
  if (task.deadline === 0) {
    return {
      status: 'expired',
      text: 'Просрочено',
      class: 'deadline-expired',
      icon: '⏰'
    }
  } else if (task.deadline === 1) {
    return {
      status: 'urgent',
      text: 'Истекает в этом раунде!',
      class: 'deadline-urgent',
      icon: '🚨'
    }
  } else if (task.deadline === 2) {
    return {
      status: 'warning',
      text: 'Истекает через 1 раунд',
      class: 'deadline-warning',
      icon: '⚠️'
    }
  } else {
    return {
      status: 'normal',
      text: `Осталось ${task.deadline} раундов`,
      class: 'deadline-normal',
      icon: '⏳'
    }
  }
}

const deadlineStatus = computed(() => getDeadlineStatus(props.task))
</script>

<template>
  <span
    class="deadline-indicator"
    :class="[deadlineStatus.class, `size-${size}`]"
    :title="`Дедлайн задачи: ${deadlineStatus.text}`"
  >
    <span class="deadline-icon">{{ deadlineStatus.icon }}</span>
    <span class="deadline-text">{{ deadlineStatus.text }}</span>
  </span>
</template>

<style scoped>
.deadline-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.deadline-indicator.size-small {
  font-size: 11px;
  padding: 2px var(--spacing-xs);
}

.deadline-indicator.size-medium {
  font-size: 12px;
}

.deadline-indicator.size-large {
  font-size: 14px;
  padding: var(--spacing-sm) var(--spacing-md);
}

.deadline-expired {
  background-color: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
  animation: pulse-red 2s infinite;
}

.deadline-urgent {
  background-color: #fef3c7;
  color: #d97706;
  border-color: #fbbf24;
  animation: pulse-orange 1.5s infinite;
  font-weight: 600;
}

.deadline-warning {
  background-color: #fef3c7;
  color: #d97706;
  border-color: #fbbf24;
}

.deadline-normal {
  background-color: #dbeafe;
  color: #2563eb;
  border-color: #93c5fd;
}

.deadline-icon {
  font-size: 1.1em;
}

.deadline-text {
  white-space: nowrap;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulse-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@media (max-width: 768px) {
  .deadline-indicator.size-large {
    font-size: 12px;
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .deadline-text {
    font-size: 0.9em;
  }
}
</style>
