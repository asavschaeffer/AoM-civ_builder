import { html, render, nothing } from "lit-html";
import {
  Civ,
  Entity,
  MajorGod,
  MinorGod,
  Unit,
  Building,
  Technology,
  Ability,
  GodPower,
} from "./types/civ";
import { openEditor } from "./components/form";

// === CENTRALIZED STATE MANAGEMENT ===
class AppState {
  private static instance: AppState;
  
  // Core state properties
  private activeEntityKey: string | null = null;
  private activeActionsKey: string | null = null;
  
  // Legacy state variables (for component compatibility)
  private activeMajorGodKey: string = "zeus";
  private activeBuilding: string | null = null;
  
  // Data reference
  private data: Civ | null = null;

  private constructor() {
    // Load initial state from localStorage
    this.activeEntityKey = localStorage.getItem("activeEntity") || "villager";
    this.activeMajorGodKey = localStorage.getItem("activeMajorGod") || "zeus";
    this.activeBuilding = localStorage.getItem("activeBuilding") || "town center";
  }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  // Getters for state access
  get activeEntity(): string | null { return this.activeEntityKey; }
  get activeActions(): string | null { return this.activeActionsKey; }
  get activeMajorGod(): string { return this.activeMajorGodKey; }
  get activeBuildingName(): string | null { return this.activeBuilding; }
  get civData(): Civ | null { return this.data; }

  // Set the data reference
  setData(data: Civ) {
    this.data = data;
  }

// THE CONDUCTOR: Single point of entry for all state changes
setActive(entityKey: string | null, actionsKey: string | null = null) {   
  console.log(`AppState.setActive called with: entity="${entityKey}", actions="${actionsKey}"`);
  
  // 1. Update core state
  this.activeEntityKey = entityKey;
  this.activeActionsKey = actionsKey;
  
  // 2. Execute comprehensive downstream logic
  this.updateDownstreamState();
  
  // 3. Global re-render
  renderAll();
}

  // THE MASTER CHECKLIST: Handles all downstream consequences
  private updateDownstreamState() {
    // 1. Persist state to localStorage
    if (this.activeEntityKey) {
      localStorage.setItem("activeEntity", this.activeEntityKey);
    }
    
    // 2. Update component-specific dependencies
    if (this.data && this.activeEntityKey) {
      const entity = this.findEntityByKey(this.activeEntityKey);
      
      if (entity) {
        // Handle Major God selection
        if (entity.type === 'majorGod') {
          this.activeMajorGodKey = this.activeEntityKey;
          localStorage.setItem("activeMajorGod", this.activeMajorGodKey);
        }
        
        // Handle Building selection
        if (entity.type === 'building') {
          this.activeBuilding = entity.name.toLowerCase();
          localStorage.setItem("activeBuilding", this.activeBuilding);
        }
      }
    }
    
    // 3. Manage the UI (Preview Panes)
    this.updatePreviewPane();
  }

  private updatePreviewPane() {
    // Only show the preview pane automatically on non-mobile devices.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      // On mobile, we do NOT show the preview pane, but we keep the actions state intact
      showPreview(null);
      return; 
    }
  
    // On desktop, show the preview pane for the active entity
    if (this.activeEntityKey && this.data) {
      const entity = this.findEntityByKey(this.activeEntityKey);
      if (entity) {
        showPreview(entity);
      }
    } else {
      // Clear preview panes only on desktop
      showPreview(null);
    }
  }

  // Helper method to find entity by key
  private findEntityByKey(entityKey: string): Entity | null {
    if (!this.data) return null;
    
    const keyLower = entityKey.toLowerCase();
    
    // Search through all collections
    for (const collectionName of ['units', 'buildings', 'technologies', 'majorGods', 'minorGods', 'abilities', 'godPowers']) {
      const collection = this.data[collectionName as keyof Civ] as Record<string, Entity>;
      if (collection) {
        // Try direct key match first
        if (collection[keyLower]) {
          return collection[keyLower];
        }
        // Then try name match
        const found = Object.values(collection).find(entity => 
          entity.name.toLowerCase() === keyLower
        );
        if (found) return found;
      }
    }
    
    return null;
  }

  // Public helper to find entity by name (for external use)
  findEntityByName(entityName: string | null): Entity | null {
    if (!entityName) return null;
    return this.findEntityByKey(entityName);
  }
}

