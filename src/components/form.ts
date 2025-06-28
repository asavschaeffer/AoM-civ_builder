import { html, render } from 'lit-html';
import { Entity, Unit, Building, Cost, DefensiveStats } from '../types/civ.ts';

// =================================================================
// MODULE STATE & PRIVATE VARIABLES
// =================================================================

// This will hold a deep copy of the entity being edited.
// We use a deep copy so that if the user hits "Cancel", the original data is untouched.
let editingEntity: Entity | null = null; 

// A reference to the element that triggered the editor to open.
// We'll need this for the FLIP animation later.
let triggerElement: HTMLElement | null = null;


// =================================================================
// PUBLIC API
// =================================================================

/**
 * Opens the editor for a given entity.
 * This is the main entry point for this module.
 * @param entityToEdit The original entity object from the main data store.
 * @param triggerEl The HTML element that was clicked to open the editor.
 */
export function openEditor(entityToEdit: Entity, triggerEl: HTMLElement) {
  console.log("Opening editor for:", entityToEdit.name);

  // 1. Store the trigger element for animation purposes
  triggerElement = triggerEl;

  // 2. Create a deep copy of the entity for non-destructive editing
  editingEntity = JSON.parse(JSON.stringify(entityToEdit));

  // 3. Determine which form template to use based on the entity's type
  let formTemplate;
  switch (editingEntity.type) {
    case 'unit':
      formTemplate = renderUnitForm(editingEntity as Unit);
      break;
    case 'building':
      // Placeholder for a future commit
      // formTemplate = renderBuildingForm(editingEntity as Building);
      formTemplate = html`<p>Editor for buildings coming soon!</p>`;
      break;
    // ... other entity types would have cases here
    default:
      console.error(`No form definition for entity type: ${editingEntity.type}`);
      formTemplate = html`<p>Error: Form not defined.</p>`;
      return;
  }

  // 4. Find the correct editor container in the DOM
  const section = triggerElement.closest('section');
  if (!section) {
    console.error("Could not find parent section for the editor.", triggerElement);
    return;
  }
  const editorContainer = section.querySelector('.editor-container');
  if (!editorContainer) {
    console.error("Could not find .editor-container in the section.", section);
    return;
  }

  // 5. Render the form into the container and prepare for animation
  render(formTemplate, editorContainer);

  // TODO in next commit:
  // - Call the animation function
  // - Wire up save/cancel buttons
}


// =================================================================
// FORM TEMPLATE RENDERERS
// =================================================================

/**
 * Generates the HTML form for a Unit entity.
 * @param unit The unit data to populate the form with.
 * @returns A lit-html TemplateResult.
 */
function renderUnitForm(unit: Unit) {
  // We'll add event handlers for input changes in a later commit.
  return html`
    <div class="form-editor">
      <h2>Edit Unit: ${unit.name}</h2>
      <form>
        <div class="form-grid">
            <div class="form-field">
                <label for="unit-name">Name</label>
                <input id="unit-name" type="text" .value=${unit.name}>
            </div>
            <div class="form-field">
                <label for="unit-hp">Hitpoints</label>
                <input id="unit-hp" type="number" .value=${unit.hitpoints}>
            </div>
             <div class="form-field">
                <label for="unit-pop">Population Cost</label>
                <input id="unit-pop" type="number" .value=${unit.population_cost}>
            </div>
             <div class="form-field">
                <label for="unit-speed">Speed</label>
                <input id="unit-speed" type="number" step="0.1" .value=${unit.speed}>
            </div>
        </div>

        ${renderCostForm(unit.cost)}
        ${unit.defensive_stats ? renderDefensiveStatsForm(unit.defensive_stats) : ''}
        
        <!-- Action Buttons -->
        <div class="form-actions">
            <button type="button" class="btn-save">Save Changes</button>
            <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Renders a reusable fieldset for resource costs.
 * @param cost The cost object from a unit or building.
 * @returns A lit-html TemplateResult.
 */
function renderCostForm(cost: Cost) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Resource Cost</legend>
            <div class="form-grid">
                <div class="form-field">
                    <label for="cost-food">Food</label>
                    <input id="cost-food" type="number" .value=${cost.food || 0}>
                </div>
                <div class="form-field">
                    <label for="cost-wood">Wood</label>
                    <input id="cost-wood" type="number" .value=${cost.wood || 0}>
                </div>
                <div class="form-field">
                    <label for="cost-gold">Gold</label>
                    <input id="cost-gold" type="number" .value=${cost.gold || 0}>
                </div>
                <div class="form-field">
                    <label for="cost-favor">Favor</label>
                    <input id="cost-favor" type="number" .value=${cost.favor || 0}>
                </div>
            </div>
        </fieldset>
    `;
}

/**
 * Renders a reusable fieldset for defensive stats.
 * @param stats The defensive_stats object from a unit or building.
 * @returns A lit-html TemplateResult.
 */
function renderDefensiveStatsForm(stats: DefensiveStats) {
    return html`
        <fieldset class="form-fieldset">
            <legend>Armor</legend>
            <div class="form-grid">
                <div class="form-field">
                    <label for="armor-hack">Hack Armor</label>
                    <input id="armor-hack" type="number" .value=${stats.hack_armor || 0}>
                </div>
                <div class="form-field">
                    <label for="armor-pierce">Pierce Armor</label>
                    <input id="armor-pierce" type="number" .value=${stats.pierce_armor || 0}>
                </div>
                <div class="form-field">
                    <label for="armor-crush">Crush Armor</label>
                    <input id="armor-crush" type="number" .value=${stats.crush_armor || 0}>
                </div>
            </div>
        </fieldset>
    `;
}
