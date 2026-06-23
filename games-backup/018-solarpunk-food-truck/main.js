/** Solarpunk Food Truck — main entry point */

import { createStore, defaultState } from './store.js';
import { createGameLoop } from './core/game-loop.js';
import { createEconomy } from './core/economy.js';
import { createCooking } from './core/cooking.js';
import { createCustomers } from './core/customers.js';
import { createWorld } from './core/world.js';
import { createPersistence, setupBridgeExports } from './core/persistence.js';
import { createPanels } from './ui/panels.js';

async function boot() {
  // Create reactive store
  const store = createStore(defaultState());

  // Create systems
  const gameLoop = createGameLoop(store);
  const economy = createEconomy(store);
  const cooking = createCooking(store);
  const customers = createCustomers(store);
  const world = createWorld(store);
  const persistence = createPersistence(store);
  const panels = createPanels(store, gameLoop, economy, cooking, customers, world, persistence);

  // Set up bridge exports
  setupBridgeExports(store);
  panels.init();

  // Try loading saved game
  let loaded = false;
  if (window.gameBridge) {
    try {
      const data = await window.gameBridge.load();
      if (data && data.day) {
        // Reconstruct state from bridge data
        store.set({
          day: data.day || 1,
          phase: data.phase || 'morning',
          truck: data.truck || store.get('truck'),
          staff: data.staff || store.get('staff'),
          inventory: (data.inventory || []).map(i => {
            const base = store.get('inventory').find(ex => ex.id === i.id);
            return { ...(base || { id: i.id, name: i.id, cost: 2, category: 'produce' }), ...i };
          }),
          cash: data.cash || 200,
          debt: data.debt || 0,
          lifetimeEarnings: data.lifetimeEarnings || 0,
          cashRep: data.cashRep || 1,
          bloomRep: data.bloomRep || 1,
          weather: data.weather || 'clear',
          location: data.location || 'downtown',
          upgrades: data.upgrades || {},
        });
        loaded = true;
      }
    } catch (_) {}
  }

  if (!loaded) {
    loaded = persistence.loadFromLocalStorage();
  }

  if (loaded) {
    // If we loaded from save, check if we were mid-service and reset to morning
    const phase = store.get('phase');
    if (phase === 'service') {
      store.set({ phase: 'morning' });
    }
  } else {
    // New game - roll initial weather
    gameLoop.rollWeather();
  }

  // Start auto-save
  persistence.startAutoSave();

  // Render initial view based on phase
  const phase = store.get('phase');
  if (phase === 'morning') panels.renderMorning();
  else if (phase === 'evening') panels.renderEvening();
  else panels.renderMorning();

  // Key bindings
  document.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') panels.renderUpgrades();
    if (e.key === 's' || e.key === 'S') {
      persistence.saveToLocalStorage();
      persistence.saveToBridge().then(() => {
        const status = document.getElementById('status-toast');
        if (status) { status.textContent = '💾 Saved!'; status.classList.add('show'); setTimeout(() => status.classList.remove('show'), 2000); }
      });
    }
  });

  // Sync HUD every 5 seconds
  setInterval(() => panels.renderHUD(), 5000);
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
