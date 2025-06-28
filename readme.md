!["Age of Mythology: Retold" game release trailer frame screenshot, stylized text with gold trim and starry night fill, billowing clouds in the background](aom-h1_style-title-gold_embossed-star-night_fill.jpg)

# **Civ Customizer: The Turbo-Charged Roadmap**

**Guiding Principles:**

1. **Velocity is Life:** We prioritize speed and getting functional features into users' hands. "Beta by tomorrow" is our mantra.
2. **The Cheapskate Manifesto:** We leverage generous free tiers for all infrastructure. We will use free hosting, a free database, and free authentication. We will only scale when the project's success (and potential ad revenue) demands it.
3. **Build to Evolve:** We will make smart, pragmatic choices now that don't paint us into a corner later. We'll accept manageable tech debt but build on a solid foundation.

## **Phase 1: The "Beta by Tomorrow" MVP (Target: This Weekend)**

**Goal:** Transform the current viewer into a functional, single-player editor. Users must be able to create, edit, and save their own custom Greek civilization locally.

### **1.1: Foundational Data Restructure**

- **Action:** Immediately dismantle the monolithic civData.json.
- **Implementation:**
  - Create a new directory: /src/data/civs/.
  - Inside, create greek.json. We will move the entire contents of the old civData.json into this new file.
  - Create placeholder files for norse.json, egyptian.json, etc., with a basic { "name": "Norse", "majorGods": {} ... } structure.
  - **In main.ts**: Modify the initial data load. Instead of a direct import, we will use fetch('./src/data/civs/greek.json') to load the default civ. This sets the stage for a civ selection screen later.

### **1.2: The Core Feature: The Universal Editor**

- **Action:** Implement the dynamic modal form system for editing any entity.
- **Implementation:**
  - **Create src/components/form.ts:** This new module will house all form-generation logic.
  - **The renderForm function:** This function will be the heart of the module. It will take an entity object and a schema object as arguments.
  - **Schema-Driven Forms:** We will create a unitFormSchema.ts (and others later). This will be a simple array of objects that defines the form fields, e.g., { key: 'hitpoints', label: 'Hitpoints', type: 'number' }.
  - **State Management:** The form will bind its inputs to a temporary editingEntity state object.
  - **Save Logic:** The "Save" button will trigger a saveEntity function. For Phase 1, this function will simply update the main civData object in memory and call renderAll().

### **1.3: Rock-Solid Validation & Local Persistence**

- **Action:** Ensure data integrity with zod and save custom work using localStorage.
- **Implementation:**
  - **Install zod:** npm install zod
  - **Create src/types/schemas.ts:** This file will contain zod schemas that mirror the interfaces in civ.ts. We'll start with unitSchema.
  - **Validation on Save:** The saveEntity function will first run the form data through unitSchema.parse(formData). If it fails, we'll display an error in the modal (no alert()s\!). If it succeeds, we proceed.
  - **localStorage Persistence:** After successful validation, the saveEntity function will perform localStorage.setItem('customGreekCiv', JSON.stringify(civData)). On app load, we'll check if this item exists and load it instead of the default greek.json.

**Phase 1 Outcome:** A user can visit the site, see the Greek civ, click "Edit" on a Hoplite, change its hitpoints in a modal, save it, and have that change persist when they refresh the page. The core creative loop is complete.

## **Phase 2: The Community Foundation (Target: Next Week)**

**Goal:** Evolve from a single-player toy to a multi-user platform. Introduce user accounts, cloud storage for civs, and sharing capabilities.

### **2.1: Backend Integration with Firebase**

- **Action:** Integrate Firebase for Authentication, Firestore Database, and Hosting. This is our "free-tier" backend.
- **Implementation:**
  - Create a Firebase project.
  - Enable **Firebase Authentication** (Email/Password and Google sign-in).
  - Enable **Firestore** as our database.
  - Set up **Firebase Hosting**.
  - Create a src/firebase.ts module to initialize Firebase and export the auth and db instances.
  - Add a simple "Login" button to the header that triggers the Firebase auth flow. The UI will now display the user's email when logged in.

### **2.2: Cloud Persistence for Custom Civs**

- **Action:** Move custom civ storage from localStorage to Firestore.
- **Implementation:**
  - **Database Schema:** In Firestore, we'll create a top-level collection named customCivs. Each document in this collection will be a user-created civilization, with a field for ownerId (the user's Firebase UID).
  - **Migration:** When a user logs in for the first time, we'll check if they have a customGreekCiv in localStorage. If so, we'll write it to their new Firestore collection and clear the localStorage item.
  - **CRUD Operations:** The saveEntity function will now write the entire civData object to the user's civ document in Firestore instead of localStorage.

