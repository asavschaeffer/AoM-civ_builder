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
// In a real project with a bundler, you would import the JSON.
// For this example to work standalone, we'll need to assume civData is available.
// A fetch call would replace this in a live environment.
import civData from "./data/civData.json";


const data = civData as unknown as Civ;

// --- STATE MANAGEMENT (Preserved from your original code) ---

let activeEntityName: string | null = localStorage.getItem("activeEntity") || null;
let activeMajorGod: string = localStorage.getItem("activeMajorGod") || "zeus";
let activeBuilding: string | null = localStorage.getItem("activeBuilding") || "town_center";


// --- HELPERS (Preserved and expanded) ---

const STAT_ICONS = {
  hitpoints: "❤️",
  hack_armor: "🦺",
  pierce_armor: "🛡️",
  crush_armor: "🪨",
  speed: "👟",
  hack_damage: "⚔️",
  pierce_damage: "🏹",
  crush_damage: "💥",
  divine_damage: "⚡",
  reload_time: "〽️",
  range: "🎯",
  garrison: "🏰",
};

const GOD_ICONS = {
  zeus: "⚡",
  poseidon: "🔱",
  hades: "💀",
  default: "❓",
};

function setActiveEntityName(entityName: string | null) {
  console.log("Setting activeEntityName:", entityName);
  activeEntityName = entityName;
  localStorage.setItem("activeEntity", entityName || "");
}

function setActiveMajorGod(god: string) {
  activeMajorGod = god;
  localStorage.setItem("activeMajorGod", god);
  renderAll();
}

function setActiveBuilding(buildingName: string | null) {
  console.log("Setting activeBuilding:", buildingName);
  activeBuilding = buildingName ? buildingName.toLowerCase() : null;
  setActiveEntityName(null); // Clear entity selection when changing building
  localStorage.setItem("activeBuilding", buildingName || "");
  renderAll();
}

function findRelatedBuildings(
  entityName: string,
  buildings: Record<string, Building>,
  relation: "trains_units" | "researches_techs"
): string[] {
  return Object.values(buildings)
    .filter((building) => building.functions[relation]?.includes(entityName))
    .map((building) => building.name);
}

function findGodPowers(
  god: MajorGod | MinorGod,
  godPowers: Record<string, GodPower>
): GodPower[] {
  return (god.godPowers || [])
    .map((name) => godPowers[name])
    .filter((power): power is GodPower => !!power);
}

