/** World state: locations, events, weather routing */

const LOCATIONS = [
  {
    id: 'downtown',
    name: 'Downtown',
    description: 'High traffic, corporate crowd. Big money but eco-conscious customers are rare.',
    unlockRep: 0,
    volume: 'high',
    ecoReq: 0,
    demandMod: { comfort: 1.2, eco: 0.8 },
  },
  {
    id: 'botanical',
    name: 'Botanical Gardens',
    description: 'Eco-conscious patrons who value sustainability over speed. Lower volume, higher tips.',
    unlockRep: 3,
    volume: 'low',
    ecoReq: 3,
    demandMod: { comfort: 0.7, eco: 1.4 },
  },
  {
    id: 'university',
    name: 'University District',
    description: 'Trendy crowd, complex orders. Students are patient but budget-conscious.',
    unlockRep: 5,
    volume: 'medium',
    ecoReq: 0,
    demandMod: { comfort: 1.0, eco: 1.1 },
  },
];

const EVENTS = [
  { id: 'health-inspection', name: 'Health Inspection', desc: 'Cleanliness drops by 20 if below 70!', effect: 'health', dayMin: 3 },
  { id: 'food-festival', name: 'Food Festival', desc: 'Double customers today!', effect: 'bonus_customers', dayMin: 5 },
  { id: 'supply-shortage', name: 'Supply Shortage', desc: 'Ingredient costs double today.', effect: 'shortage', dayMin: 4 },
  { id: 'community-garden', name: 'Community Garden Collab', desc: 'Free local ingredients!', effect: 'free_produce', dayMin: 6 },
];

export function createWorld(store) {
  return {
    getLocations() { return LOCATIONS; },

    getUnlockedLocations() {
      const bloom = store.get('bloomRep');
      return LOCATIONS.filter(l => bloom >= l.ecoReq);
    },

    travelTo(locationId) {
      const locations = this.getUnlockedLocations();
      if (!locations.find(l => l.id === locationId)) return false;
      store.set({ location: locationId });
      return true;
    },

    rollEvent() {
      const day = store.get('day');
      const current = store.get('event');
      if (current) return current;

      const possible = EVENTS.filter(e => day >= e.dayMin && Math.random() < 0.15);
      if (possible.length > 0) {
        const event = possible[Math.floor(Math.random() * possible.length)];
        store.set({ event: event.id });
        this.applyEvent(event);
        return event;
      }
      return null;
    },

    applyEvent(event) {
      switch (event.effect) {
        case 'health':
          const truck = store.get('truck');
          if (truck.cleanliness < 70) {
            store.set({ truck: { ...truck, cleanliness: Math.max(0, truck.cleanliness - 20) } });
          }
          break;
        case 'bonus_customers':
          // Handled in customer spawning logic
          break;
        case 'shortage':
          // Prices doubled handled in economy
          break;
        case 'free_produce': {
          const inv = store.get('inventory');
          store.set({
            inventory: inv.map(i => i.category === 'produce' ? { ...i, qty: i.qty + 3 } : i),
          });
          break;
        }
      }
    },

    getEventById(id) {
      return EVENTS.find(e => e.id === id);
    },
  };
}
