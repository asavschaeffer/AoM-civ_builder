// src/main.ts
import { html, render } from 'lit-html';
import civData from './data/civData.json';
import { Civ,Entity, MajorGod, MinorGod, Unit, Building, Technology, Ability, GodPower } from './types/civ';

const data = civData as Civ;

// State management
let activeEntity: string | null = null;
let activeMajorGod = localStorage.getItem('activeMajorGod') || 'zeus';
let activeBuilding: string | null = null;

function setActiveEntity(entity: string | null) {
  activeEntity = entity;
  localStorage.setItem('activeEntity', entity || '');
}

function setActiveMajorGod(god: string) {
  activeMajorGod = god;
  localStorage.setItem('activeMajorGod', god);
  renderAll();
}

function setActiveBuilding(building: string | null) {
  activeBuilding = building;
  localStorage.setItem('activeBuilding', building || '');
  renderAll();
}

// Helper to find buildings for units/techs
function findRelatedBuildings(
  entityName: string,
  buildings: Record<string, Building>,
  relation: 'trains_units' | 'researches_techs'
): string[] {
  return Object.values(buildings)
    .filter(building => building.functions[relation]?.includes(entityName))
    .map(building => building.name);
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
          class="card major-god ${key === activeMajorGod ? 'active' : 'ghosted'}"
          data-god="${key}"
          style="background-image: url('${god.image || 'assets/placeholder.jpg'}')"
          tabindex="0"
          @click=${() => {
            setActiveMajorGod(key);
            showPreview(god);
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveMajorGod(key);
              showPreview(god);
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
    [null, null, null, null, null, null], // Upgrade techs
    [null, null, null, null, null, null]  // Mythic/generic techs
  ];

  if (!activeBuilding) {
    return layout; // Empty grid if no building selected
  }

  // Get units trainable at the selected building
  const trainableUnits = Object.values(units)
    .filter(unit => findRelatedBuildings(unit.name, data.buildings, 'trains_units').includes(activeBuilding))
    .slice(0, 6); // Limit to 6 units

  // Place units in the top row
  trainableUnits.forEach((unit, index) => {
    if (index < 6) {
      layout[0][index] = unit.name.toLowerCase();
    }
  });

  // Get techs researchable at the selected building
  const researchableTechs = Object.values(technologies)
    .filter(tech => findRelatedBuildings(tech.name, data.buildings, 'researches_techs').includes(activeBuilding));

  // Separate upgrade techs (e.g., medium_cavalry for cavalry units) and mythic/generic techs
  const upgradeTechs: Technology[] = [];
  const mythicGenericTechs: Technology[] = [];

  researchableTechs.forEach(tech => {
    const isUpgrade = tech.name.toLowerCase().includes('medium') || tech.name.toLowerCase().includes('heavy');
    if (isUpgrade) {
      upgradeTechs.push(tech);
    } else {
      mythicGenericTechs.push(tech);
    }
  });

  // Place upgrade techs in the middle row, trying to align with units
  trainableUnits.forEach((unit, index) => {
    if (index >= 6) return;
    const unitCategory = unit.unit_category.toLowerCase();
    const matchingTech = upgradeTechs.find(tech =>
      tech.name.toLowerCase().includes(unitCategory) ||
      (unitCategory === 'infantry' && tech.name.toLowerCase().includes('infantry')) ||
      (unitCategory === 'cavalry' && tech.name.toLowerCase().includes('cavalry'))
    );
    if (matchingTech) {
      layout[1][index] = matchingTech.name.toLowerCase();
    }
  });

  // Place mythic/generic techs in the bottom row, filtered by activeMajorGod
  const minorGods = data.majorGods[activeMajorGod]?.minorGods || [];
  const validTechs = mythicGenericTechs.filter(tech =>
    !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god)
  );
  validTechs.slice(0, 6).forEach((tech, index) => {
    if (index < 6) {
      layout[2][index] = tech.name.toLowerCase();
    }
  });

  return layout;
}


const unitsTechsTemplate = (
  units: Record<string, Unit>,
  technologies: Record<string, Technology>,
  activeBuilding: string | null,
  activeMajorGod: string
) => html`
  ${createUnitsTechsGridLayout(units, technologies, activeBuilding, activeMajorGod).map(row => row.map(entityKey => {
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
  }))}
`;

