import { z } from 'zod';

// =================================================================
// REUSABLE SUB-SCHEMAS
// These match the common interfaces in civ.ts
// =================================================================

const costSchema = z.object({
  food: z.number().min(0).optional(),
  wood: z.number().min(0).optional(),
  gold: z.number().min(0).optional(),
  favor: z.number().min(0).optional(),
}).strict(); // .strict() ensures no extra properties are allowed

const gatherRateSchema = z.object({
    food: z.number().min(0).optional(),
    wood: z.number().min(0).optional(),
    gold: z.number().min(0).optional(),
    favor: z.number().min(0).optional(),
}).strict().optional();

const defensiveStatsSchema = z.object({
  hack_armor: z.number().min(0),
  pierce_armor: z.number().min(0),
  crush_armor: z.number().min(0),
}).strict();

const attackStatsSchema = z.object({
  hack_damage: z.number().min(0),
  pierce_damage: z.number().min(0),
  crush_damage: z.number().min(0),
  divine_damage: z.number().min(0).optional(),
  attack_speed: z.number().positive(),
  type: z.enum(['melee', 'ranged']).optional(),
  range: z.number().min(0).optional(),
  number_projectiles: z.number().int().positive().optional(),
  // Multipliers
  vs_human: z.number().optional(),
  vs_hero: z.number().optional(),
  vs_myth: z.number().optional(),
  vs_ranged: z.number().optional(),
  vs_infantry: z.number().optional(),
  vs_siege: z.number().optional(),
  // THE FIX: Added all missing multiplier keys from the data file.
  vs_building: z.number().optional(),
  vs_archer: z.number().optional(),
  vs_cavalry: z.number().optional(),
  vs_ship: z.number().optional(),
}).strict().optional();


// =================================================================
// BASE ENTITY SCHEMA
// =================================================================

const baseEntitySchema = z.object({
    name: z.string().min(1, { message: "Name cannot be empty." }),
    image: z.string().url().or(z.string().startsWith('assets/')).optional(),
    age_required: z.enum(['Archaic', 'Classical', 'Heroic', 'Mythic']),
    civ: z.enum(['Greek', 'Norse', 'Egyptian', 'Atlantean', 'Chinese']).optional(),
    prerequisite_god: z.string().optional(),
    prerequisite_building: z.string().optional(),
    line_of_sight: z.number().min(0).optional(),
    build_time: z.number().min(0).optional(),
});


// =================================================================
// PRIMARY UNIT SCHEMA
// =================================================================

export const unitSchema = baseEntitySchema.extend({
  type: z.literal('unit'),
  population_cost: z.number().int().min(0),
  hitpoints: z.number().int().positive({ message: "Hitpoints must be greater than 0." }),
  speed: z.number().min(0),
  cost: costSchema,
  unit_category: z.enum(['human', 'myth', 'hero']),
  unit_tags: z.array(z.enum([
    'is_infantry', 'is_archer', 'is_siege', 'is_cavalry', 
    'is_flying', 'is_economic', 'is_ship'
  ])),
  defensive_stats: defensiveStatsSchema,
  gather_rate: gatherRateSchema,
  attack: attackStatsSchema,
  abilities: z.array(z.string()).optional(),
});
