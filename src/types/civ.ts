// src/types/civ.ts

// === SHARED BASES === //

export type Age = 'Archaic' | 'Classical' | 'Heroic' | 'Mythic';
export type CivName = 'Greek' | 'Norse' | 'Egyptian' | 'Atlantean' | 'Chinese';

export interface Entity {
  name: string;
  type:
    | 'unit'
    | 'building'
    | 'technology'
    | 'majorGod'
    | 'minorGod'
    | 'ability'
    | 'godPower';
  image?: string;
  age_required: Age;
  civ?: CivName;
  prerequisite_god?: string; // Optional god requirement
  prerequisite_building?: string; // Optional building requirement
  line_of_sight?:number;
  build_time?:number;
}

// === COMMON TRAITS === //

export interface Cost {
  food?: number;
  wood?: number;
  gold?: number;
  favor?: number;
}

export interface GatherRate {
    food?: number;
    wood?: number;
    gold?: number;
    favor?: number;
}

export interface DefensiveStats {
  hack_armor: number;
  pierce_armor: number;
  crush_armor: number;
}

export type UnitCategory = 'human' | 'myth' | 'hero';
export type UnitTag =
  | 'is_infantry'
  | 'is_archer'
  | 'is_siege'
  | 'is_cavalry'
  | 'is_flying'
  | 'is_economic'
  | 'is_ship';

export interface DamageMultipliers {
  vs_human?: number;
  vs_hero?: number;
  vs_myth?: number;
  vs_ranged?: number;
  vs_infantry?: number;
  vs_siege?: number;
}

export interface AttackStats extends DamageMultipliers {
  hack_damage: number;
  pierce_damage: number;
  crush_damage: number;
  divine_damage?: number;
  attack_speed: number;
  type?: 'melee' | 'ranged';
  range?: number;
  number_projectiles?: number;
}

// === ENTITIES === //

export interface Unit extends Entity {
  type: 'unit';
  population_cost: number;
  hitpoints: number;
  speed: number;
  cost: Cost;
  unit_category: UnitCategory; // One of: human, hero, myth
  unit_tags: UnitTag[]; // e.g. is_infantry, is_archer
  defensive_stats: DefensiveStats;
  gather_rate?: GatherRate;
  attack?: AttackStats;
  abilities?: string[]; // keys from abilities
}

export interface Building extends Entity {
  type: 'building';
  cost: Cost;
  defensive_stats: DefensiveStats;
  attack?: AttackStats;
  functions: {
    trains_units?: string[];
    researches_techs?: string[];
  };
}

export interface Technology extends Entity {
  type: 'technology';
  research_location: string; // Building name
  cost: Cost;
  prerequisites?: {
    building?: string;
    age?: Age;
    god?: string;
    tech?: string;
  }[];
  effects: Array<{
    noun: {
      unit_tags?: UnitTag[];
      unit_name?: string;
      building_name?: string;
      tech_name?: string;
    };
    verb: 'add' | 'multiply';
    adjective: string; // e.g. 'speed', 'line_of_sight', 'hack_armor'
    value: number;
  }>;
}

export interface MajorGod extends Entity {
  type: 'majorGod';
  tagline: string;
  godPowers: string[];
  passive_bonuses?: string[];
  minorGods: string[];
}

export interface MinorGod extends Entity {
  type: 'minorGod';
  tagline: string;
  godPowers: string[];
  myth_unit?: string;
  technologies?: string[];
}

export interface Ability extends Entity {
  type: 'ability';
  cooldown: number;
  description?: string;
  area_of_effect?: number;
  duration?: number;
}

export interface GodPower extends Entity {
  type: 'godPower';
  description?: string;
  is_passive?: boolean;
  cooldown?: number;
  area_of_effect?: number;
  duration?: number;
}

// === CIVILIZATION === //

export interface Civ {
  name: CivName;
  majorGods: Record<string, MajorGod>;
  minorGods: Record<string, MinorGod>;
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  technologies: Record<string, Technology>;
  abilities: Record<string, Ability>;
  godPowers: Record<string, GodPower>;
}
