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
  // UPDATED: Added min/max constraints as requested
  number_projectiles: z.number().int().min(1).max(256).optional(),
  // Multipliers
  vs_human: z.number().optional(),
  vs_hero: z.number().optional(),
  vs_myth: z.number().optional(),
  vs_ranged: z.number().optional(),
  vs_infantry: z.number().optional(),
  vs_siege: z.number().optional(),
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
// PRIMARY UNIT SCHEMA (Now with conditional logic)
// =================================================================

export const unitSchema = baseEntitySchema.extend({
  type: z.literal('unit'),
  population_cost: z.number().int().min(0, "Population cost cannot be negative."),
  hitpoints: z.number().int().positive({ message: "Hitpoints must be greater than 0." }),
  speed: z.number().min(0),
  cost: costSchema,
  unit_category: z.enum(['human', 'myth', 'hero']),
  unit_tags: z.array(z.enum([
    'is_infantry', 'is_ranged', 'is_siege', 'is_cavalry', 
    'is_flying', 'is_economic', 'is_ship'
  ])),
  defensive_stats: defensiveStatsSchema,
  gather_rate: gatherRateSchema,
  attack: attackStatsSchema,
  abilities: z.array(z.string()).optional(),
}).superRefine((unit, ctx) => {
    // This is a super-powered refinement function. It lets us add conditional rules.

    // --- Ranged Unit Rules ---
    if (unit.attack?.type === 'ranged') {
        // Rule 1a: Ranged units must have a range value.
        if (unit.attack.range === undefined || unit.attack.range <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['attack.range'],
                message: "Ranged units must have a range greater than 0.",
            });
        }
        // Rule 1b: Ranged units must define their number of projectiles.
        if (unit.attack.number_projectiles === undefined) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['attack.number_projectiles'],
                message: "Ranged units must have at least 1 projectile.",
            });
        }
    }

    // --- Melee Unit Rules ---
    // Rule 2: Based on your clarification, no specific validation is needed for melee range.
    // We will handle the implied range of 1 in the UI/display logic later.

    // --- Myth Unit Rules ---
    // Rule 3: Myth units MUST have at least one ability defined.
    if (unit.unit_category === 'myth' && (!unit.abilities || unit.abilities.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['abilities'],
            message: "Myth units are special and must have at least one ability.",
        });
    }

    // --- Hero Unit Rules ---
    // Rule 4: Heroes may have an ability, so no validation needed for that.
    // Rule 5: Heroes MUST have a damage multiplier vs. Myth units.
    if (unit.unit_category === 'hero' && (!unit.attack || unit.attack.vs_myth === undefined || unit.attack.vs_myth <= 1)) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['attack.vs_myth'], // Pinpoints the error to the specific multiplier
            message: "Heroes must have a damage bonus (>1) against Myth units.",
        });
    }
});
