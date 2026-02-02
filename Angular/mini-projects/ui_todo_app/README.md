# Advanced Todo App (Angular 21)

This project is an **educational, production-ready** Todo app designed for beginners. It uses modern Angular 21 features (standalone components, typed reactive forms, signals) and includes deep inline comments to explain **why** each choice is made.

## Setup

```bash
npm install
npm start
```

The app runs on `http://localhost:4200` by default.

## Feature Overview

- Todo CRUD (add/edit/toggle/delete)
- Categories with assignment + filtering
- Search filter (contains match)
- Drag-and-drop reordering (Angular CDK)
- LocalStorage persistence with schema versioning
- Undo/Redo with capped history
- Keyboard shortcuts

## Project Structure (important files)

```
src/app/
  models.ts
  store/
    todo-store-signals.service.ts
    todo-store-rxjs.service.ts
    todo-store.token.ts
  services/
    todo-persistence.service.ts
  components/
    category-panel/
    todo-panel/
    todo-item/
```

## Mental Models

- **Single source of truth**: The store holds all app state.
- **Derived selectors**: The UI reads filtered/derived data without mutating state.
- **Immutability**: Updates create new objects/arrays so undo/redo stays reliable.
- **History stacks**: `past -> present -> future` allows time-travel.

## Undo/Redo Approach

We use three stacks:
- `past`: previous snapshots
- `present`: current snapshot
- `future`: snapshots we can redo

On each action (except pure UI changes like search), we:
1. Push the current `present` into `past`
2. Clear `future`
3. Replace `present` with the new state

History is capped (default 50) to avoid memory growth.

## Drag-and-drop Reorder Mapping

CDK drag-drop reports indexes based on the **visible list** (after filtering). To keep the global order safe:
1. We reorder only the visible ids.
2. We map those reordered ids back onto the full todo list positions.
3. Non-visible todos stay exactly where they were.

This prevents filters from scrambling hidden items.

## Persistence Strategy

- The store saves `present` state to `localStorage` with debounce.
- Data includes a `schemaVersion` so future migrations are possible.
- On load, we validate the shape; invalid or old data falls back to defaults.
- The **Reset App** button clears storage and resets state.

## Keyboard Shortcuts

- `Ctrl/Cmd + Z` → Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` → Redo
- `Ctrl/Cmd + K` → Focus search
- `Escape` → Cancel inline edit
- `Enter` on add form → Submit

## RxJS Store Option

This project includes **two store implementations**:
- **Signals store** (default): `src/app/store/todo-store-signals.service.ts`
- **RxJS BehaviorSubject store**: `src/app/store/todo-store-rxjs.service.ts`

To switch to the RxJS store, update the provider in `src/app/app.config.ts`:

```ts
// { provide: TODO_STORE, useClass: TodoStoreSignalsService }
{ provide: TODO_STORE, useClass: TodoStoreRxjsService }
```

> The UI uses signals in templates, so if you swap to RxJS, you would also update templates to use the `async` pipe. This is an intentional teaching contrast.

## Beginner Notes

- **Reactive forms**: Forms are built in code (`FormGroup`, `FormControl`) so validation is centralized and easy to test.
- **Signals**: Signals are reactive values you read like functions. They keep templates simple and fast.
- **Immutability**: Instead of changing arrays directly, we create new arrays. This makes undo/redo and change detection predictable.

---

Happy learning!
