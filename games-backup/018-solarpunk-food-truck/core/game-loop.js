/** Manages the three daily phases: Morning, Service, Evening */

export function createGameLoop(store) {
  return {
    advancePhase() {
      const phase = store.get('phase');
      if (phase === 'morning') {
        store.set({ phase: 'service' });
        return 'service';
      }
      if (phase === 'service') {
        store.set({ phase: 'evening' });
        return 'evening';
      }
      if (phase === 'evening') {
        this.nextDay();
        store.set({ phase: 'morning' });
        return 'morning';
      }
      return phase;
    },

    nextDay() {
      const day = store.get('day');
      const cash = store.get('cash');
      const debt = store.get('debt');

      // Daily interest on debt
      if (debt > 0) {
        const interest = Math.ceil(debt * 0.05);
        store.set({ debt: debt + interest });
      }

      // Apply spoilage to inventory
      this.applySpoilage();

      // Recharge battery from solar
      const truck = store.get('truck');
      const recharge = truck.solarCapacity * this.weatherMult();
      store.set({
        truck: { ...truck, battery: Math.min(truck.maxBattery, truck.battery + recharge) },
      });

      // Reset daily counters
      store.set({
        day: day + 1,
        servedToday: 0,
        missedToday: 0,
        dailyLedger: [],
        event: null,
      });

      // Roll weather
      this.rollWeather();
    },

    weatherMult() {
      const w = store.get('weather');
      if (w === 'clear') return 1.0;
      if (w === 'cloudy') return 0.5;
      if (w === 'rain') return 0.2;
      if (w === 'heatwave') return 1.3;
      return 1.0;
    },

    applySpoilage() {
      const inv = store.get('inventory');
      const weather = store.get('weather');
      const rate = weather === 'heatwave' ? 30 : weather === 'rain' ? 15 : 10;

      const updated = inv.map(item => ({
        ...item,
        freshness: Math.max(0, item.freshness - rate),
      }));

      // Remove completely spoiled items, turn into compost
      const compost = updated.filter(i => i.freshness <= 0).length;
      store.set({
        inventory: updated.filter(i => i.freshness > 0),
      });

      // Compost boosts bloom rep slightly
      if (compost > 0) {
        const bloom = store.get('bloomRep');
        store.set({ bloomRep: Math.min(10, bloom + compost * 0.1) });
      }
    },

    rollWeather() {
      const r = Math.random();
      const day = store.get('day');
      // Weather gets more volatile at higher days
      const volatility = Math.min(0.4, 0.1 + day * 0.01);
      if (r < 0.35) store.set({ weather: 'clear' });
      else if (r < 0.6) store.set({ weather: 'cloudy' });
      else if (r < 0.75 + volatility) store.set({ weather: 'rain' });
      else store.set({ weather: 'heatwave' });
    },

    getWeatherDemand() {
      const w = store.get('weather');
      if (w === 'rain') return { comfort: 1.3, drink: 0.7 };
      if (w === 'heatwave') return { comfort: 0.7, drink: 1.5 };
      if (w === 'cloudy') return { comfort: 1.1, drink: 0.9 };
      return { comfort: 1.0, drink: 1.0 };
    },
  };
}