// Global instance
const appState = AppState.getInstance();

// === UNIVERSAL EVENT HANDLER ===
let lastClickTime = 0;
let lastClickEntity = '';

function handleEntityClick(entityKey: string, event?: Event) {
  // Prevent default behavior if it's a click event
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Debounce: Prevent double-clicks within 100ms
  const now = Date.now();
  if (now - lastClickTime < 100 && lastClickEntity === entityKey) {
    console.log("Debounced duplicate click on", entityKey);
    return;
  }
  lastClickTime = now;
  lastClickEntity = entityKey;
  
  // Report user intent to the Conductor
  appState.setActive(entityKey, entityKey); // Using same key for actions for now
}

// === EXISTING GLOBAL VARIABLES (for backward compatibility) ===
export let data: Civ | null = null;

// === RENDER FUNCTIONS ===
export function renderAll() {
  const civData = appState.civData;
  if (!civData) {
    console.warn("renderAll called before data was loaded. Aborting.");
    return;
  }
  
  const carouselContainer = document.querySelector('.major-gods .carousel');
  if (carouselContainer instanceof HTMLElement) {
    render(majorGodsTemplate(civData.majorGods), carouselContainer);
  }
  
  const minorGodsContainer = document.querySelector(".minor-gods .grid");
  if (minorGodsContainer instanceof HTMLElement) {
    render(minorGodsTemplate(civData.minorGods), minorGodsContainer);
  }
  
  const buildingsContainer = document.querySelector(".buildings .buildings-grid");
  if (buildingsContainer instanceof HTMLElement) {
    render(buildingsTemplate(civData.buildings), buildingsContainer);
  }
  
  const unitsTechsContainer = document.querySelector(".units-techs .units-techs-grid");
  if (unitsTechsContainer instanceof HTMLElement) {
    render(unitsTechsTemplate(civData.units, civData.technologies), unitsTechsContainer);
  }
}

export function showPreview(entity: Entity | null) {
  const template = entity ? previewCardTemplate(entity) : nothing;

  if (window.matchMedia("(max-width: 768px)").matches) {
    const modal = document.getElementById("preview-modal") as HTMLDialogElement | null;
    if (!modal) return;

    const content = modal.querySelector(".preview-card");
    if (content instanceof HTMLElement) {
      render(template, content);
    }

    if (entity) {
      const handleClose = (e: Event) => {
        if ((e.target as HTMLElement).closest('.modal-close-btn') || e.target === modal) {
          modal.close();
          modal.removeEventListener('click', handleClose);
        }
      };

      modal.addEventListener('click', handleClose);
      modal.showModal();
    }
  } else {
    // Desktop preview panes
    let containerSelector = '.preview-card';
    
    if (entity) {
      if (entity.type === 'unit' || entity.type === 'technology') {
        containerSelector = '.units-techs .preview-card';
      } else if (entity.type === 'building') {
        containerSelector = '.buildings .preview-card';
      }
      // For majorGod, minorGod, etc., use default '.preview-card'
    }
    
    const container = document.querySelector(containerSelector);
    if (container instanceof HTMLElement) {
      render(template, container);
    }
  }
}

