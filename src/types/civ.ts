export interface Civ {
    name: string;
    majorGods: Record<string, MajorGod>;
    minorGods: Record<string, MinorGod>;
    units: Record<string, Unit>;
    buildings: Record<string, Building>;
    technologies: Record<string, Technology>;
    abilities: Record<string, Ability>;
  }
  
  export type Age = 'Archaic' | 'Classical' | 'Heroic' | 'Mythic';
  
  export interface Entity {
    name: string;
    type: 'unit' | 'building' | 'technology' | 'majorGod' | 'minorGod' | 'ability';
    image?: string;
    age_required: Age;
  }
  
  // === Units ===
  
  export type UnitTag = 'is_infantry' | 'is_archer' | 'is_hero' | 'is_myth' | 'is_ranged';
  
  export interface Unit extends Entity {
    type: 'unit';
    unit_class: UnitTag[];
    cost: { food?: number; wood?: number; gold?: number; favor?: number };
    hitpoints: number;
    attack?: {
      type: 'melee' | 'ranged';
      damage: number;
      reload_time?: number;
      range?: number;
    };
  }
  
  // === Buildings ===
  
  export interface Building extends Entity {
    type: 'building';
    cost: { wood?: number; stone?: number };
    functions: {
      trains_units?: string[];
      researches_techs?: string[];
    };
  }
  
  // === Technologies ===
  
  export interface Technology extends Entity {
    type: 'technology';
    research_location: string;
    effects: {
      target: { unit_tags: UnitTag[] };
      property: string;
      operation: 'add' | 'multiply';
      value: number;
    }[];
  }
  
  // === Gods ===
  
  export interface MajorGod extends Entity {
    type: 'majorGod';
    tagline: string;
    godPower: string;
  }
  
  export interface MinorGod extends Entity {
    type: 'minorGod';
    tagline: string;
    godPower: string;
  }
  
  // === Abilities ===
  
  export interface Ability extends Entity {
    type: 'ability';
    cooldown: number;
    description?: string;
  }
  