const buildingGridLayout = [
  ['house', null, null, null, 'temple', 'dock'],
  ['barracks', 'stable', null, null, 'market', 'armory'],
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

// Preview template
function showPreview(entity: Entity) {
  const template = html`
      <h4>${entity.name}</h4>
      <img src="${entity.image || 'assets/placeholder.jpg'}" alt="${entity.name} Preview" class="preview-image" width="200" height="200" />
      <dl class="stats">
        <dt>Age Required</dt>
        <dd>${entity.age_required}</dd>
        <dt>Civilization</dt>
        <dd>${entity.civ || 'None'}</dd>
        <dt>Line of Sight</dt>
        <dd>${entity.line_of_sight}</dd>
        <dt>Build Time</dt>
        <dd>${entity.build_time}s</dd>
        ${entity.prerequisite_god ? html`
          <dt>Prerequisite God</dt>
          <dd>${entity.prerequisite_god}</dd>
        ` : ''}
        ${entity.prerequisite_building ? html`
          <dt>Prerequisite Building</dt>
          <dd>${entity.prerequisite_building}</dd>
        ` : ''}
        ${'cost' in entity && Object.entries((entity as Unit | Building).cost).filter(([_, v]) => v).map(
          ([resource, value]) => html`
            <dt>${resource.charAt(0).toUpperCase() + resource.slice(1)} Cost</dt>
            <dd>${value}</dd>
          `
        )}
        ${'hitpoints' in entity ? html`
          <dt>Hitpoints</dt>
          <dd>${(entity as Unit).hitpoints}</dd>
        ` : ''}
        ${'population_cost' in entity ? html`
          <dt>Population Cost</dt>
          <dd>${(entity as Unit).population_cost}</dd>
        ` : ''}
        ${'speed' in entity ? html`
          <dt>Speed</dt>
          <dd>${(entity as Unit).speed}</dd>
        ` : ''}
        ${'unit_category' in entity ? html`
          <dt>Category</dt>
          <dd>${(entity as Unit).unit_category}</dd>
        ` : ''}
        ${'unit_tags' in entity ? html`
          <dt>Tags</dt>
          <dd>${(entity as Unit).unit_tags.join(', ')}</dd>
        ` : ''}
        ${'defensive_stats' in entity ? html`
          <dt>Hack Armor</dt>
          <dd>${(entity as Unit | Building).defensive_stats.hack_armor}</dd>
          <dt>Pierce Armor</dt>
          <dd>${(entity as Unit | Building).defensive_stats.pierce_armor}</dd>
          <dt>Crush Armor</dt>
          <dd>${(entity as Unit | Building).defensive_stats.crush_armor}</dd>
        ` : ''}
        ${'attack' in entity && (entity as Unit | Building).attack ? html`
          <dt>Attack Type</dt>
          <dd>${(entity as Unit | Building).attack?.type || 'melee'}</dd>
          ${Object.entries((entity as Unit | Building).attack || {})
            .filter(([k, v]) => ['hack_damage', 'pierce_damage', 'crush_damage', 'divine_damage'].includes(k) && v)
            .map(([k, v]) => html`
              <dt>${k.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</dt>
              <dd>${v}</dd>
            `)}
          ${Object.entries((entity as Unit | Building).attack || {})
            .filter(([k, v]) => k.startsWith('vs_') && v)
            .map(([k, v]) => html`
              <dt>${k.replace('vs_', 'Bonus vs ').replace(/\b\w/g, c => c.toUpperCase())}</dt>
              <dd>${v}</dd>
            `)}
        ` : ''}
        ${'gather_rate' in entity && Object.entries((entity as Unit).gather_rate || {}).filter(([_, v]) => v).map(
          ([resource, value]) => html`
            <dt>${resource.charAt(0).toUpperCase() + resource.slice(1)} Gather Rate</dt>
            <dd>${value}</dd>
          `
        )}
        ${'godPowers' in entity ? html`
          <dt>God Powers</dt>
          <dd>${findGodPowers(entity as MajorGod | MinorGod, data.godPowers).map(p => p.name).join(', ')}</dd>
        ` : ''}
        ${'abilities' in entity ? html`
          <dt>Abilities</dt>
          <dd>${(entity as Unit).abilities?.join(', ') || 'None'}</dd>
        ` : ''}
        ${'myth_unit' in entity ? html`
          <dt>Myth Unit</dt>
          <dd>${(entity as MinorGod).myth_unit || 'None'}</dd>
        ` : ''}
        ${'technologies' in entity ? html`
          <dt>Technologies</dt>
          <dd>${(entity as MinorGod).technologies?.join(', ') || 'None'}</dd>
        ` : ''}
        ${'functions' in entity ? html`
          ${Object.entries((entity as Building).functions).filter(([_, v]) => v?.length).map(
            ([k, v]) => html`
              <dt>${k.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</dt>
              <dd>${(v as any).join(', ')}</dd>
            `
          )}
        ` : ''}
        ${'prerequisites' in entity ? html`
          <dt>Prerequisites</dt>
          <dd>${(entity as Technology).prerequisites?.map(p =>
            Object.entries(p).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(', ')
          ).join('; ') || 'None'}</dd>
        ` : ''}
        ${'effects' in entity ? html`
          <dt>Effects</dt>
          <dd>${(entity as Technology).effects.map(e =>
            `${e.verb} ${e.adjective} by ${e.value} for ${e.noun.unit_tags?.join(', ') || e.noun.unit_name || e.noun.building_name || e.noun.tech_name || ''}`
          ).join('; ')}</dd>
        ` : ''}
        ${'cooldown' in entity && (entity as Ability | GodPower).cooldown ? html`
          <dt>Cooldown</dt>
          <dd>${(entity as Ability | GodPower).cooldown}s</dd>
        ` : ''}
        ${'area_of_effect' in entity ? html`
          <dt>Area of Effect</dt>
          <dd>${(entity as GodPower).area_of_effect || 'None'}</dd>
        ` : ''}
        ${'is_passive' in entity ? html`
          <dt>Passive</dt>
          <dd>${(entity as GodPower).is_passive ? 'Yes' : 'No'}</dd>
        ` : ''}
      </dl>
      <button class="edit-btn" @click=${() => openEditModal(entity)}>Edit Details</button>
  `;
  const isBuilding = entity.type === 'building';
  const previewContainer = document.querySelector(
    isBuilding ? '.buildings .preview-content .preview' : '.units-techs .preview-content .preview'
  );
  if (previewContainer instanceof HTMLElement) {
    render(template, previewContainer);
  } else {
    console.error('Preview container not found or not an HTMLElement');
  }
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