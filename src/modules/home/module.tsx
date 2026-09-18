import type { ModuleDefinition } from '@wasnaker/web-core';
import { HomePage } from './pages/home-page';

/** Kontrak modul Home untuk host. */
export const homeModule: ModuleDefinition = {
  id: 'home',
  slug: 'home',
  name: 'Home',
  version: '0.1.0',
  routes: [{ path: '', element: <HomePage /> }],
  navigation: { label: 'Home', href: '/', icon: '🏠', position: 10 },
};
