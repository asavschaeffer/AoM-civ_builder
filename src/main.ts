// src/main.ts
import { html, render } from 'lit-html';
import civData from './data/civData.json';
import { Civ, Entity, MajorGod, MinorGod, Unit, Building, Technology, Ability, GodPower } from './types/civ';

const data = civData as Civ;

// State management
let activeEntity: string | null = null;
let activeMajorGod = localStorage.getItem('activeMajorGod') || 'zeus';
let activeBuilding: string | null = null;

// --- HELPERS ---
const STAT_ICONS = {
  hitpoints: '❤️',
  hack_armor: '🦺',
  pierce_armor: '🛡️',
  crush_armor: '🪨',
  speed: '👟',
  hack_damage: '⚔️',
  pierce_damage: '🏹',
  crush_damage: '💥',
  divine_damage: '⚡',
  reload_time: '〽️',
  range: '🎯',
  garrison: '🏰'
};

const GOD_ICONS = {
  zeus: '⚡',
  poseidon: '🔱',
  hades: '💀',
  default: '❓'
};

function setActiveEntity(entity: string | null) {
  console.log('Setting activeEntity:', entity);
  activeEntity = entity;
  localStorage.setItem('activeEntity', entity || '');
}

function setActiveMajorGod(god: string) {
  activeMajorGod = god;
  localStorage.setItem('activeMajorGod', god);
  renderAll();
}

function setActiveBuilding(building: string | null) {
  console.log('Setting activeBuilding:', building);
  activeBuilding = building ? building.toLowerCase() : null;
  activeEntity = null;
  localStorage.setItem('activeBuilding', building || '');
  renderAll();
}

// Helper to find buildings for units/techs
function findRelatedBuildings(
  entityName: string,
  buildings: Record<string, Building>,
  relation: 'trains_units' | 'researches_techs'
): string[] {
  console.log(`Checking ${relation} for ${entityName}`);
  const related = Object.values(buildings)
    .filter(building => building.functions[relation]?.includes(entityName))
    .map(building => building.name);
  console.log(`Found related buildings: ${related.join(', ')}`);
  return related;
}

// Helper to find god powers
function findGodPowers(god: MajorGod | MinorGod, godPowers: Record<string, GodPower>): GodPower[] {
  return (god.godPowers || [])
    .map(name => godPowers[name])
    .filter((power): power is GodPower => !!power);
}

// === Templates ===

const majorGodsTemplate = (gods: Record<string, MajorGod>) => html`
  <div class="carousel" role="region" aria-roledescription="carousel" aria-label="Major Gods Carousel">
    ${Object.entries(gods).map(
      ([key, god]) => html`
        <article
          class="tile major-god ${key === activeMajorGod ? 'active' : 'ghosted'}"
          data-god="${key}"
          style="background-image: url('${god.image || 'assets/placeholder.jpg'}')"
          tabindex="0"
          @click=${() => {
            setActiveMajorGod(key);
            //owPreview(god);
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveMajorGod(key);
              //owPreview(god);
            }
          }}
        >
          <h4>${god.name}</h4>
          <p class="tagline">${god.tagline}</p>
          ${findGodPowers(god, data.godPowers).map(
            power => html`
              <div class="god-power">
                <img src="${power.image || 'assets/placeholder.jpg'}" alt="${power.name}" class="sprite god-power" width="64" height="64" />
                <p>${power.name}</p>
              </div>
            `
          )}
          ${god.passive_bonuses?.length
            ? html`<p>Bonuses: ${god.passive_bonuses.join(', ')}</p>`
            : ''}
        </article>
      `
    )}
  </div>
`;

const minorGodsTemplate = (gods: Record<string, MinorGod>) => html`
  <div class="grid">
    ${Object.values(gods)
      .filter(god => !god.prerequisite_god || god.prerequisite_god.toLowerCase() === activeMajorGod)
      .map(
        god => html`
          <div class="tile minor-god" @click=${() => showPreview(god)} tabindex="0">
            <img src="${god.image || 'assets/placeholder.jpg'}" alt="${god.name} Sprite" class="sprite" width="64" height="64" />
            <h5>${god.name}</h5>
            <p>${god.tagline}</p>
            ${findGodPowers(god, data.godPowers).map(power => html`<p>God Power: ${power.name}</p>`)}
          </div>
        `
      )}
  </div>
`;

