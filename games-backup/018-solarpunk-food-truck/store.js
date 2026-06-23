/** Reactive state store with Proxy-based subscriptions */
export function createStore(initial) {
  const listeners = new Map();
  let state = { ...initial };

  const store = {
    get state() { return state; },

    subscribe(key, fn) {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
      return () => listeners.get(key).delete(fn);
    },

    notify(key) {
      if (listeners.has(key)) {
        for (const fn of listeners.get(key)) fn(state[key], state);
      }
    },

    set(partial) {
      const prev = { ...state };
      state = { ...state, ...partial };
      for (const key of Object.keys(partial)) {
        if (JSON.stringify(prev[key]) !== JSON.stringify(state[key])) {
          this.notify(key);
        }
      }
    },

    update(key, fn) {
      this.set({ [key]: fn(state[key], state) });
    },

    get(key) { return state[key]; },
  };

  return store;
}

/** Default initial state for a new game */
export function defaultState() {
  return {
    // Meta
    version: 1,
    day: 1,
    phase: 'morning', // morning | service | evening
    playTime: 0,
    gameOver: false,

    // Truck
    truck: {
      battery: 100,
      maxBattery: 100,
      solarCapacity: 20, // watts per phase
      cleanliness: 100,
      chassisLevel: 1,
      maxChassisLevel: 5,
      prepStations: 1,
      maxPrepStations: 4,
      layout: 'basic',
    },

    // Crew
    staff: {
      chef: 0,
      cashier: 0,
      forager: 0,
    },

    // Inventory
    inventory: [
      { id: 'tomato', name: 'Tomato', qty: 10, freshness: 100, cost: 2, isLocal: false, category: 'produce' },
      { id: 'lettuce', name: 'Lettuce', qty: 8, freshness: 100, cost: 1, isLocal: false, category: 'produce' },
      { id: 'bread', name: 'Artisan Bread', qty: 6, freshness: 100, cost: 3, isLocal: true, category: 'grain' },
      { id: 'cheese', name: 'Plant Cheese', qty: 5, freshness: 100, cost: 4, isLocal: false, category: 'dairy' },
      { id: 'beans', name: 'Black Beans', qty: 8, freshness: 100, cost: 2, isLocal: true, category: 'protein' },
      { id: 'rice', name: 'Herb Rice', qty: 6, freshness: 100, cost: 2, isLocal: false, category: 'grain' },
      { id: 'salsa', name: 'Roasted Salsa', qty: 4, freshness: 100, cost: 3, isLocal: true, category: 'condiment' },
      { id: 'avocado', name: 'Avocado', qty: 4, freshness: 100, cost: 5, isLocal: false, category: 'produce' },
    ],
    hydroponics: { active: false, crop: null, progress: 0, water: 50 },

    // Recipes
    recipes: {
      unlocked: ['veg-taco', 'salad-bowl'],
      discovered: [],
    },
    researchPoints: 0,

    // Prep
    prepQueue: [],
    prepStations: [
      { id: 0, busy: false, item: null, progress: 0, total: 100 },
    ],

    // Customers
    customers: [],
    servedToday: 0,
    missedToday: 0,

    // Finances
    cash: 200,
    debt: 0,
    dailyLedger: [],
    lifetimeEarnings: 0,

    // Reputation
    cashRep: 1,
    bloomRep: 1,
    locationsUnlocked: ['downtown'],

    // World
    weather: 'clear',
    location: 'downtown',
    event: null,

    // Upgrades purchased
    upgrades: {},
    upgradePoints: 0,
  };
}
