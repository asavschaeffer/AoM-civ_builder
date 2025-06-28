import { html, render } from 'lit-html';
import { z } from 'zod';
import { Entity, Unit, Cost, DefensiveStats, AttackStats, UnitTag, UnitCategory } from '../types/civ';
import { unitSchema } from '../types/schemas';
import { data, renderAll, showPreview } from '../main';

// =================================================================
// MODULE STATE & PRIVATE VARIABLES
// =================================================================

let editingEntity: Unit | null = null; // We can be more specific now
let originalEntityName: string | null = null;
let triggerElement: HTMLElement | null = null;
let editorContainer: HTMLElement | null = null;
let contentContainer: HTMLElement | null = null;
let backgroundOverlay: HTMLElement | null = null;
let formErrors: Record<string, string[] | undefined> | null = null;

// =================================================================
// EVENT HANDLERS & CORE LOGIC
// =================================================================

/**
 * Re-renders the entire form based on the current state of editingEntity.
 * This is crucial for showing/hiding conditional fields.
 */
function rerenderForm() {
    if (editorContainer && editingEntity) {
        render(renderUnitForm(editingEntity), editorContainer);
    }
}

function updateState(path: string, value: any, shouldRerender = false) {
    if (!editingEntity) return;

    const keys = path.split('.');
    let obj: any = editingEntity;
    while (keys.length > 1) {
        const key = keys.shift();
        if (key && typeof obj[key] === 'undefined') {
            obj[key] = {};
        }
        if (key) { obj = obj[key]; }
    }
    
    if (typeof obj[keys[0]] === 'number' || !isNaN(Number(value))) {
        obj[keys[0]] = Number(value) || 0; // Default to 0 if parsing results in NaN
    } else {
        obj[keys[0]] = value;
    }

    validateForm(true); 
    
    if (shouldRerender) {
        rerenderForm();
    }
}

function toggleTag(tag: UnitTag) {
    if (!editingEntity) return;
    const tags = new Set(editingEntity.unit_tags);
    if (tags.has(tag)) {
        tags.delete(tag);
    } else {
        tags.add(tag);
    }
    editingEntity.unit_tags = Array.from(tags);
    rerenderForm(); 
}

function validateForm(isLiveValidation = false): boolean {
    if (!editingEntity) return false;
    const result = unitSchema.safeParse(editingEntity);
    if (result.success) {
        if (!isLiveValidation) {
            formErrors = null;
        }
        return true;
    } else {
        formErrors = result.error.flatten().fieldErrors;
        return false;
    }
}

function handleSave() {
  if (!editingEntity || !data || !originalEntityName) return;
  
  if (!validateForm()) {
    console.error("Validation failed:", formErrors);
    rerenderForm();
    return;
  }

  console.log("Saving changes for:", editingEntity.name);
  const collectionKey = `${editingEntity.type}s` as keyof typeof data;
  const collection = data[collectionKey] as Record<string, Entity> | undefined;

  if (collection) {
      const entityKey = Object.keys(collection).find(key => (collection[key] as Entity).name === originalEntityName);
      if (entityKey) {
        collection[entityKey] = editingEntity;
        originalEntityName = editingEntity.name;
        localStorage.setItem('customGreekCiv', JSON.stringify(data));
        console.log('Saved to localStorage!');
        renderAll();
        showPreview(editingEntity);
      }
  }
  closeEditor();
}

function handleDiscard() { closeEditor(); }
function handleBackgroundClick(event: MouseEvent) { if (event.target === backgroundOverlay) handleSave(); }

