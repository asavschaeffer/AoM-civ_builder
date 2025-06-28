import { html, render } from 'lit-html';
import { z } from 'zod';
import { Entity, Unit, Cost, DefensiveStats, AttackStats } from '../types/civ';
import { unitSchema } from '../types/schemas';
import { data, renderAll, showPreview } from '../main';

// =================================================================
// MODULE STATE & PRIVATE VARIABLES
// =================================================================

let editingEntity: Entity | null = null;
let originalEntityName: string | null = null;
let triggerElement: HTMLElement | null = null;
let editorContainer: HTMLElement | null = null;
let contentContainer: HTMLElement | null = null;
let backgroundOverlay: HTMLElement | null = null;
let formErrors: Record<string, string[]> | null = null;


// =================================================================
// EVENT HANDLERS & CORE LOGIC
// =================================================================

function updateState(path: string, value: any) {
    if (!editingEntity) return;
    const keys = path.split('.');
    let obj: any = editingEntity;
    while (keys.length > 1) {
        const key = keys.shift();
        if (key) { obj = obj[key]; }
    }
    if (typeof obj[keys[0]] === 'number' || !isNaN(Number(value))) {
        obj[keys[0]] = Number(value);
    } else {
        obj[keys[0]] = value;
    }

    // Live validation (optional, but good for UX)
    validateForm(true); 
    // Re-render the form to show/hide error messages as the user types
    if (editorContainer && editingEntity) {
        render(renderUnitForm(editingEntity as Unit), editorContainer);
    }
}

/**
 * Validates the current editingEntity against its schema.
 * @param isLiveValidation If true, won't clear errors for fields the user hasn't touched yet.
 */
function validateForm(isLiveValidation = false) {
    if (!editingEntity) return false;

    try {
        // Attempt to parse the data. If it fails, Zod throws an error.
        unitSchema.parse(editingEntity);
        // If we get here, validation passed.
        formErrors = null;
        return true;
    } catch (err) {
        if (err instanceof z.ZodError) {
            // .flatten() gives us a simple object of field errors.
            const flattenedErrors = err.flatten().fieldErrors;
             if (isLiveValidation && formErrors) {
                // If live validating, merge new errors without removing old ones
                // This prevents an error from disappearing just because you typed in another field
                formErrors = { ...formErrors, ...flattenedErrors };
            } else {
                formErrors = flattenedErrors;
            }
        }
        return false;
    }
}


function handleSave() {
  if (!editingEntity || !data || !originalEntityName) return;
  
  // Final validation before saving
  if (!validateForm()) {
    console.error("Validation failed:", formErrors);
    // Re-render the form to make sure all errors are displayed
    if(editorContainer) render(renderUnitForm(editingEntity as Unit), editorContainer);
    return; // Stop the save process
  }

  console.log("Saving changes for:", editingEntity.name);

  const collectionKey = `${editingEntity.type}s` as keyof typeof data;
  const collection = data[collectionKey] as Record<string, Entity> | undefined;

  if (collection) {
      const entityKey = Object.keys(collection).find(key => 
          (collection[key] as Entity).name === originalEntityName
      );

      if (entityKey) {
        collection[entityKey] = editingEntity;
        originalEntityName = editingEntity.name;
        localStorage.setItem('customGreekCiv', JSON.stringify(data));
        console.log('Saved to localStorage!');
        renderAll();
        showPreview(editingEntity);
      } else {
        console.error("Could not find original entity key to save:", originalEntityName);
      }
  } else {
      console.error(`Collection not found for type: ${editingEntity.type}`);
  }
  
  closeEditor();
}

function handleDiscard() {
  if (!editingEntity) return;
  console.log("Discarding changes for:", editingEntity.name);
  closeEditor();
}

function handleBackgroundClick(event: MouseEvent) {
    if (event.target === backgroundOverlay) {
        handleSave();
    }
}

// =================================================================
// PUBLIC API
// =================================================================

