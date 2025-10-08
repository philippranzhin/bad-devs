import { GameSettings } from '../models/GameSettings';
import { Player } from '../models/Player';
import { Task } from '../models/Task';
import { AbilityService } from '../services/AbilityService';

describe('AbilityService', () => {
  let abilityService: AbilityService;
  let player: Player;
  let task: Task;
  let allPlayers: Player[];
  let settings: GameSettings;

  beforeEach(() => {
    settings = new GameSettings();
    abilityService = new AbilityService(settings);

    player = new Player({
      name: 'TestPlayer',
      specialization: 'frontend',
      skills: {
        frontend: 3,
        backend: 1,
        management: 1,
        techBase: 2,
        softSkills: 2
      },
      enthusiasm: 5,
      abilities: [
        {
          id: 'frontend_debug_master',
          name: 'Мастер отладки',
          description: 'Уменьшить сложность frontend задачи на 2',
          used: false,
          effect: 'reduce_complexity',
          value: 2,
          targetSkill: 'frontend'
        },
        {
          id: 'frontend_ui_inspiration',
          name: 'Вдохновение UI',
          description: 'Бонус энтузиазма для frontend задач',
          used: false,
          effect: 'bonus_enthusiasm',
          value: 3,
          targetSkill: 'frontend'
        }
      ]
    });

    task = new Task({
      id: 'task1',
      name: 'Frontend Task',
      description: 'Test frontend task',
      requiredSkill: 'frontend',
      complexity: 3,
      deadline: 1,
      experienceReward: 10,
      contributesToCommonGoal: true,
      commonGoalSkill: 'frontend'
    });

    allPlayers = [player];
  });

  describe('useAbility', () => {
    it('should successfully use reduce_complexity ability', () => {
      const result = abilityService.useAbility(player, 'frontend_debug_master', task, allPlayers);

      expect(result.success).toBe(true);
      expect(result.modifiedTask).toBeDefined();
      expect(result.modifiedTask?.complexity).toBe(1); // 3 - 2 = 1
      expect(result.message).toContain('Complexity reduced by 2');
    });

    it('should successfully use bonus_enthusiasm ability', () => {
      const result = abilityService.useAbility(player, 'frontend_ui_inspiration', task, allPlayers);

      expect(result.success).toBe(true);
      expect(result.bonusEnthusiasm).toBe(3);
      expect(result.message).toContain('Gained 3 bonus enthusiasm');
    });

    it('should mark ability as used after successful use', () => {
      const ability = player.abilities.find(a => a.id === 'frontend_debug_master');
      expect(ability?.used).toBe(false);

      abilityService.useAbility(player, 'frontend_debug_master', task, allPlayers);

      expect(ability?.used).toBe(true);
    });

    it('should return error for non-existent ability', () => {
      const result = abilityService.useAbility(player, 'non_existent', task, allPlayers);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return error for already used ability', () => {
      const ability = player.abilities.find(a => a.id === 'frontend_debug_master');
      ability!.used = true;

      const result = abilityService.useAbility(player, 'frontend_debug_master', task, allPlayers);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already used');
    });

    it('should return error for incompatible ability', () => {
      const backendTask = new Task({
        id: 'backend_task',
        name: 'Backend Task',
        description: 'Test backend task',
        requiredSkill: 'backend',
        complexity: 2,
        deadline: 1,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'backend'
      });

      const result = abilityService.useAbility(player, 'frontend_debug_master', backendTask, allPlayers);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be used for backend tasks');
    });
  });

  describe('canUseAbilityForTask', () => {
    it('should return true for compatible ability', () => {
      const ability = player.abilities[0];
      const canUse = abilityService.canUseAbilityForTask(ability, task);

      expect(canUse).toBe(true);
    });

    it('should return false for incompatible ability', () => {
      const backendTask = new Task({
        id: 'backend_task',
        name: 'Backend Task',
        description: 'Test backend task',
        requiredSkill: 'backend',
        complexity: 2,
        deadline: 1,
        experienceReward: 10,
        contributesToCommonGoal: true,
        commonGoalSkill: 'backend'
      });

      const ability = player.abilities[0]; // frontend ability
      const canUse = abilityService.canUseAbilityForTask(ability, backendTask);

      expect(canUse).toBe(false);
    });
  });

  describe('getAvailableAbilitiesForTask', () => {
    it('should return available abilities for task', () => {
      const availableAbilities = abilityService.getAvailableAbilitiesForTask(player, task);

      expect(availableAbilities).toHaveLength(2);
      expect(availableAbilities.every(a => !a.used)).toBe(true);
    });

    it('should not return used abilities', () => {
      const ability = player.abilities.find(a => a.id === 'frontend_debug_master');
      ability!.used = true;

      const availableAbilities = abilityService.getAvailableAbilitiesForTask(player, task);

      expect(availableAbilities).toHaveLength(1);
      expect(availableAbilities[0].id).toBe('frontend_ui_inspiration');
    });
  });

  describe('hasAvailableAbilities', () => {
    it('should return true when player has unused abilities', () => {
      const hasAbilities = abilityService.hasAvailableAbilities(player);

      expect(hasAbilities).toBe(true);
    });

    it('should return false when all abilities are used', () => {
      player.abilities.forEach(ability => ability.used = true);

      const hasAbilities = abilityService.hasAvailableAbilities(player);

      expect(hasAbilities).toBe(false);
    });
  });

  describe('getAvailableAbilitiesCount', () => {
    it('should return correct count of available abilities', () => {
      const count = abilityService.getAvailableAbilitiesCount(player);

      expect(count).toBe(2);
    });

    it('should return 0 when all abilities are used', () => {
      player.abilities.forEach(ability => ability.used = true);

      const count = abilityService.getAvailableAbilitiesCount(player);

      expect(count).toBe(0);
    });
  });
});