// =================================================================
// PUBLIC API (openEditor and closeEditor are unchanged from previous version)
// =================================================================
export function closeEditor() { if (!editorContainer || !triggerElement || !contentContainer || !backgroundOverlay) return; backgroundOverlay.removeEventListener('click', handleBackgroundClick, true); const endRect = triggerElement.getBoundingClientRect(); const startRect = editorContainer.getBoundingClientRect(); const deltaX = endRect.left - startRect.left; const deltaY = endRect.top - startRect.top; const deltaW = endRect.width / startRect.width; const deltaH = endRect.height / startRect.height; editorContainer.style.transformOrigin = 'top left'; editorContainer.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'; editorContainer.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) scaleX(${deltaW}) scaleY(${deltaH})`; editorContainer.style.opacity = '0'; backgroundOverlay.style.opacity = '0'; editorContainer.addEventListener('transitionend', () => { if (!contentContainer || !backgroundOverlay) return; editorContainer!.style.display = 'none'; contentContainer.style.display = ''; backgroundOverlay.remove(); backgroundOverlay = null; }, { once: true }); }
export function openEditor(entityToEdit: Entity, triggerEl: HTMLElement) { if (entityToEdit.type !== 'unit') { console.log(`Editor for ${entityToEdit.type} not implemented yet.`); return; } formErrors = null; triggerElement = triggerEl; originalEntityName = entityToEdit.name; editingEntity = JSON.parse(JSON.stringify(entityToEdit)); rerenderForm(); const section = triggerElement.closest('section'); if (!section) return; editorContainer = section.querySelector('.editor-container') as HTMLElement | null; contentContainer = section.querySelector('.content-with-preview, .carousel-scene') as HTMLElement | null; if (!editorContainer || !contentContainer) return; backgroundOverlay = document.createElement('div'); backgroundOverlay.className = 'editor-background-overlay'; document.body.appendChild(backgroundOverlay); const startRect = triggerElement.getBoundingClientRect(); contentContainer.style.display = 'none'; editorContainer.style.display = 'block'; editorContainer.style.opacity = '0'; const endRect = editorContainer.getBoundingClientRect(); const deltaX = startRect.left - endRect.left; const deltaY = startRect.top - endRect.top; const deltaW = startRect.width / endRect.width; const deltaH = startRect.height / endRect.height; editorContainer.style.transformOrigin = 'top left'; editorContainer.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) scaleX(${deltaW}) scaleY(${deltaH})`; requestAnimationFrame(() => { if (!backgroundOverlay || !editorContainer) return; backgroundOverlay.style.opacity = '1'; editorContainer.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out'; editorContainer.style.transform = 'none'; editorContainer.style.opacity = '1'; }); backgroundOverlay.addEventListener('click', handleBackgroundClick, true); }

// =================================================================
// FORM TEMPLATE RENDERERS
// =================================================================

const renderError = (field: string) => {
    if (!formErrors) return null;
    const keys = field.split('.');
    let errors: any = formErrors;
    for (const key of keys) {
        if (errors && typeof errors === 'object' && key in errors) {
            errors = errors[key];
        } else {
            return null;
        }
    }
    if (Array.isArray(errors)) {
        return html`<div class="form-error">${errors.join(', ')}</div>`;
    }
    return null;
};

function renderUnitForm(unit: Unit) {
  const allTags: UnitTag[] = ['is_infantry', 'is_ranged', 'is_siege', 'is_cavalry', 'is_flying', 'is_economic', 'is_ship'];
  const allCategories: UnitCategory[] = ['human', 'myth', 'hero'];
  
  return html`
    <div class="form-editor">
      <button type="button" class="btn-discard" @click=${handleDiscard} title="Discard Changes & Close"><i class="fas fa-times"></i></button>
      <h2>Edit Unit: ${unit.name}</h2>
      <form @submit=${(e:Event) => e.preventDefault()}>
        <fieldset class="form-fieldset">
            <legend>Basic Info</legend>
            <div class="form-grid">
                <div class="form-field"><label for="unit-name">Name</label><input id="unit-name" type="text" .value=${unit.name} @input=${(e: Event) => updateState('name', (e.target as HTMLInputElement).value)}>${renderError('name')}</div>
                <div class="form-field"><label for="unit-hp">Hitpoints</label><input id="unit-hp" type="number" .value=${unit.hitpoints} @input=${(e: Event) => updateState('hitpoints', (e.target as HTMLInputElement).value)}>${renderError('hitpoints')}</div>
                <div class="form-field"><label for="unit-pop">Population Cost</label><input id="unit-pop" type="number" .value=${unit.population_cost} @input=${(e: Event) => updateState('population_cost', (e.target as HTMLInputElement).value)}>${renderError('population_cost')}</div>
                <div class="form-field"><label for="unit-speed">Speed</label><input id="unit-speed" type="number" step="0.1" .value=${unit.speed} @input=${(e: Event) => updateState('speed', (e.target as HTMLInputElement).value)}>${renderError('speed')}</div>
            </div>
        </fieldset>

        <fieldset class="form-fieldset">
            <legend>Categorization</legend>
            <div class="form-field">
                <label>Unit Category</label>
                <div class="tag-group">
                    ${allCategories.map(cat => html`<button type="button" class="tag-btn ${unit.unit_category === cat ? 'active' : ''}" @click=${() => updateState('unit_category', cat, true)}>${cat}</button>`)}
                </div>
            </div>
            <div class="form-field">
                <label>Unit Tags</label>
                <div class="tag-group">
                    ${allTags.map(tag => html`<button type="button" class="tag-btn ${unit.unit_tags.includes(tag) ? 'active' : ''}" @click=${() => toggleTag(tag)}>${tag.replace('is_', '')}</button>`)}
                </div>
            </div>
        </fieldset>
        
        ${renderCostForm(unit.cost)}
        ${renderDefensiveStatsForm(unit.defensive_stats)}
        ${renderAttackForm(unit.attack)}
        
        <!-- DYNAMICALLY RENDERED SECTIONS -->
        ${unit.unit_category === 'myth' ? renderAbilitiesSection(unit.abilities) : ''}
        ${unit.unit_category === 'hero' && unit.attack ? renderHeroFields(unit.attack) : ''}

        <div class="form-actions"><button type="button" class="btn-save" @click=${handleSave}>Save Changes</button></div>
      </form>
    </div>`;
}

function renderAttackForm(attack?: AttackStats) {
    const hasAttack = !!attack;
    if (!hasAttack) {
        return html`<div class="form-actions"><button type="button" class="btn-add-section" @click=${() => updateState('attack', {}, true)}>+ Add Attack Stats</button></div>`;
    }

    return html`
        <fieldset class="form-fieldset">
            <legend>Attack Stats</legend>
            <div class="form-field">
                <label>Attack Type</label>
                <div class="tag-group">
                    <button type="button" class="tag-btn ${attack.type === 'melee' ? 'active' : ''}" @click=${() => updateState('attack.type', 'melee', true)}>Melee</button>
                    <button type="button" class="tag-btn ${attack.type === 'ranged' ? 'active' : ''}" @click=${() => updateState('attack.type', 'ranged', true)}>Ranged</button>
                </div>
            </div>
            <div class="form-grid four-cols">
                <div class="form-field"><label>Hack Dmg</label><input type="number" .value=${attack.hack_damage || 0} @input=${(e: Event) => updateState('attack.hack_damage', (e.target as HTMLInputElement).value)}>${renderError('attack.hack_damage')}</div>
                <div class="form-field"><label>Pierce Dmg</label><input type="number" .value=${attack.pierce_damage || 0} @input=${(e: Event) => updateState('attack.pierce_damage', (e.target as HTMLInputElement).value)}>${renderError('attack.pierce_damage')}</div>
                <div class="form-field"><label>Crush Dmg</label><input type="number" .value=${attack.crush_damage || 0} @input=${(e: Event) => updateState('attack.crush_damage', (e.target as HTMLInputElement).value)}>${renderError('attack.crush_damage')}</div>
                <div class="form-field"><label>Divine Dmg</label><input type="number" .value=${attack.divine_damage || 0} @input=${(e: Event) => updateState('attack.divine_damage', (e.target as HTMLInputElement).value)}>${renderError('attack.divine_damage')}</div>
                <div class="form-field"><label>Attack Speed</label><input type="number" step="0.1" .value=${attack.attack_speed || 0} @input=${(e: Event) => updateState('attack.attack_speed', (e.target as HTMLInputElement).value)}>${renderError('attack.attack_speed')}</div>
                
                ${attack.type === 'ranged' ? html`
                    <div class="form-field"><label>Range</label><input type="number" .value=${attack.range || 0} @input=${(e: Event) => updateState('attack.range', (e.target as HTMLInputElement).value)}>${renderError('attack.range')}</div>
                    <div class="form-field"><label>Projectiles</label><input type="number" .value=${attack.number_projectiles || 0} @input=${(e: Event) => updateState('attack.number_projectiles', (e.target as HTMLInputElement).value)}>${renderError('attack.number_projectiles')}</div>
                ` : ''}
            </div>
            ${renderMultipliersForm(attack)}
        </fieldset>
    `;
}

function renderMultipliersForm(attack: AttackStats) {
    return html`
        <fieldset class="form-fieldset nested">
            <legend>Damage Multipliers</legend>
            <div class="form-grid six-cols">
                <div class="form-field"><label>vs Human</label><input type="number" step="0.1" .value=${attack.vs_human || 1} @input=${(e: Event) => updateState('attack.vs_human', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Hero</label><input type="number" step="0.1" .value=${attack.vs_hero || 1} @input=${(e: Event) => updateState('attack.vs_hero', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Myth</label><input type="number" step="0.1" .value=${attack.vs_myth || 1} @input=${(e: Event) => updateState('attack.vs_myth', (e.target as HTMLInputElement).value)}>${renderError('attack.vs_myth')}</div>
                <div class="form-field"><label>vs Ranged</label><input type="number" step="0.1" .value=${attack.vs_ranged || 1} @input=${(e: Event) => updateState('attack.vs_ranged', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Infantry</label><input type="number" step="0.1" .value=${attack.vs_infantry || 1} @input=${(e: Event) => updateState('attack.vs_infantry', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Cavalry</label><input type="number" step="0.1" .value=${attack.vs_cavalry || 1} @input=${(e: Event) => updateState('attack.vs_cavalry', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Siege</label><input type="number" step="0.1" .value=${attack.vs_siege || 1} @input=${(e: Event) => updateState('attack.vs_siege', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Building</label><input type="number" step="0.1" .value=${attack.vs_building || 1} @input=${(e: Event) => updateState('attack.vs_building', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>vs Ship</label><input type="number" step="0.1" .value=${attack.vs_ship || 1} @input=${(e: Event) => updateState('attack.vs_ship', (e.target as HTMLInputElement).value)}></div>
            </div>
        </fieldset>
    `;
}

function renderAbilitiesSection(abilities?: string[]) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Abilities</legend>
            <div class="form-field">
                <input type="text" placeholder="e.g., Swift Shot, Gore Charge" .value=${(abilities || []).join(', ')} @input=${(e: Event) => updateState('abilities', (e.target as HTMLInputElement).value.split(',').map(s => s.trim()))}>
                ${renderError('abilities')}
            </div>
        </fieldset>
    `;
}

function renderHeroFields(attack: AttackStats) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Hero Bonuses</legend>
            <div class="form-grid">
                <div class="form-field">
                    <label>vs. Myth Multiplier</label>
                    <input type="number" step="0.1" .value=${attack.vs_myth || 1} @input=${(e: Event) => updateState('attack.vs_myth', (e.target as HTMLInputElement).value)}>
                    ${renderError('attack.vs_myth')}
                </div>
            </div>
        </fieldset>
    `;
}

function renderCostForm(cost: Cost) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Resource Cost</legend>
            <div class="form-grid four-cols">
                <div class="form-field"><label>Food</label><input type="number" .value=${cost.food || 0} @input=${(e: Event) => updateState('cost.food', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>Wood</label><input type="number" .value=${cost.wood || 0} @input=${(e: Event) => updateState('cost.wood', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>Gold</label><input type="number" .value=${cost.gold || 0} @input=${(e: Event) => updateState('cost.gold', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>Favor</label><input type="number" .value=${cost.favor || 0} @input=${(e: Event) => updateState('cost.favor', (e.target as HTMLInputElement).value)}></div>
            </div>
        </fieldset>
    `;
}

function renderDefensiveStatsForm(stats: DefensiveStats) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Armor</legend>
            <div class="form-grid">
                <div class="form-field"><label>Hack Armor</label><input type="number" .value=${stats.hack_armor || 0} @input=${(e: Event) => updateState('defensive_stats.hack_armor', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>Pierce Armor</label><input type="number" .value=${stats.pierce_armor || 0} @input=${(e: Event) => updateState('defensive_stats.pierce_armor', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label>Crush Armor</label><input type="number" .value=${stats.crush_armor || 0} @input=${(e: Event) => updateState('defensive_stats.crush_armor', (e.target as HTMLInputElement).value)}></div>
            </div>
        </fieldset>
    `;
}
