// src/types/civ.ts

// Base entity interface for all objects
interface Entity {
    name: string;
    type: 'unit' | 'building' | 'technology' | 'majorGod' | 'minorGod' | 'ability' | 'godPower';
    image?: string; // Optional image URL
    age_required: 'Archaic' | 'Classical' | 'Heroic' | 'Mythic';
  }
  
  // Shared cost attributes (used by Unit and Building)
  interface Cost {
    food?: number;
    wood?: number;
    gold?: number;
    favor?: number;
    stone?: number; // Added for buildings like towers
  }
  
  // Shared defensive stats (used by Unit and defensible Building)
  interface DefensiveStats {
    hack_armor: number;
    pierce_armor: number;
    crush_armor: number;
  }
  
  // Shared attack stats (used by Unit and defensible Building)
  interface AttackStats {
    hack_damage: number;
    pierce_damage: number;
    crush_damage: number;
    divine_damage?: number; // Optional for myth units or special buildings
  }
  
  // Unit: Has cost, defensive stats, attack stats, and unique population cost
  interface Unit extends Entity {
    type: 'unit';
    unit_class: string[]; // e.g., ['is_infantry', 'is_archer']
    population_cost: number; // Unique to units
    hitpoints: number;
    cost: Cost;
    defensive_stats: DefensiveStats;
    attack?: AttackStats & { // Optional attack with additional properties for ranged units
      type?: 'melee' | 'ranged';
      reload_time?: number;
      range?: number;
    };
    abilities?: string[]; // Names of abilities from abilities record
  }
  
  // Building: Has cost, defensive stats, and optional attack stats for defensible buildings
  interface Building extends Entity {
    type: 'building';
    cost: Cost;
    defensive_stats: DefensiveStats;
    attack?: AttackStats; // Only for towers, castles, etc.
    functions: {
      trains_units?: string[]; // Unit names
      researches_techs?: string[]; // Tech names
    };
  }
  
  // Technology: No cost or stats, but has effects
  interface Technology extends Entity {
    type: 'technology';
    research_location: string; // Building name
    effects: Array<{
      target: { unit_tags: string[] }; // e.g., ['is_infantry']
      property: string; // e.g., 'hack_armor'
      operation: 'add' | 'multiply';
      value: number;
    }>;
  }
  
  // MajorGod: Has god powers
  interface MajorGod extends Entity {
    type: 'majorGod';
    tagline: string;
    godPowers: string[]; // Names of god powers from godPowers record
  }
  
  // MinorGod: Has god powers and myth unit/techs
  interface MinorGod extends Entity {
    type: 'minorGod';
    tagline: string;
    godPowers: string[]; // Names of god powers from godPowers record
    myth_unit?: string; // Myth unit name
    technologies?: string[]; // Tech names
  }
  
  // Ability: For myth units and heroes
  interface Ability extends Entity {
    type: 'ability';
    cooldown: number;
    description?: string;
  }
  
  // GodPower: For major and minor gods
  interface GodPower extends Entity {
    type: 'godPower';
    description?: string;
  }
  
  // Civilization interface
  interface Civ {
    name: string;
    majorGods: Record<string, MajorGod>;
    minorGods: Record<string, MinorGod>;
    units: Record<string, Unit>;
    buildings: Record<string, Building>;
    technologies: Record<string, Technology>;
    abilities: Record<string, Ability>;
    godPowers: Record<string, GodPower>;
  }