function createUnitsTechsGridLayout(
  units: Record<string, Unit>,
  technologies: Record<string, Technology>,
  activeBuilding: string | null,
  activeMajorGod: string
): (string | null)[][] {
  const layout: (string | null)[][] = [
    [null, null, null, null, null, null], // Units
    [null, null, null, null, null, null], // Unit-based techs
    [null, null, null, null, null, null]  // Mythic/generic techs
  ];

  if (!activeBuilding) {
    console.log('No activeBuilding, returning empty layout');
    return layout;
  }

  // Find the building
  const building = Object.values(data.buildings).find(b => b.name.toLowerCase() === activeBuilding);
  if (!building) {
    console.warn(`Building ${activeBuilding} not found in data.buildings`);
    return layout;
  }

  // Row 1: Units from trains_units
  const trainableUnits = (building.functions.trains_units || [])
    .map(unitKey => units[unitKey])
    .filter((unit): unit is Unit => !!unit)
    .slice(0, 6);
  console.log('Trainable Units:', trainableUnits.map(u => u.name));
  trainableUnits.forEach((unit, index) => {
    if (index < 6) {
      layout[0][index] = unit.name.toLowerCase();
    }
  });

  // Get all researchable techs
  const researchableTechs = (building.functions.researches_techs || [])
    .map(techKey => technologies[techKey])
    .filter((tech): tech is Technology => !!tech);
  console.log('Researchable Techs:', researchableTechs.map(t => t.name));

  // Separate unit-based and mythic/generic techs
  const unitBasedTechs: Technology[] = [];
  const mythicGenericTechs: Technology[] = [];
  researchableTechs.forEach(tech => {
    const hasUnitEffect = tech.effects.some(effect => effect.noun.unit_name || effect.noun.unit_tags?.length);
    if (hasUnitEffect) {
      unitBasedTechs.push(tech);
    } else {
      mythicGenericTechs.push(tech);
    }
  });

  // Row 2: Unit-based techs, aligned with units
  trainableUnits.forEach((unit, index) => {
    if (index >= 6) return;
    const matchingTech = unitBasedTechs.find(tech =>
      tech.effects.some(effect =>
        (effect.noun.unit_name === unit.name) ||
        (effect.noun.unit_tags?.some(tag => unit.unit_tags.includes(tag) || unit.unit_category.toLowerCase() === tag.replace('is_', '')))
      )
    );
    if (matchingTech) {
      layout[1][index] = matchingTech.name.toLowerCase();
      // Remove used tech to prevent repetition
      const techIndex = unitBasedTechs.indexOf(matchingTech);
      unitBasedTechs.splice(techIndex, 1);
    }
  });

  // Row 3: Mythic/generic techs, filtered by minor gods
  const minorGods = data.majorGods[activeMajorGod]?.minorGods || [];
  const validTechs = mythicGenericTechs
    .filter(tech => !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god))
    .slice(0, 6);
  validTechs.forEach((tech, index) => {
    if (index < 6) {
      layout[2][index] = tech.name.toLowerCase();
    }
  });

  // Add any remaining unit-based techs to row 3 if they weren't matched
  unitBasedTechs.slice(0, 6 - validTechs.length).forEach((tech, index) => {
    const nextFreeIndex = validTechs.length + index;
    if (nextFreeIndex < 6) {
      layout[2][nextFreeIndex] = tech.name.toLowerCase();
    }
  });

  console.log('Units/Techs Layout:', layout);
  return layout;
}


const unitsTechsTemplate = (
  units: Record<string, Unit>,
  technologies: Record<string, Technology>,
  activeBuilding: string | null,
  activeMajorGod: string
) => html`
  ${createUnitsTechsGridLayout(units, technologies, activeBuilding, activeMajorGod).map(row => html`
      ${row.map(entityKey => {
        if (!entityKey) {
          return html`
            <div class="tile placeholder" @click=${() => console.log('Add unit/tech')} tabindex="0" role="button" aria-label="Add new unit or technology">
              <span class="plus-icon">+</span>
            </div>
          `;
        }
        const unit = units[entityKey];
        const tech = technologies[entityKey];
        if (!unit && !tech) {
          console.warn(`Entity ${entityKey} not found in units or technologies`);
          return html`<div class="tile empty"></div>`;
        }
        if (unit) {
          return html`
            <div
              class="tile unit ${activeEntity === unit.name ? 'active' : ''}"
              data-unit="${unit.name}"
              @click=${() => {
                setActiveEntity(unit.name);
                showPreview(unit);
              }}
              tabindex="0"
            >
              <img src="${unit.image || 'assets/placeholderunit.jpg'}" alt="${unit.name} Sprite" class="sprite" width="64" height="64" />
              <h5>${unit.name}</h5>
              <p>Category: ${unit.unit_category}</p>
              <p>Trained at: ${findRelatedBuildings(unit.name, data.buildings, 'trains_units').join(', ') || 'None'}</p>
              ${unit.abilities?.length ? html`<p>Abilities: ${unit.abilities.join(', ')}</p>` : ''}
            </div>
          `;
        }
        return html`
          <div
            class="tile technology ${activeEntity === tech.name ? 'active' : ''}"
            @click=${() => {
              setActiveEntity(tech.name);
              showPreview(tech);
            }}
            tabindex="0"
          >
            <img src="${tech.image || 'assets/placeholder.jpg'}" alt="${tech.name} Sprite" class="sprite" width="64" height="64" />
            <h5>${tech.name}</h5>
            <p>Research at: ${findRelatedBuildings(tech.name, data.buildings, 'researches_techs').join(', ') || tech.research_location}</p>
          </div>
        `;
      })}
  `)}
`;

