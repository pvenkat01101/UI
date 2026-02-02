import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { TODO_STORE } from './store/todo-store.token';
import { TodoStoreSignalsService } from './store/todo-store-signals.service';
// import { TodoStoreRxjsService } from './store/todo-store-rxjs.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // Swap this provider to TodoStoreRxjsService to learn the RxJS store version.
    { provide: TODO_STORE, useClass: TodoStoreSignalsService }
  ]
};
