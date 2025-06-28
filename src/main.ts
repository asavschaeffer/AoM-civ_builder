import { html, render } from "lit-html";
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

// EXPORT these so they can be used in other modules like form.ts
export let data: Civ | null = null;
export function renderAll() {
  if (!data) {
    console.warn("renderAll called before data was loaded. Aborting.");
    return;
  }
  const carouselContainer = document.querySelector('.major-gods .carousel');
  if (carouselContainer instanceof HTMLElement) {
      render(majorGodsTemplate(data.majorGods), carouselContainer);
  }
  const minorGodsContainer = document.querySelector(".minor-gods .grid");
  if(minorGodsContainer instanceof HTMLElement) render(minorGodsTemplate(data.minorGods), minorGodsContainer);
  const buildingsContainer = document.querySelector(".buildings .buildings-grid");
  if(buildingsContainer instanceof HTMLElement) render(buildingsTemplate(data.buildings), buildingsContainer);
  const unitsTechsContainer = document.querySelector(".units-techs .units-techs-grid");
  if(unitsTechsContainer instanceof HTMLElement) render(unitsTechsTemplate(data.units, data.technologies), unitsTechsContainer);
}

// Export showPreview so it can be called from form.ts
export function showPreview(entity: Entity) {
  setActiveEntityName(entity.name);
  const template = previewCardTemplate(entity);
  if (window.matchMedia("(max-width: 768px)").matches) {
    const modal = document.getElementById("preview-modal");
    const content = modal?.querySelector(".preview-pane");
    if (modal && content instanceof HTMLElement) { render(template, content); modal.style.display = "flex"; }
  } else {
    let containerSelector = '.preview-pane';
    if (entity.type === 'unit' || entity.type === 'technology') {
        containerSelector = '.units-techs .preview-pane';
    } else if (entity.type === 'building') {
        containerSelector = '.buildings .preview-pane';
    }
    const container = document.querySelector(containerSelector);
    if (container instanceof HTMLElement) { render(template, container); }
  }
}


// --- STATE MANAGEMENT ---
let activeEntityName: string | null = localStorage.getItem("activeEntity") || null;
let activeMajorGodKey: string = localStorage.getItem("activeMajorGod") || "zeus";
let activeBuilding: string | null = localStorage.getItem("activeBuilding") || "town_center";


