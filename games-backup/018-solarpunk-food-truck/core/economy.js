/** Economy, supply chain, purchasing */

const SUPPLIERS = {
  corporate: {
    name: 'MegaCorp Supply',
    markup: 0.6,
    carbon: 'high',
    description: 'Cheap but high carbon footprint',
  },
  local: {
    name: 'Co-op Harvest',
    markup: 1.0,
    carbon: 'low',
    description: 'Expensive, boosts Bloom rep',
  },
};

export function createEconomy(store) {
  return {
    getSupplierList() { return SUPPLIERS; },

    buyIngredient(itemId, qty, source) {
      const inv = store.get('inventory');
      const cash = store.get('cash');
      const bloom = store.get('bloomRep');
      const supplier = SUPPLIERS[source];
      if (!supplier) return false;

      const existing = inv.find(i => i.id === itemId);
      const basePrice = existing ? existing.cost : 2;
      const unitPrice = Math.ceil(basePrice * supplier.markup);
      const total = unitPrice * qty;

      if (cash < total) return false;

      store.set({ cash: cash - total });

      // Local purchases boost bloom
      if (source === 'local') {
        store.set({ bloomRep: Math.min(10, bloom + 0.2 * qty) });
      }

      // Update inventory
      if (existing) {
        const updated = inv.map(i => {
          if (i.id === itemId) {
            const totalFresh = i.freshness * i.qty + 100 * qty;
            return { ...i, qty: i.qty + qty, freshness: Math.round(totalFresh / (i.qty + qty)) };
          }
          return i;
        });
        store.set({ inventory: updated });
      } else {
        store.set({
          inventory: [...inv, { id: itemId, name: itemId, qty, freshness: 100, cost: basePrice, isLocal: source === 'local', category: 'produce' }],
        });
      }

      // Daily ledger entry
      const ledger = store.get('dailyLedger');
      ledger.push({ type: 'purchase', item: itemId, qty, cost: total, source });
      store.set({ dailyLedger: ledger });

      return true;
    },

    getIngredientPrice(itemId, source) {
      const inv = store.get('inventory');
      const existing = inv.find(i => i.id === itemId);
      const basePrice = existing ? existing.cost : 2;
      const supplier = SUPPLIERS[source];
      return Math.ceil(basePrice * supplier.markup);
    },

    earnRevenue(amount) {
      const cash = store.get('cash');
      const lifetime = store.get('lifetimeEarnings');
      const ledger = store.get('dailyLedger');
      store.set({
        cash: cash + amount,
        lifetimeEarnings: lifetime + amount,
        servedToday: store.get('servedToday') + 1,
      });
      ledger.push({ type: 'revenue', amount });
      store.set({ dailyLedger: ledger });
    },

    endDayFinances() {
      const ledger = store.get('dailyLedger');
      const totalRev = ledger.filter(l => l.type === 'revenue').reduce((s, l) => s + l.amount, 0);
      const totalCost = ledger.filter(l => l.type === 'purchase').reduce((s, l) => s + l.cost, 0);
      const profit = totalRev - totalCost;

      // Update reputation based on performance
      const cashRep = store.get('cashRep');
      const bloomRep = store.get('bloomRep');
      const localPurchases = ledger.filter(l => l.type === 'purchase' && l.source === 'local').length;

      if (profit > 0) {
        store.set({ cashRep: Math.min(10, cashRep + 0.5) });
      }
      if (localPurchases > 0) {
        store.set({ bloomRep: Math.min(10, bloomRep + localPurchases * 0.3) });
      }

      return { totalRev, totalCost, profit };
    },
  };
}
