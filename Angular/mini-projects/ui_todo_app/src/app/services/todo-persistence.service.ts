import { Injectable } from '@angular/core';
import { AppState } from '../models';
import {
  SCHEMA_VERSION,
  clearStorage,
  readStateFromStorage,
  writeStateToStorage,
} from '../utils/storage';

// This service wraps localStorage so the store does not talk to the browser API directly.
// That makes testing easier and keeps browser-specific code in one place.
@Injectable({ providedIn: 'root' })
export class TodoPersistenceService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  load(): AppState | null {
    if (!this.isBrowser()) return null;
    return readStateFromStorage();
  }

  save(state: AppState): void {
    if (!this.isBrowser()) return;
    writeStateToStorage({
      ...state,
      meta: { schemaVersion: SCHEMA_VERSION },
    });
  }

  clear(): void {
    if (!this.isBrowser()) return;
    clearStorage();
  }
}
