export type SkillType =
  | 'frontend'
  | 'backend'
  | 'management'
  | 'techBase'
  | 'softSkills';

export type PlayerSpecialization =
  | 'frontend'
  | 'backend'
  | 'management'
  | 'fullstack';

export interface SkillSet {
  frontend: number;
  backend: number;
  management: number;
  techBase: number;
  softSkills: number;
}
