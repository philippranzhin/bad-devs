import { SkillType, PlayerSpecialization } from './SkillType';

export type AbilityEffect = 
  | 'reduce_complexity'      // Уменьшить сложность
  | 'bonus_enthusiasm'       // Бонус энтузиазма
  | 'skill_conversion'       // Конвертация навыков
  | 'extend_deadline'        // Увеличить дедлайн
  | 'borrow_skill'           // Взять навык у коллеги
  | 'dump_task'             // Слить задачу
  | 'free_enthusiasm'       // Бесплатный энтузиазм
  | 'double_experience'     // Двойной опыт
  | 'increase_complexity'   // Увеличить сложность
  | 'skill_swap';           // Поменять тип навыка

export type AbilityType = PlayerSpecialization;

export interface AbilityTemplate {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  effect: AbilityEffect;
  value: number;
  targetSkill: SkillType | 'any';
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  used: boolean;
  effect: AbilityEffect;
  value: number;
  targetSkill: SkillType | 'any';
}

export interface AbilityUsage {
  abilityId: string;
  taskId: string;
  effect: AbilityEffect;
  value: number;
  targetSkill: SkillType | 'any';
}