const buildingGridLayout = [
  ['house', null, null, null, 'temple', 'dock'],
  ['barracks', 'archery_range', 'stable', null, 'market', 'armory'],
  ['town_center', 'wall', 'tower', 'fortress', null, 'wonder']
];

const buildingsTemplate = (buildings: Record<string, Building>) => html`
  ${buildingGridLayout.map(row => row.map(buildingKey => {
    if (!buildingKey) {
      return html`<div class="tile placeholder" @click=${() => openAddBuildingModal()} tabindex="0" role="button" aria-label="Add new building">
      <span class="plus-icon">+</span>
    </div>`
    }
    const building = buildings[buildingKey];
    if (!building) {
      console.warn(`Building ${buildingKey} not found in data.buildings`);
      return html`<div class="tile empty"></div>`;
    }
    return html`
      <div
        class="tile building ${activeBuilding === building.name ? 'active' : ''}"
        @click=${() => {
          setActiveBuilding(building.name);
          showPreview(building);
        }}
        tabindex="0"
      >
        <img src="${building.image || 'assets/placeholder.jpg'}" alt="${building.name} Sprite" class="sprite" width="64" height="64" />
        <h5>${building.name}</h5>
        ${building.functions.trains_units?.length
          ? html`<p>Trains: ${building.functions.trains_units.join(', ')}</p>`
          : ''}
        ${building.functions.researches_techs?.length
          ? html`<p>Researches: ${building.functions.researches_techs.join(', ')}</p>`
          : ''}
      </div>
    `;
  }))}
`;

const abilitiesTemplate = (abilities: Record<string, Ability>) => html`
  <div class="grid">
    ${Object.values(abilities).map(
      ability => html`
        <div class="tile ability" @click=${() => showPreview(ability)} tabindex="0">
          <img src="${ability.image || 'assets/placeholder.jpg'}" alt="${ability.name} Sprite" class="sprite" width="64" height="64" />
          <h5>${ability.name}</h5>
          <p>Cooldown: ${ability.cooldown}s</p>
        </div>
      `
    )}
  </div>
`;

const godPowersTemplate = (godPowers: Record<string, GodPower>) => html`
  <div class="grid">
    ${Object.values(godPowers).map(
      power => html`
        <div class="tile god-power" @click=${() => showPreview(power)} tabindex="0">
          <img src="${power.image || 'assets/placeholder.jpg'}" alt="${power.name} Sprite" class="sprite" width="64" height="64" />
          <h5>${power.name}</h5>
          ${power.description ? html`<p>${power.description}</p>` : ''}
        </div>
      `
    )}
  </div>
`;

/**
 * Main preview template for the new compact card design.
 * @param {object} entity The entity object to display.
 */