function findEntityByName(entityName: string | null): Entity | null {
    if (!entityName) return null;
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


// --- TEMPLATES  ---

const majorGodsTemplate = (gods: Record<string, MajorGod>) => html`
  ${Object.entries(gods).map(
    ([key, god]) => html`
      <article
        class="tile major-god card ${key === activeMajorGod ? "active" : "ghosted"}"
        data-god="${key}"
        style="background-image: url('${god.image || "assets/placeholder.jpg"}')"
        tabindex="0"
        @click=${() => setActiveMajorGod(key)}
      >
        <h4>${god.name}</h4>
        <p class="tagline">${god.tagline}</p>
      </article>
    `
  )}
`;

const minorGodsTemplate = (gods: Record<string, MinorGod>) => html`
  ${Object.values(gods)
    .filter(god => !god.prerequisite_god || god.prerequisite_god.toLowerCase() === activeMajorGod)
    .map(god => html`
        <div class="tile minor-god" @click=${() => showPreview(god)} tabindex="0">
          <img src="${god.image || "assets/placeholder.jpg"}" alt="${god.name}" class="sprite" />
          <h5>${god.name}</h5>
          <p>${god.tagline}</p>
        </div>
      `
    )}
`;

function createUnitsTechsGridLayout(
  units: Record<string, Unit>,
  technologies: Record<string, Technology>
): (Entity | null)[][] {
  const layout: (Entity | null)[][] = [
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
  ];

  if (!activeBuilding) return layout;
  const building = Object.values(data.buildings).find(b => b.name.toLowerCase() === activeBuilding);
  if (!building) return layout;

  const trainableUnits = (building.functions.trains_units || [])
    .map(unitKey => {
        const keyLower = unitKey.toLowerCase();
        return units[keyLower] || Object.values(units).find(u => u.name.toLowerCase() === keyLower);
    })
    .filter((unit): unit is Unit => !!unit);
  
  trainableUnits.slice(0, 6).forEach((unit, i) => { layout[0][i] = unit; });

  const researchableTechs = (building.functions.researches_techs || [])
    .map(techKey => {
        const keyLower = techKey.toLowerCase();
        return technologies[keyLower] || Object.values(technologies).find(t => t.name.toLowerCase() === keyLower);
    })
    .filter((tech): tech is Technology => !!tech);

  const unitBasedTechs: Technology[] = [];
  const mythicGenericTechs: Technology[] = [];
  researchableTechs.forEach(tech => {
    const hasUnitEffect = tech.effects.some(
      (effect) => effect.noun.unit_name || effect.noun.unit_tags?.length
    );
    if (hasUnitEffect) {
      unitBasedTechs.push(tech);
    } else {
      mythicGenericTechs.push(tech);
    }
  });

   trainableUnits.forEach((unit, index) => {
    if (index >= 6) return;
    const matchingTech = unitBasedTechs.find(tech =>
      tech.effects.some(effect =>
        (effect.noun.unit_name === unit.name) ||
        (effect.noun.unit_tags?.some(tag => unit.unit_tags.includes(tag) || unit.unit_category.toLowerCase() === tag.replace('is_', '')))
      )
    );
    if (matchingTech) {
      layout[1][index] = matchingTech;
      const techIndex = unitBasedTechs.indexOf(matchingTech);
      unitBasedTechs.splice(techIndex, 1);
    }
  });

  const minorGods = data.majorGods[activeMajorGod]?.minorGods || [];
  const validTechs = mythicGenericTechs
    .filter(tech => !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god));
  
  validTechs.slice(0, 6).forEach((tech, i) => { layout[2][i] = tech; });

  return layout;
}

const unitsTechsTemplate = (
  units: Record<string, Unit>,
  technologies: Record<string, Technology>
) => {
    const gridLayout = createUnitsTechsGridLayout(units, technologies);
    return html`
    ${gridLayout.map(row => row.map(entity => {
        if (!entity) {
            return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
        }
        return html`
        <div 
            class="tile ${entity.type} ${activeEntityName === entity.name ? "active" : ""}"
            @click=${() => showPreview(entity)}
        >
            <img src="${entity.image || 'assets/placeholder.jpg'}" class="sprite" alt="${entity.name}"/>
            <h5>${entity.name}</h5>
        </div>`;
    }))}`;
}

const buildingGridLayout = [
  ["house", null, null, null, "temple", "dock"],
  ["barracks", "archery_range", "stable", null, "market", "armory"],
  ["town_center", "wall", "tower", "fortress", null, "wonder"],
];

const buildingsTemplate = (buildings: Record<string, Building>) => html`
  ${buildingGridLayout.map(row => row.map(buildingKey => {
    if (!buildingKey) {
      return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
    }
    const building = Object.values(buildings).find(b => b.name.toLowerCase() === buildingKey);
    if (!building) return html`<div class="tile empty"></div>`;
    
    return html`
      <div
        class="tile building ${activeBuilding === building.name.toLowerCase() ? "active" : ""}"
        @click=${() => {
          setActiveBuilding(building.name);
          showPreview(building);
        }}
        tabindex="0"
      >
        <img src="${building.image || "assets/placeholder.jpg"}" alt="${building.name}" class="sprite" />
        <h5>${building.name}</h5>
      </div>`;
  }))}`;


// --- PREVIEW LOGIC ---

