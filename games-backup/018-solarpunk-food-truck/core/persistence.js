/** Save/load system — localStorage + gameBridge + IndexedDB for complex data */

const SAVE_KEY = 'solarpunk-truck-v1';
const DB_NAME = 'SolarpunkTruckDB';
const STORE_NAME = 'saves';

export function createPersistence(store) {
  let autoSaveTimer = null;

  function serialize() {
    return JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      day: store.get('day'),
      phase: store.get('phase'),
      truck: store.get('truck'),
      staff: store.get('staff'),
      inventory: store.get('inventory'),
      hydroponics: store.get('hydroponics'),
      recipes: store.get('recipes'),
      researchPoints: store.get('researchPoints'),
      cash: store.get('cash'),
      debt: store.get('debt'),
      lifetimeEarnings: store.get('lifetimeEarnings'),
      cashRep: store.get('cashRep'),
      bloomRep: store.get('bloomRep'),
      locationsUnlocked: store.get('locationsUnlocked'),
      weather: store.get('weather'),
      location: store.get('location'),
      upgrades: store.get('upgrades'),
      upgradePoints: store.get('upgradePoints'),
      playTime: store.get('playTime'),
    });
  }

  function deserialize(json) {
    const data = JSON.parse(json);
    store.set({
      day: data.day || 1,
      phase: data.phase || 'morning',
      truck: data.truck || store.get('truck'),
      staff: data.staff || store.get('staff'),
      inventory: data.inventory || store.get('inventory'),
      hydroponics: data.hydroponics || store.get('hydroponics'),
      recipes: data.recipes || store.get('recipes'),
      researchPoints: data.researchPoints || 0,
      cash: data.cash || 200,
      debt: data.debt || 0,
      lifetimeEarnings: data.lifetimeEarnings || 0,
      cashRep: data.cashRep || 1,
      bloomRep: data.bloomRep || 1,
      locationsUnlocked: data.locationsUnlocked || ['downtown'],
      weather: data.weather || 'clear',
      location: data.location || 'downtown',
      upgrades: data.upgrades || {},
      upgradePoints: data.upgradePoints || 0,
      playTime: data.playTime || 0,
    });
  }

  async function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'slot' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    saveToLocalStorage() {
      try {
        localStorage.setItem(SAVE_KEY, serialize());
      } catch (e) {
        console.warn('localStorage save failed:', e);
      }
    },

    loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) { deserialize(raw); return true; }
      } catch (e) { console.warn('localStorage load failed:', e); }
      return false;
    },

    async saveToIndexedDB(slot) {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ slot, data: serialize(), savedAt: Date.now() });
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch (e) { console.warn('IndexedDB save failed:', e); }
    },

    async loadFromIndexedDB(slot) {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(slot);
        return new Promise((resolve) => {
          req.onsuccess = () => {
            db.close();
            if (req.result) { deserialize(req.result.data); resolve(true); }
            else resolve(false);
          };
          req.onerror = () => { db.close(); resolve(false); };
        });
      } catch (e) { return false; }
    },

    async saveToBridge() {
      if (!window.gameBridge) return this.saveToLocalStorage();
      try {
        const payload = JSON.parse(serialize());
        // For bridge, strip large inventory to essentials
        payload.inventory = store.get('inventory').map(i => ({
          id: i.id, qty: i.qty, freshness: i.freshness, isLocal: i.isLocal,
        }));
        await window.gameBridge.save(payload);
      } catch (e) { this.saveToLocalStorage(); }
    },

    async loadFromBridge() {
      if (!window.gameBridge) return this.loadFromLocalStorage();
      try {
        const data = await window.gameBridge.load();
        if (data) {
          deserialize(JSON.stringify(data));
          return true;
        }
      } catch (e) {}
      return this.loadFromLocalStorage();
    },

    startAutoSave() {
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      autoSaveTimer = setInterval(() => {
        this.saveToLocalStorage();
      }, 30000); // Every 30 seconds

      // Also save on beforeunload
      window.addEventListener('beforeunload', () => {
        this.saveToLocalStorage();
        this.saveToIndexedDB('autosave');
      });
    },

    stopAutoSave() {
      if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
    },
  };
}

// Bridge data functions set up by the game boot
export function setupBridgeExports(store) {
  window.__gameSaveData = () => {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    } catch (_) { return {}; }
  };

  window.__gameLoadData = (data) => {
    if (!data) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
  };
}