const previewCardTemplate = (entity) => {
  if (!entity) {
      return html`<div class="preview-card" style="justify-content: center; align-items: center; display: flex; height: 100%; min-height: 200px;">Select an item to see details.</div>`;
  }

  const attack = entity.attack;
  const isRanged = attack?.type === 'ranged';
  const isBuilding = entity.type === 'building';
  const god = entity.prerequisite_god || (entity.type === 'majorGod' ? entity.name.toLowerCase() : activeMajorGod);

  return html`
  <div class="preview-card">
      <div class="bg-god-logo">${GOD_ICONS[god] || GOD_ICONS.default}</div>

      <!-- Header -->
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

      <!-- Stats Bar -->
      <div class="preview-card-stats">
          ${entity.hitpoints ? html`<span>${STAT_ICONS.hitpoints} ${entity.hitpoints}</span>` : ''}
          ${entity.defensive_stats ? html`
              <span>${STAT_ICONS.hack_armor} ${entity.defensive_stats.hack_armor}%</span>
              <span>${STAT_ICONS.pierce_armor} ${entity.defensive_stats.pierce_armor}%</span>
              <span>${STAT_ICONS.crush_armor} ${entity.defensive_stats.crush_armor}%</span>
          ` : ''}
          ${entity.speed ? html`<span>${STAT_ICONS.speed} ${entity.speed}</span>` : ''}
      </div>

      <!-- Body -->
      <div class="preview-card-body">
          <div class="portrait">
              <img src="${entity.image || 'https://placehold.co/90x120'}" alt="${entity.name}" 
                   onerror="this.onerror=null;this.src='https://placehold.co/90x120/222/fff?text=Image%20Not%20Found';"/>
          </div>
          ${attack ? html`
          <div class="attack-details">
              <h3>${attack.type?.toUpperCase()} ATTACK</h3>
              <div class="stats-grid">
                  ${attack.hack_damage ? html`<div class="label">${STAT_ICONS.hack_damage} Hack</div><div class="value">${attack.hack_damage}</div>` : ''}
                  ${attack.pierce_damage ? html`<div class="label">${STAT_ICONS.pierce_damage} Pierce</div><div class="value">${attack.pierce_damage}</div>` : ''}
                  ${attack.crush_damage ? html`<div class="label">${STAT_ICONS.crush_damage} Crush</div><div class="value">${attack.crush_damage}</div>` : ''}
                  ${attack.reload_time ? html`<div class="label">${STAT_ICONS.reload_time} Reload</div><div class="value">${attack.reload_time}s</div>` : ''}
                  ${isRanged && attack.range ? html`<div class="label">${STAT_ICONS.range} Range</div><div class="value">${attack.range}</div>` : ''}
                  ${isBuilding && entity.functions?.garrison ? html`<div class="label">${STAT_ICONS.garrison} Garrison</div><div class="value">${entity.functions.garrison}</div>` : ''}
                  
                  ${Object.entries(attack).filter(([k, v]) => k.startsWith('vs_') && v > 1).map(([k,v]) => html`
                      <div class="multipliers" style="grid-column: 1 / -1;">
                          ${v}x bonus vs ${k.replace('vs_','')}
                      </div>
                  `)}
              </div>
          </div>
          ` : ''}
      </div>
  </div>`;
};

/**
 * Handles showing the preview in the correct location (inline or modal).
 * @param {object} entity The entity to show.
 */
function showPreview(entity) {
  activeEntity = entity;
  const template = previewCardTemplate(entity);
  
  // Check if we are on a mobile-sized screen
  if (window.matchMedia("(max-width: 768px)").matches) {
      const modal = document.getElementById('preview-modal');
      const content = modal.querySelector('.preview-content');
      render(template, content);
      modal.style.display = 'flex';
  } else {
      // Find the right preview pane based on the entity type
      const containerSelector = entity.type === 'building' ? '.buildings .preview-content' : '.units-techs .preview-content';
      const container = document.querySelector(containerSelector);
      if (container) {
          render(template, container);
      }
  }
   renderAll(); // Re-render to update active states
}


// Stub for edit modal
function openEditModal(_entity: Entity) {
  console.log('Open edit modal for:', _entity.name);
}  // TODO: Implement modal form to edit a thing

function openAddBuildingModal() {
  console.log('Open add building modal');
}  // TODO: Implement modal form to add a building

// Render all sections
function renderAll() {
  const majorGodsContainer = document.querySelector('.major-gods .carousel');
  if (majorGodsContainer instanceof HTMLElement) {
    render(majorGodsTemplate(data.majorGods), majorGodsContainer);
  } else {
    console.error('Major gods container not found or not an HTMLElement');
  }

  const minorGodsContainer = document.querySelector('.minor-gods .grid');
  if (minorGodsContainer instanceof HTMLElement) {
    render(minorGodsTemplate(data.minorGods), minorGodsContainer);
  } else {
    console.error('Minor gods container not found or not an HTMLElement');
  }

  const buildingsContainer = document.querySelector('.buildings .buildings-grid');
  if (buildingsContainer instanceof HTMLElement) {
    render(buildingsTemplate(data.buildings), buildingsContainer);
  } else {
    console.error('Buildings container not found or not an HTMLElement');
  }

  const unitsTechsContainer = document.querySelector('.units-techs .units-techs-grid');
  if (unitsTechsContainer instanceof HTMLElement) {
    render(unitsTechsTemplate(data.units, data.technologies, activeBuilding, activeMajorGod), unitsTechsContainer);
  } else {
    console.error('Units/Techs container not found or not an HTMLElement');
  }

  const abilitiesContainer = document.querySelector('.abilities .grid');
  if (abilitiesContainer instanceof HTMLElement) {
    render(abilitiesTemplate(data.abilities), abilitiesContainer);
  } else {
    console.error('Abilities container not found or not an HTMLElement');
  }

  const godPowersContainer = document.querySelector('.god-powers .grid');
  if (godPowersContainer instanceof HTMLElement) {
    render(godPowersTemplate(data.godPowers), godPowersContainer);
  } else {
    console.error('God powers container not found or not an HTMLElement');
  }
}

// Initial render
renderAll();