const previewCardTemplate = (entity: Entity | null) => {
  if (!entity) {
    return html`<div class="preview-card" style="display:flex; align-items:center; justify-content:center; min-height:200px;">Select an item.</div>`;
  }
  
  const god = entity.prerequisite_god || (entity.type === 'majorGod' ? entity.name.toLowerCase() : activeMajorGod);
  const isRanged = 'attack' in entity && entity.attack?.type === 'ranged';

  return html`
  <div class="preview-card">
      <div class="bg-god-logo">${GOD_ICONS[god as keyof typeof GOD_ICONS] || GOD_ICONS.default}</div>
      <header class="preview-card-header">
          <div class="title-group">
              <h2>${entity.name}</h2>
              <span class="user">by TheBradFad</span>
          </div>
          <div class="toolbar">
              <div class="level">1</div>
              <div><button title="Info">ℹ️</button><button title="Stats">📈</button></div>
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
          <div class="portrait"><img src="${entity.image || 'https://placehold.co/90x120'}" alt="${entity.name}"/></div>
          ${'attack' in entity && entity.attack ? html`
          <div class="attack-details">
              <h3>${entity.attack.type?.toUpperCase()} ATTACK</h3>
              <div class="stats-grid">
                  ${entity.attack.hack_damage ? html`<div class="label">${STAT_ICONS.hack_damage} Hack</div><div class="value">${entity.attack.hack_damage}</div>` : ''}
                  ${entity.attack.pierce_damage ? html`<div class="label">${STAT_ICONS.pierce_damage} Pierce</div><div class="value">${entity.attack.pierce_damage}</div>` : ''}
                  ${entity.attack.crush_damage ? html`<div class="label">${STAT_ICONS.crush_damage} Crush</div><div class="value">${entity.attack.crush_damage}</div>` : ''}
                  ${entity.attack.reload_time ? html`<div class="label">${STAT_ICONS.reload_time} Reload</div><div class="value">${entity.attack.reload_time}s</div>` : ''}
                  ${isRanged && entity.attack.range ? html`<div class="label">${STAT_ICONS.range} Range</div><div class="value">${entity.attack.range}</div>` : ''}
                  ${Object.entries(entity.attack).filter(([k,v])=>k.startsWith('vs_')&& v && v > 1).map(([k,v])=>html`<div class="multipliers">${v}x vs ${k.replace('vs_','')}</div>`)}
              </div>
          </div>` : ''}
      </div>
  </div>`;
};

function showPreview(entity: Entity) {
  setActiveEntityName(entity.name);
  const template = previewCardTemplate(entity);

  if (window.matchMedia("(max-width: 768px)").matches) {
    const modal = document.getElementById("preview-modal");
    const content = modal?.querySelector(".preview-content");
    if (modal && content instanceof HTMLElement) { 
      render(template, content);
      modal.style.display = "flex";
    }
  } else {
    const containerSelector = entity.type === "building" ? ".buildings .preview-content" : ".units-techs .preview-content";
    const container = document.querySelector(containerSelector);
    if (container instanceof HTMLElement) { 
      render(template, container);
    }
  }
  renderAll();
}

// --- RENDER & INITIALIZATION ---

function renderAll() {
  const majorGodsContainer = document.querySelector(".major-gods .carousel");
  if(majorGodsContainer instanceof HTMLElement) render(majorGodsTemplate(data.majorGods), majorGodsContainer);

  const minorGodsContainer = document.querySelector(".minor-gods .grid");
  if(minorGodsContainer instanceof HTMLElement) render(minorGodsTemplate(data.minorGods), minorGodsContainer);

  const buildingsContainer = document.querySelector(".buildings .buildings-grid");
  if(buildingsContainer instanceof HTMLElement) render(buildingsTemplate(data.buildings), buildingsContainer);

  const unitsTechsContainer = document.querySelector(".units-techs .units-techs-grid");
  if(unitsTechsContainer instanceof HTMLElement) render(unitsTechsTemplate(data.units, data.technologies), unitsTechsContainer);
  
  // Other templates (like abilities, godpowers) would be called here.
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('preview-modal');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal || (e.target as HTMLElement).classList.contains('modal-close-btn')) {
            modal.style.display = 'none';
        }
    });

    renderAll();
    
    // Show a default preview on load based on state
    const initialEntity = findEntityByName(activeEntityName || activeBuilding);
    if (initialEntity) {
        showPreview(initialEntity);
    }
});
