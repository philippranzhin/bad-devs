import { Player } from '../models/Player';

describe('Player', () => {
  describe('creation', () => {
    it('should create player with name, specialization and all properties', () => {
      // Arrange
      const name = 'Alex';
      const skills = {
        frontend: 3,
        backend: 2,
        management: 1,
        techBase: 2,
        softSkills: 1
      };
      const enthusiasm = 10;
      const level = 5;
      const experience = 100;
      const money = 500;
      const abilities = [
        {
          id: '1',
          name: 'Слить задачу',
          description: 'Сбросить задачу',
          used: false,
          effect: 'dump_task' as const,
          value: 0.5,
          targetSkill: 'frontend' as const
        }
      ];

      // Act
      const player = new Player({
        name,
        specialization: 'frontend',
        skills,
        enthusiasm,
        level,
        experience,
        money,
        abilities
      });

      // Assert
      expect(player.name).toBe(name);
      expect(player.specialization).toBe('frontend');
      expect(player.skills).toEqual(skills);
      expect(player.enthusiasm).toBe(enthusiasm);
      expect(player.level).toBe(level);
      expect(player.experience).toBe(experience);
      expect(player.money).toBe(money);
      expect(player.abilities).toEqual(abilities);
    });

    it('should use default values for optional properties', () => {
      // Arrange & Act
      const player = new Player({
        name: 'Bob',
        specialization: 'backend',
        skills: {
          frontend: 1,
          backend: 1,
          management: 1,
          techBase: 1,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.name).toBe('Bob');
      expect(player.specialization).toBe('backend');
      expect(player.level).toBe(1);
      expect(player.experience).toBe(0);
      expect(player.money).toBe(0);
      expect(player.abilities).toEqual([]);
    });

    it('should create independent copy of skills', () => {
      // Arrange
      const originalSkills = {
        frontend: 3,
        backend: 2,
        management: 1,
        techBase: 2,
        softSkills: 1
      };

      // Act
      const player = new Player({
        name: 'Charlie',
        specialization: 'frontend',
        skills: originalSkills,
        enthusiasm: 10
      });

      // Modify original skills
      originalSkills.frontend = 999;

      // Assert - player skills should not be affected
      expect(player.skills.frontend).toBe(3);
      expect(originalSkills.frontend).toBe(999);
    });
  });

  describe('specializations', () => {
    it('should create frontend specialist with highest frontend skill', () => {
      // Arrange & Act
      const player = new Player({
        name: 'FrontendDev',
        specialization: 'frontend',
        skills: {
          frontend: 5,
          backend: 1,
          management: 1,
          techBase: 2,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.specialization).toBe('frontend');
      expect(player.skills.frontend).toBe(5); // больше очков в специализации
      expect(player.skills.frontend).toBeGreaterThan(player.skills.backend);
      expect(player.skills.frontend).toBeGreaterThan(player.skills.management);
    });

    it('should create backend specialist with highest backend skill', () => {
      // Arrange & Act
      const player = new Player({
        name: 'BackendDev',
        specialization: 'backend',
        skills: {
          frontend: 1,
          backend: 5,
          management: 1,
          techBase: 2,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.specialization).toBe('backend');
      expect(player.skills.backend).toBe(5);
      expect(player.skills.backend).toBeGreaterThan(player.skills.frontend);
      expect(player.skills.backend).toBeGreaterThan(player.skills.management);
    });

    it('should create management specialist with highest management skill', () => {
      // Arrange & Act
      const player = new Player({
        name: 'Manager',
        specialization: 'management',
        skills: {
          frontend: 1,
          backend: 1,
          management: 5,
          techBase: 2,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.specialization).toBe('management');
      expect(player.skills.management).toBe(5);
      expect(player.skills.management).toBeGreaterThan(player.skills.frontend);
      expect(player.skills.management).toBeGreaterThan(player.skills.backend);
    });

    it('should create fullstack specialist with balanced frontend and backend skills', () => {
      // Arrange & Act
      const player = new Player({
        name: 'FullstackDev',
        specialization: 'fullstack',
        skills: {
          frontend: 3,
          backend: 3,
          management: 1,
          techBase: 2,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.specialization).toBe('fullstack');
      expect(player.skills.frontend).toBe(3);
      expect(player.skills.backend).toBe(3);
      expect(player.skills.frontend).toBeGreaterThan(player.skills.management);
      expect(player.skills.backend).toBeGreaterThan(player.skills.management);
      // У фулстека фронтенд и бэкенд должны быть равны или близки
      expect(Math.abs(player.skills.frontend - player.skills.backend)).toBeLessThanOrEqual(1);
    });

    it('should validate that specialization matches highest skill', () => {
      // Arrange - создаем игрока где фронтенд НЕ самый высокий навык
      const invalidSkills = {
        frontend: 2,
        backend: 5, // выше чем фронтенд!
        management: 1,
        techBase: 2,
        softSkills: 1
      };

      // Act & Assert - это должно работать, но логически неправильно
      const player = new Player({
        name: 'ConfusedDev',
        specialization: 'frontend',
        skills: invalidSkills,
        enthusiasm: 10
      });

      // Игрок создается, но у него неправильное распределение навыков
      expect(player.specialization).toBe('frontend');
      expect(player.skills.backend).toBeGreaterThan(player.skills.frontend);
    });
  });

  describe('validation', () => {
    it('should throw error for empty name', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Player({
          name: '',
          specialization: 'frontend',
          skills: {
            frontend: 1,
            backend: 1,
            management: 1,
            techBase: 1,
            softSkills: 1
          },
          enthusiasm: 10
        });
      }).toThrow('Player name cannot be empty');
    });

    it('should throw error for whitespace-only name', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Player({
          name: '   ',
          specialization: 'frontend',
          skills: {
            frontend: 1,
            backend: 1,
            management: 1,
            techBase: 1,
            softSkills: 1
          },
          enthusiasm: 10
        });
      }).toThrow('Player name cannot be empty');
    });

    it('should throw error for negative skill values', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Player({
          name: 'TestPlayer',
          specialization: 'frontend',
          skills: {
            frontend: -1,
            backend: 2,
            management: 1,
            techBase: 2,
            softSkills: 1
          },
          enthusiasm: 10
        });
      }).toThrow('Skill frontend cannot be negative: -1');
    });

    it('should throw error for negative enthusiasm', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Player({
          name: 'TestPlayer',
          specialization: 'frontend',
          skills: {
            frontend: 1,
            backend: 2,
            management: 1,
            techBase: 2,
            softSkills: 1
          },
          enthusiasm: -10
        });
      }).toThrow('Enthusiasm cannot be negative: -10');
    });

    it('should throw error for multiple negative skills', () => {
      // Arrange & Act & Assert
      expect(() => {
        new Player({
          name: 'TestPlayer',
          specialization: 'frontend',
          skills: {
            frontend: -1,
            backend: -5,
            management: 0,
            techBase: -2,
            softSkills: 1
          },
          enthusiasm: 10
        });
      }).toThrow('Skill frontend cannot be negative: -1');
    });
  });

  describe('abilities', () => {
    it('should handle empty abilities list', () => {
      // Arrange & Act
      const player = new Player({
        name: 'TestPlayer',
        specialization: 'frontend',
        skills: {
          frontend: 1,
          backend: 1,
          management: 1,
          techBase: 1,
          softSkills: 1
        },
        enthusiasm: 10,
        abilities: []
      });

      // Assert
      expect(player.abilities).toEqual([]);
    });

    it('should handle multiple abilities', () => {
      // Arrange
      const abilities = [
        {
          id: '1',
          name: 'Слить задачу',
          description: 'Сбросить задачу',
          used: false,
          effect: 'dump_task' as const,
          value: 0.5,
          targetSkill: 'frontend' as const
        },
        {
          id: '2',
          name: 'Увеличить дедлайн',
          description: '+1 к дедлайну',
          used: false,
          effect: 'extend_deadline' as const,
          value: 1,
          targetSkill: 'frontend' as const
        },
        {
          id: '3',
          name: 'Сменить область',
          description: 'Изменить тип задачи',
          used: true,
          effect: 'skill_swap' as const,
          value: 1,
          targetSkill: 'frontend' as const
        }
      ];

      // Act
      const player = new Player({
        name: 'TestPlayer',
        specialization: 'frontend',
        skills: {
          frontend: 1,
          backend: 1,
          management: 1,
          techBase: 1,
          softSkills: 1
        },
        enthusiasm: 10,
        abilities
      });

      // Assert
      expect(player.abilities).toHaveLength(3);
      expect(player.abilities[0].used).toBe(false);
      expect(player.abilities[2].used).toBe(true);
    });
  });

  describe('level system', () => {
    it('should have level 1 by default for new player', () => {
      // Arrange & Act
      const player = new Player({
        name: 'NewPlayer',
        specialization: 'frontend',
        skills: {
          frontend: 1,
          backend: 1,
          management: 1,
          techBase: 1,
          softSkills: 1
        },
        enthusiasm: 10
      });

      // Assert
      expect(player.getLevel()).toBe(1);
      expect(player.getTotalExperience()).toBe(5); // 5 навыков + 0 опыта
    });

    it('should calculate level based on total experience', () => {
      // Arrange
      const player = new Player({
        name: 'TestPlayer',
        specialization: 'frontend',
        skills: {
          frontend: 5,
          backend: 3,
          management: 2,
          techBase: 2,
          softSkills: 1
        },
        enthusiasm: 10,
        experience: 20
      });

      // Act
      const level = player.getLevel();
      const totalExp = player.getTotalExperience();

      // Assert
      // Общий опыт: 20 (базовый) + 13 (навыки) = 33
      // Уровень: Math.floor(33 / 10) + 1 = 4
      expect(totalExp).toBe(33);
      expect(level).toBe(4);
    });

    it('should calculate level correctly for high experience player', () => {
      // Arrange
      const player = new Player({
        name: 'ExperiencedPlayer',
        specialization: 'fullstack',
        skills: {
          frontend: 10,
          backend: 10,
          management: 5,
          techBase: 5,
          softSkills: 5
        },
        enthusiasm: 10,
        experience: 100
      });

      // Act
      const level = player.getLevel();
      const totalExp = player.getTotalExperience();

      // Assert
      // Общий опыт: 100 (базовый) + 35 (навыки) = 135
      // Уровень: Math.floor(135 / 10) + 1 = 14
      expect(totalExp).toBe(135);
      expect(level).toBe(14);
    });

    it('should handle zero experience correctly', () => {
      // Arrange
      const player = new Player({
        name: 'ZeroExpPlayer',
        specialization: 'backend',
        skills: {
          frontend: 0,
          backend: 0,
          management: 0,
          techBase: 0,
          softSkills: 0
        },
        enthusiasm: 10,
        experience: 0
      });

      // Act
      const level = player.getLevel();
      const totalExp = player.getTotalExperience();

      // Assert
      // Общий опыт: 0 (базовый) + 0 (навыки) = 0
      // Уровень: Math.floor(0 / 10) + 1 = 1
      expect(totalExp).toBe(0);
      expect(level).toBe(1);
    });
  });
});