// --- ASYNC DATA LOADING ---
async function loadCivData(civName = 'greek'): Promise<boolean> {
  try {
    // Check for locally saved data first.
    const localData = localStorage.getItem('customGreekCiv');
    if (localData) {
        console.log("Loading custom civilization from localStorage.");
        data = JSON.parse(localData);
        return true;
    }
    // If no local data, fetch from file.
    const response = await fetch(`./src/data/civs/${civName}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    data = await response.json() as Civ;
    console.log("Loaded default civilization data.");
    return true; 
  } catch (error) {
    console.error("Could not load civilization data:", error);
    return false; 
  }
}


// --- HELPERS ---

const STAT_ICONS = {
  hitpoints: "❤️", hack_armor: "🦺", pierce_armor: "🛡️", crush_armor: "🪨",
  speed: "👟", hack_damage: "⚔️", pierce_damage: "🏹", crush_damage: "💥",
  divine_damage: "⚡", reload_time: "〽️", range: "🎯", garrison: "🏰",
};
const GOD_ICONS = { zeus: "⚡", poseidon: "🔱", hades: "💀", default: "❓" };

function setActiveEntityName(entityName: string | null) {
  activeEntityName = entityName;
  localStorage.setItem("activeEntity", entityName || "");
}

function setActiveBuilding(buildingName: string | null) {
  activeBuilding = buildingName ? buildingName.toLowerCase() : null;
  setActiveEntityName(null); 
  localStorage.setItem("activeBuilding", buildingName || "");
  renderAll();
}

function findEntityByName(entityName: string | null): Entity | null {
    if (!entityName || !data) return null;
    const nameLower = entityName.toLowerCase();
    for (const key of ['units', 'buildings', 'technologies', 'majorGods', 'minorGods', 'abilities', 'godPowers']) {
        const collection = data[key as keyof Civ] as Record<string, Entity>;
        if (collection) {
            const entityKey = Object.keys(collection).find(k => k.toLowerCase() === nameLower);
            if (entityKey && collection[entityKey]) return collection[entityKey];
            const found = Object.values(collection).find(e => e.name.toLowerCase() === nameLower);
            if (found) return found;
        }
    }
    return null;
}

function handleEditClick(entity: Entity, event: Event) {
  const triggerElement = (event.currentTarget as HTMLElement).closest('.tile, .card, .preview-card') as HTMLElement | null;
  if (triggerElement) {
      openEditor(entity, triggerElement);
  } else {
      console.error("Could not find a valid trigger element for the editor.");
  }
}


// --- TEMPLATES ---

const majorGodsTemplate = (gods: Record<string, MajorGod>) => {
  const godKeys = Object.keys(gods);
  const activeIndex = godKeys.indexOf(activeMajorGodKey);
  const selectGod = (key: string) => { activeMajorGodKey = key; localStorage.setItem("activeMajorGod", key); renderAll(); };
  const removeGod = (key: string) => console.log("Removing god:", key);
  return html`${godKeys.map((key, i) => { const god = gods[key]; let offset = i - activeIndex; if (offset > godKeys.length / 2) offset -= godKeys.length; if (offset < -godKeys.length / 2) offset += godKeys.length;
      return html`<article class="card major-god" data-offset=${offset} style="background-image: url('${god.image || 'assets/placeholder.jpg'}')" @click=${() => offset !== 0 && selectGod(key)}>
          <div class="card-content"><h4>${god.name}</h4><p>${god.tagline}</p></div>
          <div class="card-actions-overlay">
            <button class="action-btn edit-btn" @click=${(e: Event) => { e.stopPropagation(); handleEditClick(god, e); }} title="Edit ${god.name}"><i class="fas fa-pencil-alt"></i></button>
            <button class="action-btn delete-btn" @click=${(e: Event) => { e.stopPropagation(); removeGod(key); }} title="Delete ${god.name}"><i class="fas fa-trash"></i></button>
          </div>
        </article>`;
    })}<article class="card add-new-god" data-offset=${godKeys.length - activeIndex} @click=${() => console.log('add god')}><i class="fa-solid fa-plus"></i></article>`;
};

const minorGodsTemplate = (gods: Record<string, MinorGod>) => {
  if (!data) return '';
  const removeGod = (key: string) => console.log("Removing minor god:", key);
  return html`${Object.values(gods).filter(god => !god.prerequisite_god || god.prerequisite_god.toLowerCase() === activeMajorGodKey).map(god => 
    html`<div class="tile minor-god" @click=${() => showPreview(god)} tabindex="0">
        <img src="${god.image || "assets/placeholder.jpg"}" alt="${god.name}" class="sprite" />
        <div class="tile-content"><h5>${god.name}</h5><p>${god.tagline}</p></div>
        <div class="tile-actions-overlay">
            <button class="action-btn edit-btn" @click=${(e: Event) => { e.stopPropagation(); handleEditClick(god, e); }} title="Edit ${god.name}"><i class="fas fa-pencil-alt"></i></button>
            <button class="action-btn delete-btn" @click=${(e: Event) => { e.stopPropagation(); removeGod(god.name); }} title="Delete ${god.name}"><i class="fas fa-trash"></i></button>
        </div>
    </div>`)}`;
}

const unitsTechsTemplate = (units: Record<string, Unit>, technologies: Record<string, Technology>) => {
    const gridLayout = createUnitsTechsGridLayout(units, technologies);
    const removeEntity = (key: string) => console.log("Removing entity:", key);
    return html`${gridLayout.map(row => row.map(entity => {
        if (!entity) return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
        return html`<div class="tile ${entity.type} ${activeEntityName === entity.name ? "active" : ""}" @click=${() => showPreview(entity)} tabindex="0">
            <img src="${entity.image || 'assets/placeholder.jpg'}" class="sprite" alt="${entity.name}"/>
            <div class="tile-content"><h5>${entity.name}</h5></div>
             <div class="tile-actions-overlay">
                <button class="action-btn edit-btn" @click=${(e: Event) => { e.stopPropagation(); handleEditClick(entity, e); }} title="Edit ${entity.name}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn delete-btn" @click=${(e: Event) => { e.stopPropagation(); removeEntity(entity.name); }} title="Delete ${entity.name}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }))}`;
}

const buildingGridLayout = [ ["house", null, null, null, "temple", "dock"], ["barracks", "archery_range", "stable", null, "market", "armory"], ["town_center", "wall", "tower", "fortress", null, "wonder"], ];
const buildingsTemplate = (buildings: Record<string, Building>) => {
    const removeBuilding = (key: string) => console.log("Removing building:", key);
    return html`${buildingGridLayout.map(row => row.map(buildingKey => {
        if (!buildingKey) return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
        const building = Object.values(buildings).find(b => b.name.toLowerCase() === buildingKey);
        if (!building) return html`<div class="tile empty"></div>`;
        return html`<div class="tile building ${activeBuilding === building.name.toLowerCase() ? "active" : ""}" @click=${() => { setActiveBuilding(building.name); showPreview(building); }} tabindex="0">
            <img src="${building.image || "assets/placeholder.jpg"}" alt="${building.name}" class="sprite" />
            <div class="tile-content"><h5>${building.name}</h5></div>
            <div class="tile-actions-overlay">
                <button class="action-btn edit-btn" @click=${(e: Event) => { e.stopPropagation(); handleEditClick(building, e); }} title="Edit ${building.name}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-btn delete-btn" @click=${(e: Event) => { e.stopPropagation(); removeBuilding(building.name); }} title="Delete ${building.name}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }))}`;
}

const previewCardTemplate = (entity: Entity | null) => {
  if (!entity) return html`<div class="preview-card">Select an item.</div>`;
  const god = entity.prerequisite_god || (entity.type === 'majorGod' ? entity.name.toLowerCase() : activeMajorGodKey);
  const hasAttack = 'attack' in entity && entity.attack; // Type guard
  const isRanged = hasAttack && entity.attack.type === 'ranged';
  
  return html`<div class="preview-card">
      <div class="bg-god-logo">${GOD_ICONS[god as keyof typeof GOD_ICONS] || GOD_ICONS.default}</div>
      <header class="preview-card-header"><div class="title-group"><h2>${entity.name}</h2><span class="user">by TheBradFad</span></div><div class="toolbar"><div class="level">1</div><div><button title="Info">ℹ️</button><button title="Stats">📈</button></div></div></header>
      <div class="preview-card-stats">
          ${'hitpoints' in entity && entity.hitpoints ? html`<span>${STAT_ICONS.hitpoints} ${entity.hitpoints}</span>` : ''}
          ${'defensive_stats' in entity && entity.defensive_stats ? html`<span>${STAT_ICONS.hack_armor} ${entity.defensive_stats.hack_armor}%</span><span>${STAT_ICONS.pierce_armor} ${entity.defensive_stats.pierce_armor}%</span><span>${STAT_ICONS.crush_armor} ${entity.defensive_stats.crush_armor}%</span>` : ''}
          ${'speed' in entity && entity.speed ? html`<span>${STAT_ICONS.speed} ${entity.speed}</span>` : ''}
      </div>
      <div class="preview-card-body">
          <div class="portrait"><img src="${entity.image || 'https://placehold.co/90x120'}" alt="${entity.name}"/></div>
          ${hasAttack ? html`<div class="attack-details"><h3>${entity.attack.type?.toUpperCase()} ATTACK</h3><div class="stats-grid">
              ${entity.attack.hack_damage ? html`<div class="label">${STAT_ICONS.hack_damage} Hack</div><div class="value">${entity.attack.hack_damage}</div>` : ''}
              ${entity.attack.pierce_damage ? html`<div class="label">${STAT_ICONS.pierce_damage} Pierce</div><div class="value">${entity.attack.pierce_damage}</div>` : ''}
              ${entity.attack.crush_damage ? html`<div class="label">${STAT_ICONS.crush_damage} Crush</div><div class="value">${entity.attack.crush_damage}</div>` : ''}
              ${'reload_time' in entity.attack && entity.attack.reload_time ? html`<div class="label">${STAT_ICONS.reload_time} Reload</div><div class="value">${entity.attack.reload_time}s</div>` : ''}
              ${isRanged && entity.attack.range ? html`<div class="label">${STAT_ICONS.range} Range</div><div class="value">${entity.attack.range}</div>` : ''}
              ${Object.entries(entity.attack).filter(([k,v])=>k.startsWith('vs_')&& v && v > 1).map(([k,v])=>html`<div class="multipliers">${v}x vs ${k.replace('vs_','')}</div>`)}
              </div></div>` : ''}
      </div>
      <div class="preview-actions-overlay">
        <button class="action-btn edit-btn" @click=${(e: Event) => { e.stopPropagation(); handleEditClick(entity, e); }} title="Edit ${entity.name}"><i class="fas fa-pencil-alt"></i></button>
      </div>
  </div>`;
};

function createUnitsTechsGridLayout(units: Record<string, Unit>, technologies: Record<string, Technology>): (Entity | null)[][] { const layout: (Entity | null)[][] = [ [null, null, null, null, null, null], [null, null, null, null, null, null], [null, null, null, null, null, null], ]; if (!activeBuilding || !data) return layout; const building = Object.values(data.buildings).find(b => b.name.toLowerCase() === activeBuilding); if (!building) return layout; const trainableUnits = (building.functions.trains_units || []).map(unitKey => { const keyLower = unitKey.toLowerCase(); return units[keyLower] || Object.values(units).find(u => u.name.toLowerCase() === keyLower); }).filter((unit): unit is Unit => !!unit); trainableUnits.slice(0, 6).forEach((unit, i) => { layout[0][i] = unit; }); const researchableTechs = (building.functions.researches_techs || []).map(techKey => { const keyLower = techKey.toLowerCase(); return technologies[keyLower] || Object.values(technologies).find(t => t.name.toLowerCase() === keyLower); }).filter((tech): tech is Technology => !!tech); const unitBasedTechs: Technology[] = []; const mythicGenericTechs: Technology[] = []; researchableTechs.forEach(tech => { const hasUnitEffect = tech.effects.some((effect) => effect.noun.unit_name || effect.noun.unit_tags?.length); if (hasUnitEffect) { unitBasedTechs.push(tech); } else { mythicGenericTechs.push(tech); } }); trainableUnits.forEach((unit, index) => { if (index >= 6) return; const matchingTech = unitBasedTechs.find(tech => tech.effects.some(effect => (effect.noun.unit_name === unit.name) || (effect.noun.unit_tags?.some(tag => unit.unit_tags.includes(tag) || unit.unit_category.toLowerCase() === tag.replace('is_', ''))))); if (matchingTech) { layout[1][index] = matchingTech; const techIndex = unitBasedTechs.indexOf(matchingTech); unitBasedTechs.splice(techIndex, 1); } }); const minorGods = data.majorGods[activeMajorGodKey]?.minorGods || []; const validTechs = mythicGenericTechs.filter(tech => !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god)); validTechs.slice(0, 6).forEach((tech, i) => { layout[2][i] = tech; }); return layout; }

async function main() {
  const isDataLoaded = await loadCivData('greek');
  if (!isDataLoaded) { console.error("APPLICATION HALTED: Could not initialize."); return; }
  renderAll();
  const initialEntity = findEntityByName(activeEntityName || activeBuilding);
  if (initialEntity) { showPreview(initialEntity); }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('preview-modal');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal || (e.target as HTMLElement).classList.contains('modal-close-btn')) {
            if (modal instanceof HTMLElement) { modal.style.display = 'none'; }
        }
    });
    main();
});
