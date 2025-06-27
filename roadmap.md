Civ Customizer: Development Roadmap
Overview

This document outlines the planned development path for the Civ Customizer project. The vision is to evolve this tool from its current state as a powerful viewer into a full-fledged, interactive editor and a vibrant community platform for creating, sharing, and discovering custom civilizations for Age of Mythology.

The roadmap is divided into four distinct phases, moving from core functionality to advanced features and community infrastructure.
Phase 1: Core Functionality - The Universal Editor

Overview: This is our immediate next step and the most critical phase. It's about building the engine that turns the application from a read-only tool into a truly creative one. We will implement the system that makes the "Add," "Edit," and "Delete" buttons on all entities functional.

Implementation Ideas:

    Reusable Modal System:

        We will build a single, generic modal "shell" in index.html. This shell will be hidden by default and will contain a title, a form area, and Save/Delete/Close buttons.

        The core principle is reusability. We build the container once and use JavaScript to dynamically inject the correct content for whatever we're editing.

    Dynamic Form Generation (main.ts):

        Strategy A (The Direct Approach): Create a function createEditorForm(entity). Inside, a switch (entity.type) block will determine what to build. For case 'majorGod':, we will manually write the lit-html template with <input> fields for name, tagline, etc. This is straightforward and perfect for getting started quickly.

        Strategy B (The Scalable Approach): Define a "schema" for each entity type. This schema is an object that describes the form fields needed (e.g., majorGodSchema = { name: 'text', tagline: 'textarea', godPowers: 'multiselect' }). The createEditorForm function would then read this schema and build the form programmatically. This is more work upfront but makes adding new editable entities in the future incredibly easy.

    Data Handling & State Management:

        We'll introduce a new state variable, entityToEdit, which will hold the object being created or edited.

        Clicking "Save" will trigger a saveEntity(formData) function. This function will read the values from the form, update our main in-memory data object, and call renderAll() to instantly refresh the UI with the changes.

        The "Delete" button will call a deleteEntity(entityKey) function to remove the item and re-render.

Phase 2: Advanced UI/UX - A Fluid & Tactile Experience

Overview: With the core editing functionality in place, this phase is about making the editor feel powerful, intuitive, and delightful to use. It's about adding the advanced interactions that separate a good tool from a great one.

Implementation Ideas:

    Truly Responsive Grids:

        We can enhance the grids to be responsive based on container size, not just screen size. The CSS pattern grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); would automatically reflow the tiles to fill the space, which is more robust than fixed column counts in media queries.

    Linked Carousels:

        This is a fascinating idea. When a Major God is selected, we could not only filter the Minor Gods below it but also dynamically populate a second, smaller carousel next to the Minor God list that shows the Ages (Archaic, Classical, etc.). Clicking an Age in its carousel would then filter the Minor Gods to only those available in that age. This creates a powerful, layered filtering experience.

    Drag-and-Drop Everything:

        Strategy A (Native HTML API): Implement drag-and-drop using the browser's built-in Drag and Drop API. It's powerful and requires no external libraries, but can be notoriously finicky and requires careful state management.

        Strategy B (Using a Library): Integrate a small, modern, and highly-regarded library like SortableJS. This would dramatically simplify the implementation of reordering gods, technologies, and units, and provide a much smoother user experience out of the box.

Phase 3: Architectural Refactor - The "Civ Engine"

Overview: This is the most advanced and, honestly, the most exciting part of the vision. This phase is about rethinking our data structure to turn the app from a "data editor" into a true "game logic engine." We will lean into your idea of constructing a language from nouns (units, buildings), verbs (increase, create), and adjectives (hack armor, cooldown).

Implementation Ideas:

    From Data to a Domain-Specific Language (DSL):

        Currently, a technology might have an effect like "verb": "add", "adjective": "hack_armor", "value": 10.

        We can make this more explicit and powerful. The UI would no longer be a simple text field. Instead, you would click "+ Add Effect" and be presented with a dropdown of verbs: "Increase Stat," "Decrease Stat," "Enable Unit," "Change Cost."

        If you select "Increase Stat," new dropdowns appear for the adjective (the stat name) and the value. This creates a guided, sentence-like way of building game mechanics: [Increase] [Hack Armor] [by] [10%] [for] [All Infantry].

    Data Model Evolution (civ.ts):

        The structure of our civData.json would need to change to support this. Instead of a unit having a simple cost: { food: 50 }, it would have an array of "cost components": costs: [{ resource: 'food', amount: 50 }]. This makes every aspect of an entity a composable piece that our new "language" can target and modify.

Phase 4: Content & Community - The Living Application

Overview: This is what turns our powerful tool into a living, breathing application. It's about populating it with real-world data and building the infrastructure for users to share, discover, and vote on their creations.

Implementation Ideas:

    Asset Sourcing:

        We can write a simple automation script (e.g., in Python with Beautiful Soup or Node.js with Cheerio) to scrape the Age of Mythology Wiki for unit images, stats, and descriptions to rapidly build out our base civData.json file.

        For deeper integration, tools like the CryBarEditor could be explored for extracting assets directly from the game files.

    Backend & Database:

        Strategy A (The Fast & Serverless Route): Use a Backend-as-a-Service like Firebase. We can use Firestore to store user-created civs, Firebase Authentication for user login, and Firebase Hosting to deploy the website. This is an incredibly fast way to get a full-fledged application online.

        Strategy B (The Full Control Route): Build a custom backend API with Node.js/Express and a PostgreSQL database. This offers ultimate flexibility but requires more development and server management.

    Homepage & Leaderboards:

        Once a database is in place, creating a homepage is straightforward. It would query the database for the "most recent" or "top-voted" civilizations and display them as a gallery.

        Each shared civ would have a unique URL (/civ/SOME_UNIQUE_ID). Voting would be a simple button that, when clicked, increments a voteCount field on that civ's document in the database.

This roadmap is ambitious and exciting. We have a clear path forward, and the next logical step is to begin executing Phase 1.