// === ASYNC DATA LOADING ===
async function loadCivData(civName = 'greek'): Promise<boolean> {
  try {
    const localData = localStorage.getItem('customGreekCiv');
    if (localData) {
      console.log("Loading custom civilization from localStorage.");
      data = JSON.parse(localData);
      appState.setData(data);
      return true;
    }
    
    const response = await fetch(`./src/data/civs/${civName}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    data = await response.json() as Civ;
    appState.setData(data);
    console.log("Loaded default civilization data.");
    return true;
  } catch (error) {
    console.error("Could not load civilization data:", error);
    return false;
  }
}

// === HELPERS ===
const STAT_ICONS = { 
  hitpoints: "❤️", hack_armor: "🦺", pierce_armor: "🛡️", crush_armor: "🪨", 
  speed: "👟", hack_damage: "⚔️", pierce_damage: "🏹", crush_damage: "💥", 
  divine_damage: "⚡", reload_time: "〽️", range: "🎯", garrison: "🏰" 
};

const GOD_ICONS = { zeus: "⚡", poseidon: "🔱", hades: "💀", default: "❓" };

function handleEditClick(entityName: string, event: Event) {
  const entityToEdit = appState.findEntityByName(entityName);
  const triggerElement = (event.currentTarget as HTMLElement).closest('.tile, .card, .preview-card') as HTMLElement | null;
  
  if (entityToEdit && triggerElement) {
    openEditor(entityToEdit, triggerElement);
  } else {
    console.error("Could not find entity or trigger element for the editor.", {entityName, triggerElement});
  }
}

// === TEMPLATES ===
const majorGodsTemplate = (gods: Record<string, MajorGod>) => {
  const godKeys = Object.keys(gods);
  const allCardKeys = [...godKeys, 'add-new-god'];
  const activeIndex = godKeys.indexOf(appState.activeMajorGod);

  const selectGod = (key: string) => {
    if (key !== 'add-new-god') {
      handleEntityClick(key);
    } else {
      console.log('add god');
    }
  };

  const removeGod = (key: string) => console.log("Removing god:", key);

  return html`${allCardKeys.map((key, i) => {
    let offset = i - activeIndex;
    if (offset > allCardKeys.length / 2) offset -= allCardKeys.length;
    if (offset < -allCardKeys.length / 2) offset += allCardKeys.length;

    if (key === 'add-new-god') {
      return html`<article class="card add-new-god" data-offset=${offset} @click=${() => selectGod(key)}>
        <i class="fa-solid fa-plus"></i>
      </article>`;
    }

    const god = gods[key];
    const isActionsVisible = appState.activeActions === key;

    return html`<article class="card major-god ${isActionsVisible ? 'actions-visible' : ''}" data-offset=${offset}
      style="background-image: url('${god.image || 'assets/placeholder.jpg'}')"
      @click=${() => selectGod(key)}>
      <div class="card-content">
        <h4>${god.name}</h4>
        <p>${god.tagline}</p>
      </div>
      <div class="card-actions-overlay">
        <button class="action-btn edit-btn"
          @click=${(e: Event) => { e.stopPropagation(); handleEditClick(god.name, e); }}
          title="Edit ${god.name}">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="action-btn delete-btn"
          @click=${(e: Event) => { e.stopPropagation(); removeGod(key); }}
          title="Delete ${god.name}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </article>`;
  })}`;
};

const minorGodsTemplate = (gods: Record<string, MinorGod>) => {
  const removeGod = (key: string) => console.log("Removing minor god:", key);

  return html`${Object.values(gods)
    .filter(god => !god.prerequisite_god || god.prerequisite_god.toLowerCase() === appState.activeMajorGod)
    .map(god => {

      const isActive = appState.activeEntity === god.name;
      const isActionsVisible = appState.activeActions === god.name;

      return html`
      <div class="tile minor-god ${isActive ? "active" : ""} ${isActionsVisible ? "actions-visible" : ""}"
        @click=${() => handleEntityClick(god.name)} tabindex="0">
        <img src="${god.image || "assets/placeholder.jpg"}" alt="${god.name}" class="sprite" />
        <div class="tile-content">
          <h5>${god.name}</h5>
          <p>${god.tagline}</p>
        </div>
        <div class="tile-actions-overlay">
          <button class="action-btn edit-btn"
            @click=${(e: Event) => { e.stopPropagation(); handleEditClick(god.name, e); }}
            title="Edit ${god.name}">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="action-btn delete-btn"
            @click=${(e: Event) => { e.stopPropagation(); removeGod(god.name); }}
            title="Delete ${god.name}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `})}`;
};

const unitsTechsTemplate = (units: Record<string, Unit>, technologies: Record<string, Technology>) => {
  const gridLayout = createUnitsTechsGridLayout(units, technologies);
  const removeEntity = (key: string) => console.log("Removing entity:", key);

  return html`${gridLayout.map(row => row.map(entity => {
    if (!entity) return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;

    const isActive = appState.activeEntity === entity.name;
    const isActionsVisible = appState.activeActions === entity.name;

    return html`<div class="tile ${entity.type} ${isActive ? "active" : ""} ${isActionsVisible ? "actions-visible" : ""}"
      @click=${() => handleEntityClick(entity.name)} tabindex="0">
      <img src="${entity.image || 'assets/placeholder.jpg'}" class="sprite" alt="${entity.name}"/>
      <div class="tile-content">
        <h5>${entity.name}</h5>
      </div>
      <div class="tile-actions-overlay">
        <button class="action-btn edit-btn"
          @click=${(e: Event) => { e.stopPropagation(); handleEditClick(entity.name, e); }}
          title="Edit ${entity.name}">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="action-btn delete-btn"
          @click=${(e: Event) => { e.stopPropagation(); removeEntity(entity.name); }}
          title="Delete ${entity.name}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`;
  }))}`;
};

const buildingsTemplate = (buildings: Record<string, Building>) => {
  const removeBuilding = (key: string) => console.log("Removing building:", key);

  return html`${buildingGridLayout.map(row => row.map(buildingKey => {
    if (!buildingKey) return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;

    const building = Object.values(buildings).find(b => b.name.toLowerCase() === buildingKey);
    if (!building) return html`<div class="tile empty"></div>`;

    const isActive = appState.activeBuildingName === building.name.toLowerCase();
    const isActionsVisible = appState.activeActions === building.name;

    return html`<div class="tile building ${isActive ? "active" : ""} ${isActionsVisible ? "actions-visible" : ""}"
      @click=${() => handleEntityClick(building.name)} tabindex="0">
      <img src="${building.image || "assets/placeholder.jpg"}" alt="${building.name}" class="sprite" />
      <div class="tile-content">
        <h5>${building.name}</h5>
      </div>
      <div class="tile-actions-overlay">
        <button class="action-btn edit-btn"
          @click=${(e: Event) => { e.stopPropagation(); handleEditClick(building.name, e); }}
          title="Edit ${building.name}">
          <i class="fas fa-pencil-alt"></i>
        </button>
        <button class="action-btn delete-btn"
          @click=${(e: Event) => { e.stopPropagation(); removeBuilding(building.name); }}
          title="Delete ${building.name}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`;
  }))}`;
};

const previewCardTemplate = (entity: Entity | null) => {
  if (!entity) return nothing;

  // Added a check for actions visible on the preview card itself.
  const isActionsVisible = appState.activeActions === entity.name;
  const god = entity.prerequisite_god || (entity.type === 'majorGod' ? entity.name.toLowerCase() : appState.activeMajorGod);
  const hasAttack = 'attack' in entity && entity.attack;
  const isRanged = hasAttack && entity.attack.type === 'ranged';

  // Note the added class to the main container div
  return html`
  <div class="preview-card-container ${isActionsVisible ? 'actions-visible' : ''}">
    <div class="bg-god-logo">${GOD_ICONS[god as keyof typeof GOD_ICONS] || GOD_ICONS.default}</div>
    <header class="preview-card-header">
      <div class="title-group">
        <h2>${entity.name}</h2>
        <span class="user">by TheBradFad</span>
      </div>
      <div class="toolbar">
        <div class="level">1</div>
        <div>
          <button title="Info">ℹ️</button>
          <button title="Stats">📈</button>
        </div>
      </div>
    </header>
    <div class="preview-card-stats">
      ${'hitpoints' in entity && entity.hitpoints ? html`<span>${STAT_ICONS.hitpoints} ${entity.hitpoints}</span>` : ''}
      ${'defensive_stats' in entity && entity.defensive_stats ? html`
        <span>${STAT_ICONS.hack_armor} ${entity.defensive_stats.hack_armor}%</span>
        <span>${STAT_ICONS.pierce_armor} ${entity.defensive_stats.pierce_armor}%</span>
        <span>${STAT_ICONS.crush_armor} ${entity.defensive_stats.crush_armor}%</span>
      ` : ''}
      ${'speed' in entity && entity.speed ? html`<span>${STAT_ICONS.speed} ${entity.speed}</span>` : ''}
    </div>
    <div class="preview-card-body">
      <div class="portrait">
        <img src="${entity.image || 'https://placehold.co/90x120'}" alt="${entity.name}"/>
      </div>
      ${hasAttack ? html`
        <div class="attack-details">
          <h3>${entity.attack.type?.toUpperCase()} ATTACK</h3>
          <div class="stats-grid">
            ${entity.attack.hack_damage ? html`<div class="label">${STAT_ICONS.hack_damage} Hack</div><div class="value">${entity.attack.hack_damage}</div>` : ''}
            ${entity.attack.pierce_damage ? html`<div class="label">${STAT_ICONS.pierce_damage} Pierce</div><div class="value">${entity.attack.pierce_damage}</div>` : ''}
            ${entity.attack.crush_damage ? html`<div class="label">${STAT_ICONS.crush_damage} Crush</div><div class="value">${entity.attack.crush_damage}</div>` : ''}
            ${'reload_time' in entity.attack && entity.attack.reload_time ? html`<div class="label">${STAT_ICONS.reload_time} Reload</div><div class="value">${entity.attack.reload_time}s</div>` : ''}
            ${isRanged && entity.attack.range ? html`<div class="label">${STAT_ICONS.range} Range</div><div class="value">${entity.attack.range}</div>` : ''}
            ${Object.entries(entity.attack).filter(([k,v])=>k.startsWith('vs_')&& v && v > 1).map(([k,v])=>html`<div class="multipliers">${v}x vs ${k.replace('vs_','')}</div>`)}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="preview-actions-overlay">
      <button class="action-btn edit-btn"
        @click=${(e: Event) => { e.stopPropagation(); handleEditClick(entity.name, e); }}
        title="Edit ${entity.name}">
        <i class="fas fa-pencil-alt"></i>
      </button>
    </div>
  </div>
  `;
};

// Grid layout functions (unchanged)
function createUnitsTechsGridLayout(units: Record<string, Unit>, technologies: Record<string, Technology>): (Entity | null)[][] {
  const layout: (Entity | null)[][] = [
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
  ];
  
  const activeBuilding = appState.activeBuildingName;
  const civData = appState.civData;
  
  if (!activeBuilding || !civData) return layout;
  
  const building = Object.values(civData.buildings).find(b => b.name.toLowerCase() === activeBuilding);
  if (!building) return layout;
  
  const trainableUnits = (building.functions.trains_units || []).map(unitKey => {
    const keyLower = unitKey.toLowerCase();
    return units[keyLower] || Object.values(units).find(u => u.name.toLowerCase() === keyLower);
  }).filter((unit): unit is Unit => !!unit);
  
  trainableUnits.slice(0, 6).forEach((unit, i) => {
    layout[0][i] = unit;
  });
  
  const researchableTechs = (building.functions.researches_techs || []).map(techKey => {
    const keyLower = techKey.toLowerCase();
    return technologies[keyLower] || Object.values(technologies).find(t => t.name.toLowerCase() === keyLower);
  }).filter((tech): tech is Technology => !!tech);
  
  const unitBasedTechs: Technology[] = [];
  const mythicGenericTechs: Technology[] = [];
  
  researchableTechs.forEach(tech => {
    const hasUnitEffect = tech.effects.some((effect) => effect.noun.unit_name || effect.noun.unit_tags?.length);
    if (hasUnitEffect) {
      unitBasedTechs.push(tech);
    } else {
      mythicGenericTechs.push(tech);
    }
  });
  
  trainableUnits.forEach((unit, index) => {
    if (index >= 6) return;
    const matchingTech = unitBasedTechs.find(tech => tech.effects.some(effect => 
      (effect.noun.unit_name === unit.name) || 
      (effect.noun.unit_tags?.some(tag => unit.unit_tags.includes(tag) || unit.unit_category.toLowerCase() === tag.replace('is_', '')))
    ));
    if (matchingTech) {
      layout[1][index] = matchingTech;
      const techIndex = unitBasedTechs.indexOf(matchingTech);
      unitBasedTechs.splice(techIndex, 1);
    }
  });
  
  const minorGods = civData.majorGods[appState.activeMajorGod]?.minorGods || [];
  const validTechs = mythicGenericTechs.filter(tech => !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god));
  
  validTechs.slice(0, 6).forEach((tech, i) => {
    layout[2][i] = tech;
  });
  
  return layout;
}

const buildingGridLayout = [
  ["house", null, null, null, "temple", "dock"],
  ["barracks", "archery range", "stable", null, "market", "armory"],
  ["town center", "wall", "tower", "fortress", null, "wonder"],
];

// === MAIN FUNCTION ===
async function main() {
  const isDataLoaded = await loadCivData('greek');
  if (!isDataLoaded) {
    console.error("APPLICATION HALTED: Could not initialize.");
    return;
  }
  
  renderAll();
  
  // Initialize with the stored active entity
  const initialEntityName = appState.activeEntity || appState.activeBuildingName;
  if (initialEntityName) {
    appState.setActive(initialEntityName);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main();
});