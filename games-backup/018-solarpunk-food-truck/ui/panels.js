/** UI panels for each game phase */

import { $, el, clear, glassPanel, statBadge, progressBar, btn, showView } from './components.js';

export function createPanels(store, gameLoop, economy, cooking, customers, world, persistence) {
  let serviceTimer = null;
  let customerSpawnTimer = null;
  let serviceTicks = 0;
  const MAX_SERVICE_TICKS = 120; // ~2 minutes of real-time service

  function renderHUD() {
    const hud = $('hud-bar');
    if (!hud) return;
    const day = store.get('day');
    const phase = store.get('phase');
    const cash = store.get('cash');
    const bloom = store.get('bloomRep');
    const truck = store.get('truck');
    const batteryPct = Math.round((truck.battery / truck.maxBattery) * 100);

    hud.innerHTML = '';
    hud.append(
      statBadge('Day', day, '#ffdd66'),
      statBadge('Phase', phase.charAt(0).toUpperCase() + phase.slice(1), '#88ddff'),
      statBadge('☀ Cash', '$' + cash, '#ffdd66'),
      statBadge('🌿 Bloom', bloom.toFixed(1), '#66dd88'),
      statBadge('⚡ Battery', batteryPct + '%', batteryPct < 20 ? '#ff4466' : '#44ddff'),
    );
  }

  function renderMorning() {
    showView('morning-view');
    renderHUD();

    const container = $('morning-content');
    clear(container);

    // Weather report
    const weather = store.get('weather');
    const weatherIcons = { clear: '☀️', cloudy: '⛅', rain: '🌧️', heatwave: '🔥' };
    const weatherNames = { clear: 'Clear Skies', cloudy: 'Cloudy', rain: 'Rainy', heatwave: 'Heatwave' };
    container.append(glassPanel([
      el('h3', {}, ['🌤 Weather: ' + (weatherIcons[weather] || '') + ' ' + (weatherNames[weather] || weather)]),
      el('p', { class: 'hint' }, [gameLoop.weatherMult() >= 1 ? 'Good solar charging today.' : 'Reduced solar charging today.']),
    ], 'weather-panel'));

    // Location
    const loc = store.get('location');
    const locs = world.getUnlockedLocations();
    container.append(glassPanel([
      el('h3', {}, ['📍 Location: ' + (locs.find(l => l.id === loc)?.name || loc)]),
      el('div', { class: 'loc-buttons' }, locs.map(l =>
        btn(l.name + (l.id === loc ? ' ✓' : ''), () => {
          world.travelTo(l.id);
          renderMorning();
        }, l.id === loc, l.id === loc)
      )),
    ], 'location-panel'));

    // Inventory summary
    const inv = store.get('inventory');
    const totalItems = inv.reduce((s, i) => s + i.qty, 0);
    const avgFresh = inv.length > 0 ? Math.round(inv.reduce((s, i) => s + i.freshness, 0) / inv.length) : 100;

    container.append(glassPanel([
      el('h3', {}, ['📦 Inventory (' + totalItems + ' items, freshness ' + avgFresh + '%)']),
      el('div', { class: 'inv-grid' }, inv.map(i => {
        const spoiling = i.freshness < 40;
        return el('div', { class: `inv-item ${spoiling ? 'spoiling' : ''}` }, [
          el('span', { class: 'inv-name' }, [i.name]),
          el('span', { class: 'inv-qty' }, ['×' + i.qty]),
          el('span', { class: 'inv-fresh', style: { color: i.freshness < 30 ? '#ff4466' : i.freshness < 60 ? '#ffdd66' : '#66dd88' } }, [
            i.freshness + '%'
          ]),
        ]);
      })),
    ], 'inv-panel'));

    // Supplier panel
    const suppliers = economy.getSupplierList();
    container.append(glassPanel([
      el('h3', {}, ['🛒 Supplier']),
      el('div', { class: 'supplier-row' }, Object.entries(suppliers).map(([key, s]) =>
        btn(s.name + ' (' + s.description + ')', () => {
          // Quick restock dialog
          const itemId = prompt('Item ID (tomato, lettuce, bread, cheese, beans, rice, salsa, avocado):');
          if (!itemId) return;
          const qty = parseInt(prompt('Quantity:') || '5', 10);
          if (economy.buyIngredient(itemId, qty, key)) {
            renderMorning();
          } else {
            alert('Not enough cash!');
          }
        })
      )),
    ], 'supplier-panel'));

    // Start service button
    container.append(el('div', { class: 'phase-btn-wrap' }, [
      btn('▶ Start Service →', () => {
        gameLoop.advancePhase();
        renderService();
      }, true),
    ]));
  }

  function renderService() {
    showView('service-view');
    renderHUD();
    serviceTicks = 0;

    const container = $('service-content');
    clear(container);

    // Start service timer
    if (serviceTimer) clearInterval(serviceTimer);
    if (customerSpawnTimer) clearInterval(customerSpawnTimer);

    serviceTimer = setInterval(() => {
      serviceTicks++;

      // Tick prep stations
      cooking.tickPrep();

      // Tick customer patience
      customers.tickPatience();

      // Spawn customers periodically
      if (serviceTicks % 10 === 0) {
        customers.bringCustomer();
      }

      // End service after max ticks
      if (serviceTicks >= MAX_SERVICE_TICKS) {
        endService();
      }

      renderServiceContent(container);
    }, 1000);

    // Spawn first customers
    customers.bringCustomer();
    customers.bringCustomer();
    renderServiceContent(container);
  }

  function renderServiceContent(container) {
    if (!container) container = $('service-content');
    clear(container);

    // Battery + timer bar
    const truck = store.get('truck');
    const batteryPct = Math.round((truck.battery / truck.maxBattery) * 100);
    const timeLeft = MAX_SERVICE_TICKS - serviceTicks;
    const timeMin = Math.floor(timeLeft / 60);
    const timeSec = timeLeft % 60;

    container.append(glassPanel([
      el('div', { class: 'service-stats' }, [
        el('span', {}, ['⏱ ' + timeMin + ':' + String(timeSec).padStart(2, '0')]),
        el('span', {}, ['⚡ ' + batteryPct + '%']),
        el('span', {}, ['Served: ' + store.get('servedToday')]),
      ]),
      progressBar(batteryPct, batteryPct < 20 ? '#ff4466' : '#44ddff'),
    ], 'service-bar'));

    // Customers
    const customersList = store.get('customers');
    container.append(glassPanel([
      el('h3', {}, ['👥 Customers (' + customersList.filter(c => !c.served).length + ' waiting)']),
      el('div', { class: 'customer-grid' }, customersList.map(c => {
        const patiencePct = Math.round((c.patience / c.maxPatience) * 100);
        return el('div', { class: `customer-card ${c.served ? 'served' : ''} ${patiencePct < 25 ? 'angry' : ''}` }, [
          el('div', { class: 'customer-header' }, [
            el('span', {}, [c.emoji + ' ' + c.name]),
            el('span', { class: 'customer-order' }, ['Wants: ' + c.orderName]),
          ]),
          el('div', { class: 'customer-patience' }, [
            progressBar(patiencePct, patiencePct < 25 ? '#ff4466' : patiencePct < 50 ? '#ffdd66' : '#66dd88'),
            el('span', { class: 'patience-text' }, [c.patience + '/' + c.maxPatience]),
          ]),
          el('div', { class: 'customer-price' }, [
            '$' + c.price,
            !c.served ? btn('Serve ✓', () => {
              if (customers.serveCustomer(c.id)) {
                renderServiceContent(container);
              }
            }, true, truck.battery <= 0) : el('span', { class: 'served-tag' }, ['✅ Served']),
          ]),
        ]);
      })),
    ], 'customers-panel'));

    // Prep stations
    const stations = store.get('prepStations');
    const unlockedRecipes = cooking.getUnlockedRecipes();
    container.append(glassPanel([
      el('h3', {}, ['🔪 Prep Stations (Battery: ' + batteryPct + '%)']),
      el('div', { class: 'prep-grid' }, stations.map(s => {
        return el('div', { class: 'prep-station' }, [
          el('div', { class: 'station-label' }, ['Station ' + (s.id + 1) + (s.busy ? ' — ' + (s.recipe || '') : ' — Idle')]),
          s.busy ? progressBar(Math.round((s.progress / s.total) * 100)) : el('span', { class: 'idle-text' }, ['Ready']),
        ]);
      })),
      el('div', { class: 'recipe-buttons' }, unlockedRecipes.slice(0, 4).map(r =>
        btn(r.name + ' ($' + r.sellPrice + ')', () => {
          if (cooking.startPrep(r.id)) {
            renderServiceContent(container);
          } else {
            // Check if we have ingredients or station available
            const hasStation = store.get('prepStations').some(s => !s.busy);
            alert(hasStation ? 'Missing ingredients!' : 'No free station!');
          }
        }, false, truck.battery <= 0 || !store.get('prepStations').some(s => !s.busy))
      )),
    ], 'prep-panel'));

    // End service early button
    container.append(el('div', { class: 'phase-btn-wrap' }, [
      btn('⏹ End Service Early', () => {
        endService();
      }, false),
    ]));
  }

  function endService() {
    if (serviceTimer) { clearInterval(serviceTimer); serviceTimer = null; }
    if (customerSpawnTimer) { clearInterval(customerSpawnTimer); customerSpawnTimer = null; }

    // Auto-save
    persistence.saveToLocalStorage();
    persistence.saveToBridge();

    gameLoop.advancePhase();
    renderEvening();
  }

  function renderEvening() {
    showView('evening-view');
    renderHUD();

    const container = $('evening-content');
    clear(container);

    // Day summary
    const served = store.get('servedToday');
    const missed = store.get('missedToday');
    const { totalRev, totalCost, profit } = economy.endDayFinances();

    container.append(glassPanel([
      el('h3', {}, ['📋 Day ' + store.get('day') + ' Summary']),
      el('div', { class: 'summary-grid' }, [
        el('div', { class: 'summary-row' }, [el('span', {}, ['Served']), el('span', {}, [String(served)])]),
        el('div', { class: 'summary-row' }, [el('span', {}, ['Missed']), el('span', {}, [String(missed)])]),
        el('div', { class: 'summary-row' }, [el('span', {}, ['Revenue']), el('span', { style: { color: '#66dd88' } }, ['$' + totalRev])]),
        el('div', { class: 'summary-row' }, [el('span', {}, ['Costs']), el('span', { style: { color: '#ff6644' } }, ['$' + totalCost])]),
        el('div', { class: 'summary-row profit' }, [el('span', {}, ['Profit']), el('span', { style: { color: profit >= 0 ? '#66dd88' : '#ff4466' } }, ['$' + profit])]),
      ]),
    ], 'summary-panel'));

    // Research
    const rp = store.get('researchPoints');
    const allRecipes = cooking.getAllRecipes();
    const unlocked = store.get('recipes').unlocked;
    const researchable = allRecipes.filter(r => !unlocked.includes(r.id) && r.researchCost > 0);

    container.append(glassPanel([
      el('h3', {}, ['🔬 Research (' + rp + ' points)']),
      el('div', { class: 'research-grid' }, researchable.length > 0 ? researchable.map(r =>
        el('div', { class: 'research-item' }, [
          el('span', {}, [r.name + ' (' + r.researchCost + ' RP)']),
          btn('Research', () => {
            if (cooking.researchRecipe(r.id)) renderEvening();
            else alert('Not enough research points!');
          }, false, rp < r.researchCost),
        ])
      ) : [el('p', { class: 'hint' }, ['All recipes unlocked or none available.'])]),
    ], 'research-panel'));

    // Cleanliness & maintenance
    const truck = store.get('truck');
    container.append(glassPanel([
      el('h3', {}, ['🧹 Truck Maintenance']),
      el('div', { class: 'maint-grid' }, [
        el('div', {}, [
          el('span', {}, ['Cleanliness: ' + Math.round(truck.cleanliness) + '%']),
          progressBar(truck.cleanliness),
        ]),
        el('div', {}, [
          el('span', {}, ['Battery: ' + Math.round((truck.battery / truck.maxBattery) * 100) + '%']),
          progressBar((truck.battery / truck.maxBattery) * 100),
        ]),
      ]),
      btn('Clean Truck ($10)', () => {
        const cash = store.get('cash');
        if (cash >= 10) {
          store.set({
            cash: cash - 10,
            truck: { ...store.get('truck'), cleanliness: Math.min(100, truck.cleanliness + 30) },
          });
          renderEvening();
        } else {
          alert('Not enough cash!');
        }
      }, false, store.get('cash') < 10),
    ], 'maint-panel'));

    // Donate to co-op to earn bloom rep
    container.append(glassPanel([
      el('h3', {}, ['🌱 Community Investment']),
      btn('Donate $20 to Co-op (+0.5 Bloom)', () => {
        const cash = store.get('cash');
        if (cash >= 20) {
          store.set({
            cash: cash - 20,
            bloomRep: Math.min(10, store.get('bloomRep') + 0.5),
          });
          renderEvening();
        } else {
          alert('Not enough cash!');
        }
      }, false, store.get('cash') < 20),
    ], 'community-panel'));

    // End day button
    container.append(el('div', { class: 'phase-btn-wrap' }, [
      btn('🌙 End Day →', () => {
        persistence.saveToLocalStorage();
        persistence.saveToBridge();
        gameLoop.advancePhase();
        renderMorning();
      }, true),
    ]));
  }

  function renderUpgrades() {
    showView('upgrade-view');
    renderHUD();
    const container = $('upgrade-content');
    clear(container);

    const cash = store.get('cash');
    const truck = store.get('truck');
    const upgrades = store.get('upgrades');

    const upgradeOptions = [
      { id: 'solar-panel-2', name: 'Solar Panel II', desc: '+10 solar capacity', cost: 80, apply: () => store.set({ truck: { ...truck, solarCapacity: truck.solarCapacity + 10 } }) },
      { id: 'solar-panel-3', name: 'Solar Panel III', desc: '+15 solar capacity', cost: 150, apply: () => store.set({ truck: { ...truck, solarCapacity: truck.solarCapacity + 15 } }) },
      { id: 'battery-2', name: 'Battery Pack II', desc: '+50 max battery', cost: 60, apply: () => store.set({ truck: { ...truck, maxBattery: truck.maxBattery + 50 } }) },
      { id: 'battery-3', name: 'Battery Pack III', desc: '+100 max battery', cost: 120, apply: () => store.set({ truck: { ...truck, maxBattery: truck.maxBattery + 100 } }) },
      { id: 'station-2', name: 'Second Prep Station', desc: '+1 prep station', cost: 100, apply: () => {
        const stations = store.get('prepStations');
        store.set({ prepStations: [...stations, { id: stations.length, busy: false, item: null, progress: 0, total: 100 }] });
      }},
      { id: 'station-3', name: 'Third Prep Station', desc: '+1 prep station', cost: 200, apply: () => {
        const stations = store.get('prepStations');
        store.set({ prepStations: [...stations, { id: stations.length, busy: false, item: null, progress: 0, total: 100 }] });
      }},
      { id: 'chef-1', name: 'Hire Chef', desc: 'Faster prep (always active)', cost: 120, apply: () => store.set({ staff: { ...store.get('staff'), chef: 1 } }) },
      { id: 'cashier-1', name: 'Hire Cashier', desc: 'More customers served', cost: 100, apply: () => store.set({ staff: { ...store.get('staff'), cashier: 1 } }) },
      { id: 'forager-1', name: 'Hire Forager', desc: 'Free ingredients daily', cost: 80, apply: () => store.set({ staff: { ...store.get('staff'), forager: 1 } }) },
    ];

    container.append(glassPanel([
      el('h3', {}, ['🔧 Upgrades ($' + cash + ')']),
      el('div', { class: 'upgrade-grid' }, upgradeOptions.map(u => {
        const owned = upgrades[u.id];
        return el('div', { class: `upgrade-card ${owned ? 'owned' : ''}` }, [
          el('div', { class: 'upgrade-info' }, [
            el('span', { class: 'upgrade-name' }, [u.name]),
            el('span', { class: 'upgrade-desc' }, [u.desc]),
          ]),
          owned
            ? el('span', { class: 'owned-tag' }, ['✓ Owned'])
            : btn('$' + u.cost, () => {
              if (cash >= u.cost) {
                store.set({ cash: cash - u.cost, upgrades: { ...upgrades, [u.id]: true } });
                u.apply();
                renderUpgrades();
              } else alert('Not enough cash!');
            }, false, cash < u.cost),
        ]);
      })),
    ], 'upgrade-list'));

    container.append(el('div', { class: 'phase-btn-wrap' }, [
      btn('← Back', () => {
        const phase = store.get('phase');
        if (phase === 'morning') renderMorning();
        else if (phase === 'evening') renderEvening();
        else renderMorning();
      }),
    ]));
  }

  return {
    renderHUD,
    renderMorning,
    renderService,
    renderEvening,
    renderUpgrades,
    init() {
      // Bind upgrade button in header
      const upBtn = $('upgrade-btn');
      if (upBtn) upBtn.addEventListener('click', renderUpgrades);

      // Reset game button
      const resetBtn = $('reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', () => {
        if (confirm('Start a new game? All progress will be lost.')) {
          location.reload();
        }
      });
    },
  };
}
