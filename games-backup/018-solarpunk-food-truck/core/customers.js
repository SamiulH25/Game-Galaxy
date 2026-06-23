/** Customer profiles, order generation, service */

const CUSTOMER_TYPES = [
  { id: 'student', name: 'Student', patience: 40, traits: ['trendy'], tipMult: 0.8, emoji: '🎒' },
  { id: 'office-worker', name: 'Office Worker', patience: 25, traits: ['impatient'], tipMult: 1.0, emoji: '💼' },
  { id: 'eco-enthusiast', name: 'Eco Enthusiast', patience: 60, traits: ['eco-conscious'], tipMult: 1.2, emoji: '🌱' },
  { id: 'tourist', name: 'Tourist', patience: 50, traits: ['curious'], tipMult: 1.1, emoji: '🧳' },
  { id: 'gardener', name: 'Botanical Visitor', patience: 70, traits: ['eco-conscious', 'patient'], tipMult: 1.3, emoji: '🌻' },
  { id: 'critic', name: 'Food Critic', patience: 35, traits: [], tipMult: 0.9, emoji: '📝' },
];

const ORDER_TEMPLATES = [
  { recipe: 'veg-taco', demandTags: ['comfort'] },
  { recipe: 'salad-bowl', demandTags: ['eco', 'drink'] },
  { recipe: 'bean-burrito', demandTags: ['comfort', 'hearty'] },
  { recipe: 'avocado-toast', demandTags: ['eco', 'trendy'] },
  { recipe: 'power-bowl', demandTags: ['eco', 'comfort'] },
  { recipe: 'garden-wraps', demandTags: ['eco'] },
  { recipe: 'combo-plate', demandTags: ['comfort', 'hearty'] },
];

export function createCustomers(store) {
  let orderId = 0;

  return {
    spawnCustomer() {
      const location = store.get('location');
      const bloom = store.get('bloomRep');
      const day = store.get('day');
      const served = store.get('servedToday');
      const maxCustomers = 5 + Math.floor(day * 0.5) + store.get('staff').cashier * 2;

      if (served >= maxCustomers) return null;

      // Filter customer types by location
      let pool = [...CUSTOMER_TYPES];
      if (location === 'botanical') {
        pool = pool.filter(c => c.traits.includes('eco-conscious'));
      } else if (location === 'university') {
        pool = pool.filter(c => c.traits.includes('trendy') || c.id === 'student');
      }

      const type = pool[Math.floor(Math.random() * pool.length)];

      // Generate order
      const unlocked = store.get('recipes').unlocked;
      const availableOrders = ORDER_TEMPLATES.filter(o => unlocked.includes(o.recipe));
      if (availableOrders.length === 0) return null;

      const order = availableOrders[Math.floor(Math.random() * availableOrders.length)];

      // Calculate price based on bloom rep and recipe
      const allRecipes = [
        { id: 'veg-taco', sellPrice: 12 },
        { id: 'salad-bowl', sellPrice: 14 },
        { id: 'bean-burrito', sellPrice: 16 },
        { id: 'avocado-toast', sellPrice: 13 },
        { id: 'power-bowl', sellPrice: 18 },
        { id: 'garden-wraps', sellPrice: 11 },
        { id: 'combo-plate', sellPrice: 22 },
      ];
      const recipeInfo = allRecipes.find(r => r.id === order.recipe);
      const basePrice = recipeInfo ? recipeInfo.sellPrice : 10;
      const bloomBonus = bloom > 5 ? 1.2 : 1.0;
      const price = Math.ceil(basePrice * bloomBonus * type.tipMult);

      const customer = {
        id: ++orderId,
        typeId: type.id,
        name: type.name,
        emoji: type.emoji,
        patience: type.patience + Math.floor(Math.random() * 10),
        maxPatience: type.patience + Math.floor(Math.random() * 10),
        traits: type.traits,
        order: order.recipe,
        orderName: order.recipe.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        price,
        tipMult: type.tipMult,
        served: false,
        started: Date.now(),
      };

      return customer;
    },

    bringCustomer() {
      const customers = store.get('customers');
      if (customers.length >= 6) return;
      const customer = this.spawnCustomer();
      if (customer) {
        store.set({ customers: [...customers, customer] });
      }
    },

    serveCustomer(customerId) {
      const customers = store.get('customers');
      const customer = customers.find(c => c.id === customerId);
      if (!customer || customer.served) return false;

      const cash = store.get('cash');
      const bloom = store.get('bloomRep');

      // Check if order contains eco-friendly ingredients
      const inv = store.get('inventory');
      // Simplification: if customer is eco-conscious, check freshness
      const avgFreshness = inv.length > 0
        ? inv.reduce((s, i) => s + i.freshness, 0) / inv.length
        : 100;

      let price = customer.price;
      let bloomChange = 0;

      if (customer.traits.includes('eco-conscious')) {
        if (avgFreshness < 50) {
          price = Math.floor(price * 0.5);
          bloomChange = -1;
        } else if (avgFreshness > 80) {
          bloomChange = 0.5;
        }
      }

      store.set({
        customers: customers.map(c => c.id === customerId ? { ...c, served: true } : c),
        cash: cash + price,
        lifetimeEarnings: store.get('lifetimeEarnings') + price,
        servedToday: store.get('servedToday') + 1,
        bloomRep: Math.min(10, Math.max(0, bloom + bloomChange)),
      });

      // Daily ledger
      const ledger = store.get('dailyLedger');
      ledger.push({ type: 'revenue', amount: price, customer: customer.typeId, order: customer.order });
      store.set({ dailyLedger: ledger });

      // Remove customer after a delay (handled by UI)
      return true;
    },

    tickPatience() {
      const customers = store.get('customers');
      if (customers.length === 0) return;

      const updated = customers.map(c => {
        if (c.served) return c;
        return { ...c, patience: c.patience - 1 };
      });

      const missed = updated.filter(c => !c.served && c.patience <= 0);
      if (missed.length > 0) {
        const bloom = store.get('bloomRep');
        store.set({
          bloomRep: Math.max(0, bloom - missed.length * 0.5),
          missedToday: store.get('missedToday') + missed.length,
          customers: updated.filter(c => c.patience > 0 || c.served),
        });
      } else {
        store.set({ customers: updated });
      }
    },
  };
}