export function closeEditor() {
    if (!editorContainer || !triggerElement || !contentContainer || !backgroundOverlay) return;
    backgroundOverlay.removeEventListener('click', handleBackgroundClick, true);
    const endRect = triggerElement.getBoundingClientRect();
    const startRect = editorContainer.getBoundingClientRect();
    const deltaX = endRect.left - startRect.left;
    const deltaY = endRect.top - startRect.top;
    const deltaW = endRect.width / startRect.width;
    const deltaH = endRect.height / startRect.height;
    editorContainer.style.transformOrigin = 'top left';
    editorContainer.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    editorContainer.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) scaleX(${deltaW}) scaleY(${deltaH})`;
    editorContainer.style.opacity = '0';
    backgroundOverlay.style.opacity = '0';
    editorContainer.addEventListener('transitionend', () => {
        if (!contentContainer || !backgroundOverlay) return;
        editorContainer!.style.display = 'none';
        contentContainer.style.display = '';
        backgroundOverlay.remove();
        backgroundOverlay = null; 
    }, { once: true });
}

export function openEditor(entityToEdit: Entity, triggerEl: HTMLElement) {
  console.log("Opening editor for:", entityToEdit.name);
  // Clear any previous errors when opening a new editor
  formErrors = null;
  triggerElement = triggerEl;
  originalEntityName = entityToEdit.name;
  editingEntity = JSON.parse(JSON.stringify(entityToEdit));

  let formTemplate;
  switch (editingEntity.type) {
    case 'unit':
      formTemplate = renderUnitForm(editingEntity as Unit);
      break;
    case 'building': case 'majorGod': case 'minorGod': case 'technology':
      formTemplate = html`<div class="form-editor"><h2>Editor for ${editingEntity.type} coming soon!</h2><div class="form-actions"><button type="button" class="btn-discard" @click=${handleDiscard} title="Discard Changes & Close"><i class="fas fa-times"></i></button><button type="button" class="btn-save" @click=${handleSave}>Save Changes</button></div></div>`;
      break;
    default:
      console.error(`No form definition for entity type`);
      return;
  }

  const section = triggerElement.closest('section');
  if (!section) return;
  
  editorContainer = section.querySelector('.editor-container') as HTMLElement | null;
  contentContainer = section.querySelector('.content-with-preview, .carousel-scene') as HTMLElement | null;

  if (!editorContainer || !contentContainer) return;
  render(formTemplate, editorContainer);
  
  backgroundOverlay = document.createElement('div');
  backgroundOverlay.className = 'editor-background-overlay';
  document.body.appendChild(backgroundOverlay);
  
  const startRect = triggerElement.getBoundingClientRect();
  contentContainer.style.display = 'none';
  editorContainer.style.display = 'block';
  editorContainer.style.opacity = '0';
  const endRect = editorContainer.getBoundingClientRect();
  const deltaX = startRect.left - endRect.left;
  const deltaY = startRect.top - endRect.top;
  const deltaW = startRect.width / endRect.width;
  const deltaH = startRect.height / endRect.height;
  editorContainer.style.transformOrigin = 'top left';
  editorContainer.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) scaleX(${deltaW}) scaleY(${deltaH})`;
  
  requestAnimationFrame(() => {
    if (!backgroundOverlay || !editorContainer) return;
    backgroundOverlay.style.opacity = '1';
    editorContainer.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    editorContainer.style.transform = 'none';
    editorContainer.style.opacity = '1';
  });

  backgroundOverlay.addEventListener('click', handleBackgroundClick, true);
}

// =================================================================
// FORM TEMPLATE RENDERERS
// =================================================================

// Helper to render error messages
const renderError = (field: keyof typeof formErrors) => {
    if (formErrors && formErrors[field]) {
        return html`<div class="form-error">${formErrors[field]!.join(', ')}</div>`;
    }
    return null;
};

function renderUnitForm(unit: Unit) {
  return html`
    <div class="form-editor">
      <button type="button" class="btn-discard" @click=${handleDiscard} title="Discard Changes & Close"><i class="fas fa-times"></i></button>
      <h2>Edit Unit: ${unit.name}</h2>
      <form @submit=${(e:Event) => e.preventDefault()}>
        <div class="form-grid">
            <div class="form-field">
                <label for="unit-name">Name</label>
                <input id="unit-name" type="text" .value=${unit.name} @input=${(e: Event) => updateState('name', (e.target as HTMLInputElement).value)}>
                ${renderError('name')}
            </div>
            <div class="form-field">
                <label for="unit-hp">Hitpoints</label>
                <input id="unit-hp" type="number" .value=${unit.hitpoints} @input=${(e: Event) => updateState('hitpoints', (e.target as HTMLInputElement).value)}>
                ${renderError('hitpoints')}
            </div>
             <div class="form-field">
                <label for="unit-pop">Population Cost</label>
                <input id="unit-pop" type="number" .value=${unit.population_cost} @input=${(e: Event) => updateState('population_cost', (e.target as HTMLInputElement).value)}>
                ${renderError('population_cost')}
            </div>
             <div class="form-field">
                <label for="unit-speed">Speed</label>
                <input id="unit-speed" type="number" step="0.1" .value=${unit.speed} @input=${(e: Event) => updateState('speed', (e.target as HTMLInputElement).value)}>
                ${renderError('speed')}
            </div>
        </div>
        ${renderCostForm(unit.cost)}
        ${unit.defensive_stats ? renderDefensiveStatsForm(unit.defensive_stats) : ''}
        <div class="form-actions">
            <button type="button" class="btn-save" @click=${handleSave}>Save Changes</button>
        </div>
      </form>
    </div>
  `;
}

