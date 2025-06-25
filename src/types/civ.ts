export interface Civ {
    majorGods: MajorGod[];
    units: Unit[];
  }
  
  export interface MajorGod {
    name: string;
    tagline: string;
    image: string;
    godPower: string;
  }
  
  export interface Unit {
    name: string;
    type: "unit";
    unit_class: string[]; // e.g., ["is_infantry", "is_archer"]
    cost: { food?: number; wood?: number; gold?: number };
    hitpoints: number;
    attack?: {
      type: "melee" | "ranged";
      damage: number;
      reload_time?: number; // Only for ranged
      range?: number; // Only for ranged
    };
    ability?: { // Only for heroes and myth units
      name: string;
      cooldown: number;
    };
  }