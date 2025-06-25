import { html, render } from "lit-html";
import civData from "./data/civData.json";
import { Civ, MajorGod, Unit } from "./types/civ";

const data = civData as Civ;

// Set default active god
let activeMajorGod: string = "thor";

// === Templates ===

const majorGodsTemplate = (gods: Record<string, MajorGod>) => html`
  ${Object.entries(gods).map(([key, god]) => html`
    <article
      class="card major-god ${key === activeMajorGod ? "" : "ghosted"}"
      data-god="${key}"
      style="background-image: url('${god.image}')"
      @click=${() => {
        activeMajorGod = key;
        updateGodsDisplay();
      }}
    >
      <h4>${god.name}</h4>
      <p class="tagline">${god.tagline}</p>
      <img src="${god.godPower}" alt="${god.name} God Power" class="sprite god-power" width="64" height="64" />
    </article>
  `)}
`;

const unitsTemplate = (units: Record<string, Unit>) => html`
  ${Object.values(units).map(unit => html`
    <div class="tile unit">
      <img src="placeholderunit.jpg" alt="${unit.name} Sprite" class="sprite" width="64" height="64" />
      <h5>${unit.name}</h5>
      <p>HP: ${unit.hitpoints}</p>
      ${unit.attack ? html`
        <p>${unit.attack.type} attack: ${unit.attack.damage}</p>
      ` : ""}
    </div>
  `)}
`;

// === Render Functions ===

function updateGodsDisplay() {
  const container = document.querySelector(".major-gods .carousel") as HTMLElement;
  render(majorGodsTemplate(data.majorGods), container);
}

function renderUnits() {
  const container = document.querySelector(".units-techs .grid") as HTMLElement;
  render(unitsTemplate(data.units), container);
}

// === Initial Render ===

updateGodsDisplay();
renderUnits();