function renderCostForm(cost: Cost) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Resource Cost</legend>
            <div class="form-grid">
                <div class="form-field"><label for="cost-food">Food</label><input id="cost-food" type="number" .value=${cost.food || 0} @input=${(e: Event) => updateState('cost.food', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="cost-wood">Wood</label><input id="cost-wood" type="number" .value=${cost.wood || 0} @input=${(e: Event) => updateState('cost.wood', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="cost-gold">Gold</label><input id="cost-gold" type="number" .value=${cost.gold || 0} @input=${(e: Event) => updateState('cost.gold', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="cost-favor">Favor</label><input id="cost-favor" type="number" .value=${cost.favor || 0} @input=${(e: Event) => updateState('cost.favor', (e.target as HTMLInputElement).value)}></div>
            </div>
        </fieldset>
    `;
}

function renderDefensiveStatsForm(stats: DefensiveStats) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Armor</legend>
            <div class="form-grid">
                <div class="form-field"><label for="armor-hack">Hack Armor</label><input id="armor-hack" type="number" .value=${stats.hack_armor || 0} @input=${(e: Event) => updateState('defensive_stats.hack_armor', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="armor-pierce">Pierce Armor</label><input id="armor-pierce" type="number" .value=${stats.pierce_armor || 0} @input=${(e: Event) => updateState('defensive_stats.pierce_armor', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="armor-crush">Crush Armor</label><input id="armor-crush" type="number" .value=${stats.crush_armor || 0} @input=${(e: Event) => updateState('defensive_stats.crush_armor', (e.target as HTMLInputElement).value)}></div>
            </div>
        </fieldset>
    `;
}

function renderAttackStatsForm(stats: AttackStats) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Attack</legend>
            <div class="form-grid">
                <div class="form-field"><label for="attack-hack">Hack Attack</label><input id="attack-hack" type="number" .value=${stats.hack_attack || 0} @input=${(e: Event) => updateState('attack_stats.hack_attack', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-pierce">Pierce Attack</label><input id="attack-pierce" type="number" .value=${stats.pierce_attack || 0} @input=${(e: Event) => updateState('attack_stats.pierce_attack', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-crush">Crush Attack</label><input id="attack-crush" type="number" .value=${stats.crush_attack || 0} @input=${(e: Event) => updateState('attack_stats.crush_attack', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-divine">Divine Attack</label><input id="attack-divine" type="number" .value=${stats.divine_attack || 0} @input=${(e: Event) => updateState('attack_stats.divine_attack', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-speed">Attack Speed</label><input id="attack-speed" type="number" .value=${stats.attack_speed || 0} @input=${(e: Event) => updateState('attack_stats.attack_speed', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-type">Attack Type</label><input id="attack-type" type="text" .value=${stats.type || ''} @input=${(e: Event) => updateState('attack_stats.type', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-range">Attack Range</label><input id="attack-range" type="number" .value=${stats.range || 0} @input=${(e: Event) => updateState('attack_stats.range', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-number-projectiles">Number of Projectiles</label><input id="attack-number-projectiles" type="number" .value=${stats.number_projectiles || 0} @input=${(e: Event) => updateState('attack_stats.number_projectiles', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-human">vs Human</label><input id="attack-vs-human" type="number" .value=${stats.vs_human || 0} @input=${(e: Event) => updateState('attack_stats.vs_human', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-hero">vs Hero</label><input id="attack-vs-hero" type="number" .value=${stats.vs_hero || 0} @input=${(e: Event) => updateState('attack_stats.vs_hero', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-myth">vs Myth</label><input id="attack-vs-myth" type="number" .value=${stats.vs_myth || 0} @input=${(e: Event) => updateState('attack_stats.vs_myth', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-ranged">vs Ranged</label><input id="attack-vs-ranged" type="number" .value=${stats.vs_ranged || 0} @input=${(e: Event) => updateState('attack_stats.vs_ranged', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-infantry">vs Infantry</label><input id="attack-vs-infantry" type="number" .value=${stats.vs_infantry || 0} @input=${(e: Event) => updateState('attack_stats.vs_infantry', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-siege">vs Siege</label><input id="attack-vs-siege" type="number" .value=${stats.vs_siege || 0} @input=${(e: Event) => updateState('attack_stats.vs_siege', (e.target as HTMLInputElement).value)}></div>
                <div class="form-field"><label for="attack-vs-building">vs Building</label><input id="attack-vs-building" type="number" .value=${stats.vs_building || 0} @input=${(e: Event) => updateState('attack_stats.vs_building', (e.target as HTMLInputElement).value)}></div>
                </div>
        </fieldset>
    `;
}
