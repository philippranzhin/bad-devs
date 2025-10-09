export type BotPersonality = 'kind' | 'evil';

export interface BotPersonalityConfig {
  personality: BotPersonality;
  name: string;
  description: string;
}

export const BOT_PERSONALITIES: Record<BotPersonality, BotPersonalityConfig> = {
  kind: {
    personality: 'kind',
    name: 'Добрый',
    description: 'Отдает задачи тем, кому они лучше всего подходят'
  },
  evil: {
    personality: 'evil',
    name: 'Злой',
    description: 'Отдает задачи тем, кому они меньше всего подходят'
  }
};

