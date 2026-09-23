import { initAnalytics } from './analytics.js';
import { initCartDrawer } from './cart-drawer.js';
import { mountSiteShell } from './ui.js';
function boot(){mountSiteShell({active:'delivery'});initAnalytics();initCartDrawer();} boot();
