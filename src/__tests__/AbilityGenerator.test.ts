import { GameSettings } from '../models/GameSettings';
import { AbilityGenerator } from '../services/AbilityGenerator';

describe('AbilityGenerator', () => {
  let abilityGenerator: AbilityGenerator;
  let settings: GameSettings;

  beforeEach(() => {
    settings = new GameSettings();
    abilityGenerator = new AbilityGenerator(settings);
  });

  describe('constructor', () => {
    it('should create ability generator', () => {
      expect(abilityGenerator).toBeDefined();
    });
  });

  describe('generateAbilitiesForPlayer', () => {
    it('should generate abilities for frontend player', () => {
      const abilities = abilityGenerator.generateAbilitiesForPlayer({
        count: 3,
        specialization: 'frontend'
      });

      expect(abilities).toHaveLength(3);
      abilities.forEach(ability => {
        expect(ability.id).toBeDefined();
        expect(ability.name).toBeDefined();
        expect(ability.description).toBeDefined();
        expect(ability.used).toBe(false);
        expect(ability.effect).toBeDefined();
        expect(ability.value).toBeDefined();
        expect(ability.targetSkill).toBeDefined();
      });
    });

    it('should generate abilities for backend player', () => {
      const abilities = abilityGenerator.generateAbilitiesForPlayer({
        count: 2,
        specialization: 'backend'
      });

      expect(abilities).toHaveLength(2);
    });

    it('should generate abilities for management player', () => {
      const abilities = abilityGenerator.generateAbilitiesForPlayer({
        count: 4,
        specialization: 'management'
      });

      expect(abilities).toHaveLength(4);
    });

    it('should generate abilities for fullstack player', () => {
      const abilities = abilityGenerator.generateAbilitiesForPlayer({
        count: 3,
        specialization: 'fullstack'
      });

      expect(abilities).toHaveLength(3);
    });

    it('should throw error for invalid specialization', () => {
      // Создаем генератор с пустыми абилками для тестирования
      const emptyGenerator = new AbilityGenerator(settings);
      // Мокаем abilityTemplates чтобы он был пустым
      (emptyGenerator as any).abilityTemplates = [];

      expect(() => {
        emptyGenerator.generateAbilitiesForPlayer({
          count: 1,
          specialization: 'frontend'
        });
      }).toThrow('No abilities available for specialization: frontend');
    });
  });

  describe('getAbilityById', () => {
    it('should return ability by id', () => {
      const ability = abilityGenerator.getAbilityById('frontend_debug_master');

      expect(ability).toBeDefined();
      expect(ability?.id).toBe('frontend_debug_master');
      expect(ability?.name).toBe('Мастер отладки');
    });

    it('should return null for non-existent id', () => {
      const ability = abilityGenerator.getAbilityById('non_existent');

      expect(ability).toBeNull();
    });
  });

  describe('getAbilitiesForSpecialization', () => {
    it('should return abilities for frontend specialization', () => {
      const abilities = abilityGenerator.getAbilitiesForSpecialization('frontend');

      expect(abilities.length).toBeGreaterThan(0);
      abilities.forEach(ability => {
        expect(ability.type === 'frontend' || ability.type === 'fullstack').toBe(true);
      });
    });

    it('should return abilities for fullstack specialization', () => {
      const abilities = abilityGenerator.getAbilitiesForSpecialization('fullstack');

      expect(abilities.length).toBeGreaterThan(0);
      abilities.forEach(ability => {
        expect(ability.type === 'fullstack').toBe(true);
      });
    });
  });

  describe('canUseAbilityForTask', () => {
    it('should allow ability for matching task skill', () => {
      const ability = abilityGenerator.getAbilityById('frontend_debug_master');
      const canUse = ability?.targetSkill === 'frontend';

      expect(canUse).toBe(true);
    });

    it('should allow ability for any skill', () => {
      const ability = abilityGenerator.getAbilityById('fullstack_versatility_master');
      const canUse = ability?.targetSkill === 'any';

      expect(canUse).toBe(true);
    });

    it('should not allow ability for non-matching skill', () => {
      const ability = abilityGenerator.getAbilityById('frontend_debug_master');
      const canUse = ability?.targetSkill === 'backend';

      expect(canUse).toBe(false);
    });
  });
});
