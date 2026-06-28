/**
 * Light crafting — pantry ingredients and booster recipes.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var INGREDIENTS = ['flour', 'sugar', 'butter', 'berry', 'citrus', 'cocoa', 'cream', 'spice'];

  var RECIPES = [
    {
      id: 'whisk',
      name: 'Copper Whisk',
      desc: 'Clear one full row on use',
      cost: { flour: 3, cream: 2 }
    },
    {
      id: 'rolling',
      name: 'Rolling Pin',
      desc: 'Clear one full column on use',
      cost: { flour: 3, cocoa: 2 }
    },
    {
      id: 'sugar',
      name: 'Sugar Dust',
      desc: 'Remove all pastries of one color',
      cost: { sugar: 2, citrus: 2 }
    },
    {
      id: 'moves',
      name: 'Extra Fold',
      desc: '+5 moves at level start',
      cost: { berry: 2, spice: 2 }
    },
    {
      id: 'mitt',
      name: 'Oven Mitt',
      desc: 'Unlock every chained pastry once',
      cost: { cocoa: 3, citrus: 1 }
    },
    {
      id: 'proof',
      name: 'Proofing Powder',
      desc: 'Clear every flour overlay on the board',
      cost: { flour: 2, cream: 2 }
    },
    {
      id: 'glaze',
      name: 'Berry Glaze',
      desc: '+12 seconds on timed levels',
      cost: { berry: 3, sugar: 2 }
    },
    {
      id: 'master',
      name: "Master's Token",
      desc: 'Start with a color-bomb pastry',
      cost: { flour: 1, sugar: 1, butter: 1, berry: 1, citrus: 1, cocoa: 1, cream: 1, spice: 1 }
    }
  ];

  function emptyPantry() {
    var p = {};
    for (var i = 0; i < INGREDIENTS.length; i++) p[INGREDIENTS[i]] = 0;
    return p;
  }

  function emptyBoosters() {
    var b = {};
    for (var i = 0; i < RECIPES.length; i++) b[RECIPES[i].id] = 0;
    return b;
  }

  function Crafting(pantry, boosters) {
    this.pantry = pantry || emptyPantry();
    this.boosters = boosters || emptyBoosters();
  }

  Crafting.prototype.canCraft = function(recipeId) {
    var recipe = null;
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].id === recipeId) { recipe = RECIPES[i]; break; }
    }
    if (!recipe) return false;
    var keys = Object.keys(recipe.cost);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if ((this.pantry[key] || 0) < recipe.cost[key]) return false;
    }
    return true;
  };

  Crafting.prototype.craft = function(recipeId) {
    if (!this.canCraft(recipeId)) return false;
    var recipe = null;
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].id === recipeId) { recipe = RECIPES[i]; break; }
    }
    if (!recipe) return false;
    var keys = Object.keys(recipe.cost);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      this.pantry[key] -= recipe.cost[key];
    }
    this.boosters[recipeId] = (this.boosters[recipeId] || 0) + 1;
    return true;
  };

  Crafting.prototype.addIngredient = function(name, amount) {
    if (!this.pantry.hasOwnProperty(name)) return;
    this.pantry[name] += amount || 1;
  };

  Crafting.prototype.randomDrop = function(matchSize) {
    var chance = NS.Config.INGREDIENT_DROP_CHANCE + (matchSize > 3 ? 0.08 : 0);
    if (Math.random() > chance) return null;
    var idx = Math.floor(Math.random() * INGREDIENTS.length);
    var ing = INGREDIENTS[idx];
    this.addIngredient(ing, 1);
    return ing;
  };

  Crafting.prototype.useBooster = function(id) {
    if (!this.boosters[id]) return false;
    this.boosters[id]--;
    return true;
  };

  Crafting.prototype.craftedRecipeIds = function() {
    var ids = [];
    for (var i = 0; i < RECIPES.length; i++) {
      if (this.canCraft(RECIPES[i].id)) ids.push(RECIPES[i].id);
    }
    return ids;
  };

  Crafting.prototype.serialize = function() {
    return { pantry: Object.assign({}, this.pantry), boosters: Object.assign({}, this.boosters) };
  };

  Crafting.fromData = function(data) {
    var p = emptyPantry();
    var b = emptyBoosters();
    if (data && data.pantry) Object.assign(p, data.pantry);
    if (data && data.boosters) Object.assign(b, data.boosters);
    return new Crafting(p, b);
  };

  NS.Crafting = Crafting;
  NS.RECIPES = RECIPES;
  NS.INGREDIENTS = INGREDIENTS;
})(window.PatisserieLedger);
