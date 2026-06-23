/** Recipe system, prep stations, cooking */

const ALL_RECIPES = [
  { id: 'veg-taco', name: 'Veggie Taco', ingredients: ['tomato', 'lettuce', 'beans', 'salsa'], prepTime: 80, sellPrice: 12, tags: ['comfort'], researchCost: 0 },
  { id: 'salad-bowl', name: 'Harvest Salad Bowl', ingredients: ['lettuce', 'tomato', 'avocado', 'rice'], prepTime: 60, sellPrice: 14, tags: ['eco', 'drink'], researchCost: 0 },
  { id: 'bean-burrito', name: 'Sunrise Burrito', ingredients: ['beans', 'rice', 'salsa', 'cheese'], prepTime: 100, sellPrice: 16, tags: ['comfort'], researchCost: 3 },
  { id: 'avocado-toast', name: 'Avocado Solar Toast', ingredients: ['bread', 'avocado', 'salsa'], prepTime: 50, sellPrice: 13, tags: ['eco', 'trendy'], researchCost: 2 },
  { id: 'power-bowl', name: 'Power Protein Bowl', ingredients: ['beans', 'rice', 'avocado', 'cheese'], prepTime: 90, sellPrice: 18, tags: ['eco', 'comfort'], researchCost: 4 },
  { id: 'garden-wraps', name: 'Garden Wraps', ingredients: ['lettuce', 'tomato', 'rice', 'beans'], prepTime: 70, sellPrice: 11, tags: ['eco'], researchCost: 1 },
  { id: 'combo-plate', name: 'Combo Plate', ingredients: ['veg-taco', 'salad-bowl', 'beans'], prepTime: 140, sellPrice: 22, tags: ['comfort', 'hearty'], researchCost: 5 },
];

export function createCooking(store) {
  return {
    getAllRecipes() { return ALL_RECIPES; },

    getUnlockedRecipes() {
      const ids = store.get('recipes').unlocked;
      return ALL_RECIPES.filter(r => ids.includes(r.id));
    },

    canCook(recipeId) {
      const recipe = ALL_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return false;
      const inv = store.get('inventory');
      // Check if we have ingredients (simplified: check by ingredient IDs)
      for (const ingId of recipe.ingredients) {
        // If ingredient is a base item, check inventory
        const baseItem = inv.find(i => i.id === ingId);
        if (baseItem && baseItem.qty < 1) return false;
        // If ingredient is another recipe (already cooked), check if it was prepped
        // For simplicity, we only check base ingredients
      }
      return true;
    },

    startPrep(recipeId) {
      const recipe = ALL_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return false;

      const stations = store.get('prepStations');
      const available = stations.find(s => !s.busy);
      if (!available) return false;

      // Consume ingredients
      const inv = store.get('inventory');
      for (const ingId of recipe.ingredients) {
        const baseItem = inv.find(i => i.id === ingId);
        if (baseItem) {
          store.set({
            inventory: inv.map(i => i.id === ingId ? { ...i, qty: i.qty - 1 } : i),
          });
        }
      }

      // Start prep
      const updated = stations.map(s =>
        s.id === available.id
          ? { ...s, busy: true, item: recipeId, recipe: recipe.name, progress: 0, total: recipe.prepTime }
          : s
      );
      store.set({ prepStations: updated });
      return true;
    },

    tickPrep() {
      const stations = store.get('prepStations');
      const truck = store.get('truck');
      let changed = false;

      const updated = stations.map(s => {
        if (!s.busy) return s;
        if (truck.battery <= 0) return s; // No power, no prep

        const newProgress = s.progress + 1;
        const drained = false;

        // Drain battery while cooking
        store.set({
          truck: { ...truck, battery: Math.max(0, truck.battery - 0.3) },
        });

        if (newProgress >= s.total) {
          changed = true;
          return { ...s, busy: false, item: null, progress: 0, total: 100 };
        }
        return { ...s, ...drained ? {} : { progress: newProgress } };
      });

      if (changed) store.set({ prepStations: updated });
      else if (JSON.stringify(updated) !== JSON.stringify(stations)) {
        store.set({ prepStations: updated });
      }
    },

    getPrepProgress() {
      return store.get('prepStations').filter(s => s.busy).map(s => ({
        recipe: s.recipe,
        progress: s.progress,
        total: s.total,
        pct: Math.round((s.progress / s.total) * 100),
      }));
    },

    researchRecipe(recipeId) {
      const recipe = ALL_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return false;
      const rp = store.get('researchPoints');
      if (rp < recipe.researchCost) return false;
      const recipes = store.get('recipes');
      if (recipes.unlocked.includes(recipeId)) return false;

      store.set({
        researchPoints: rp - recipe.researchCost,
        recipes: { ...recipes, unlocked: [...recipes.unlocked, recipeId] },
      });
      return true;
    },
  };
}
