import { html, render } from 'lit-html';
import { Entity, Unit, Cost, DefensiveStats } from '../types/civ';
// Import the global data and render functions from main.ts
import { data, renderAll, showPreview } from '../main';

// =================================================================
// MODULE STATE & PRIVATE VARIABLES
// =================================================================

let editingEntity: Entity | null = null;
// Store the original name to find the entity even after it's been renamed in the form
let originalEntityName: string | null = null;
let triggerElement: HTMLElement | null = null;
let editorContainer: HTMLElement | null = null;
let contentContainer: HTMLElement | null = null;
let backgroundOverlay: HTMLElement | null = null;

// =================================================================
// EVENT HANDLERS & CORE LOGIC
// =================================================================

/**
 * A generic function to update the temporary state of the entity being edited.
 * It can handle nested properties using dot notation (e.g., 'cost.food').
 * @param path The dot-notation path to the property to update.
 * @param value The new value.
 */
function updateState(path: string, value: any) {
    if (!editingEntity) return;

    const keys = path.split('.');
    let obj: any = editingEntity;
    while (keys.length > 1) {
        const key = keys.shift();
        if (key) {
            obj = obj[key];
        }
    }
    
    // Coerce to number if the original value was a number, or if it's a number-like string
    if (typeof obj[keys[0]] === 'number' || !isNaN(Number(value))) {
        obj[keys[0]] = Number(value);
    } else {
        obj[keys[0]] = value;
    }
}

function handleSave() {
  if (!editingEntity || !data || !originalEntityName) return;
  console.log("Saving changes for:", originalEntityName);

  const collectionKey = `${editingEntity.type}s` as keyof typeof data;
  const collection = data[collectionKey] as Record<string, Entity> | undefined;

  if (collection) {
      // Use the original, unmodified name to find the entity key.
      const entityKey = Object.keys(collection).find(key => 
          (collection[key] as Entity).name === originalEntityName
      );

      if (entityKey) {
        collection[entityKey] = editingEntity;
        
        // If the name was changed, we need to update our reference for the next save.
        originalEntityName = editingEntity.name;

        localStorage.setItem('customGreekCiv', JSON.stringify(data));
        console.log('Saved to localStorage!');

        // Re-render the main UI to show the changes
        renderAll();
        // Explicitly update the preview panel with the new data
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

  triggerElement = triggerEl;
  // Store the original name on open, so we can always find it later.
  originalEntityName = entityToEdit.name;
  editingEntity = JSON.parse(JSON.stringify(entityToEdit));

  let formTemplate;
  switch (editingEntity.type) {
    case 'unit':
      formTemplate = renderUnitForm(editingEntity as Unit);
      break;
    case 'building':
    case 'majorGod':
    case 'minorGod':
    case 'technology':
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

function renderUnitForm(unit: Unit) {
  return html`
    <div class="form-editor">
      <button type="button" class="btn-discard" @click=${handleDiscard} title="Discard Changes & Close">
          <i class="fas fa-times"></i>
      </button>

      <h2>Edit Unit: ${unit.name}</h2>
      <form @submit=${(e:Event) => e.preventDefault()}>
        <div class="form-grid">
            <div class="form-field">
                <label for="unit-name">Name</label>
                <input id="unit-name" type="text" .value=${unit.name} @input=${(e: Event) => updateState('name', (e.target as HTMLInputElement).value)}>
            </div>
            <div class="form-field">
                <label for="unit-hp">Hitpoints</label>
                <input id="unit-hp" type="number" .value=${unit.hitpoints} @input=${(e: Event) => updateState('hitpoints', (e.target as HTMLInputElement).value)}>
            </div>
             <div class="form-field">
                <label for="unit-pop">Population Cost</label>
                <input id="unit-pop" type="number" .value=${unit.population_cost} @input=${(e: Event) => updateState('population_cost', (e.target as HTMLInputElement).value)}>
            </div>
             <div class="form-field">
                <label for="unit-speed">Speed</label>
                <input id="unit-speed" type="number" step="0.1" .value=${unit.speed} @input=${(e: Event) => updateState('speed', (e.target as HTMLInputElement).value)}>
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