### **2.3: Sharing and Discovery**

- **Action:** Allow users to share their creations with a unique URL.
- **Implementation:**
  - When a civ is saved in Firestore, it gets a unique Document ID.
  - Add a "Share" button to the UI. Clicking it copies a URL like \[your-app-url\]/civ/{civDocumentId} to the clipboard.
  - We will configure the app to handle routing. When a user visits a /civ/{id} URL, the app will fetch that specific civ document from Firestore and display it in a read-only mode (if the viewer is not the owner).

**Phase 2 Outcome:** Users can create accounts, save multiple custom civs to the cloud, and share them with friends. The foundation for a community is laid.

## **Phase 3: The Living Ecosystem (Target: Two Weeks Out)**

**Goal:** Implement the community-driven balance scoring system, leaderboards, and user interaction features.

### **3.1: The Atomic Balance Scoring System**

- **Action:** Allow users to rate every single stat on every custom unit, with scores that aggregate upwards.
- **Implementation:**
  - **UI:** In the edit modal for a unit, next to each stat (e.g., hitpoints), there will be a small input field or slider for a user to enter their "Balance Score" (0-10) for that specific stat.
  - **Database:** In Firestore, we will create a sub-collection for each custom civ document: /customCivs/{civId}/balanceVotes. Each document in _this_ sub-collection will represent a single user's vote, containing their userId, the entityId (e.g., "hoplite"), the stat ("hitpoints"), and their score. This prevents a user from voting multiple times on the same stat.
  - **Aggregation (The Smart Way):** We will use **Firebase Cloud Functions** (generous free tier\!). We'll create a function that triggers whenever a new vote is added to a balanceVotes sub-collection. This function will:
    1. Read all votes for that specific stat (e.g., all "hoplite" "hitpoints" votes).
    2. Calculate the new average score.
    3. Update a balanceScores map on the main /customCivs/{civId} document (e.g., { "hoplite": { "hitpoints_score": 7.8 } }).  
       This is efficient and cheap, as it only runs when needed.

### **3.2: Leaderboards & Homepage Gallery**

- **Action:** Showcase the best and most interesting community creations.
- **Implementation:**
  - Create a new "Leaderboards" page.
  - This page will perform Firestore queries, e.g., "get all customCivs, order by the total_balance_score field, limit to 20".
  - The homepage will be updated to show a gallery of "Recently Updated" or "Top Voted" civs, pulling directly from our database.

### **3.3: Comments and Feedback**

- **Action:** Allow users to leave comments on shared civilization pages.
- **Implementation:**
  - On each shared civ page (/civ/{civId}), we'll add a comments section.
  - In Firestore, we'll create another sub-collection: /customCivs/{civId}/comments.
  - Authenticated users can add new documents to this sub-collection. Each document will contain their username, the commentText, and a timestamp.
  - We'll use a real-time onSnapshot listener to display comments, so they appear instantly without a page refresh.

**Phase 3 Outcome:** The application is now a vibrant, interactive hub. Users are actively rating content, discussing balance, and competing for the top spot on the leaderboards.

## **Phase 4: Monetization & The Infinite Empire (Long-Term)**

**Goal:** Ensure the project is self-sustaining and expand its scope to become the ultimate RTS prototyping tool.

### **4.1: The Two-Cent Empire**

- **Action:** Add non-intrusive ads to cover our (free) server costs and maybe buy a coffee.
- **Implementation:**
  - Sign up for a service like Google AdSense.
  - Strategically place small ad blocks in the margins or footer of the site, ensuring they don't disrupt the user experience.

### **4.2: Expansion to New Realms**

- **Action:** Adapt the tool to support other RTS games (e.g., Age of Empires II, StarCraft).
- **Implementation:**
  - Our schema-driven design makes this feasible. We would create new schemas (aoe2UnitSchema, etc.).
  - In Firestore, we would structure data by game: /aom_civs/..., /aoe2_civs/....
  - The UI would have a game selector that loads the appropriate data, schemas, and assets.

### **4.3: The "Civ Engine" \- Ultimate Power**

- **Action:** Fulfill the original vision of a true "game logic engine" or Domain-Specific Language (DSL).
- **Implementation:**
  - Refactor the technology/effect system from simple data fields into a guided, sentence-like builder: \[Increase\] \[Hack Armor\] \[by\] \[10%\] \[for\] \[All Infantry\].
  - This would require a significant overhaul of the form editor, turning simple inputs into interconnected dropdowns and logic builders. This is the ultimate "power user" feature.
