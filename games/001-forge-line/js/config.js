/**
 * Forge Line — defenders, enemies, worlds, campaign levels.
 */
(function(NS) {
  NS.ROWS = 5;
  NS.COLS = 9;
  NS.RESOURCE = 'Ore';
  NS.RESOURCE_PLURAL = 'Ore';
  NS.START_STEAM = 150;
  NS.BASE_HP = 5;
  NS.PASSIVE_STEAM = 2;
  NS.COLLECTOR_INTERVAL = 12;
  NS.COLLECTOR_AMOUNT = 25;
  NS.COLLECTOR_FIRST_PAYOUT = 6;
  NS.REACTOR_COL = -0.35;

  NS.WORLDS = [
    { id: 1, name: 'Outer Belt', subtitle: 'Training shifts & scrap walkers', levelStart: 1, levelEnd: 7, biome: 'outer_belt' },
    { id: 2, name: 'Foundry Depths', subtitle: 'Armored haulers & steam hazards', levelStart: 8, levelEnd: 14, biome: 'foundry' },
    { id: 3, name: 'Reactor Run', subtitle: 'Elite squads & the Smelter King', levelStart: 15, levelEnd: 21, biome: 'reactor_run' },
    { id: 4, name: 'Scrapyard Shift', subtitle: 'Challenge shifts & endless overtime', levelStart: 22, levelEnd: 24, biome: 'scrapyard' }
  ];

  NS.BIOMES = {
    outer_belt: {
      skyTop: '#0c1424',
      skyMid: '#161e2e',
      skyBot: '#1a1714',
      glow: 'rgba(74, 120, 160, 0.22)',
      glowX: 0.78,
      glowY: 0.22,
      dust: 'rgba(140, 168, 200, 0.12)',
      accent: '#5a8ab0',
      feature: 'asteroids'
    },
    foundry: {
      skyTop: '#1a0c08',
      skyMid: '#2a1410',
      skyBot: '#14100c',
      glow: 'rgba(196, 92, 42, 0.35)',
      glowX: 0.5,
      glowY: 0.72,
      dust: 'rgba(224, 120, 64, 0.14)',
      accent: '#c45c2a',
      feature: 'smoke'
    },
    reactor_run: {
      skyTop: '#180810',
      skyMid: '#241018',
      skyBot: '#100c10',
      glow: 'rgba(240, 96, 48, 0.4)',
      glowX: 0.12,
      glowY: 0.48,
      dust: 'rgba(240, 160, 96, 0.1)',
      accent: '#e05030',
      feature: 'reactor'
    },
    scrapyard: {
      skyTop: '#121810',
      skyMid: '#1a2018',
      skyBot: '#141610',
      glow: 'rgba(122, 168, 150, 0.18)',
      glowX: 0.65,
      glowY: 0.55,
      dust: 'rgba(168, 150, 130, 0.1)',
      accent: '#7aa896',
      feature: 'junk'
    }
  };

  NS.getBiome = function(worldId) {
    var w = null;
    for (var i = 0; i < NS.WORLDS.length; i++) {
      if (NS.WORLDS[i].id === worldId) w = NS.WORLDS[i];
    }
    var key = w && w.biome ? w.biome : 'outer_belt';
    return NS.BIOMES[key] || NS.BIOMES.outer_belt;
  };

  NS.DEFENDERS = {
    ore_collector: {
      id: 'ore_collector',
      name: 'Ore Collector',
      cost: 50,
      hp: 120,
      cooldown: 5,
      kind: 'producer',
      unlockLevel: 1,
      income: 25,
      incomeInterval: 12,
      desc: 'Mines +25 Ore every 12s. Build several — this is your main income!'
    },
    rivet_cannon: {
      id: 'rivet_cannon',
      name: 'Rivet Cannon',
      cost: 100,
      hp: 100,
      cooldown: 5,
      kind: 'shooter',
      damage: 18,
      rate: 1.35,
      range: 9,
      unlockLevel: 1,
      desc: 'Shoots rivets down its lane. Good general-purpose damage.'
    },
    plate_barrier: {
      id: 'plate_barrier',
      name: 'Plate Barrier',
      cost: 50,
      hp: 520,
      cooldown: 12,
      kind: 'wall',
      unlockLevel: 2,
      desc: 'High-HP wall. Golems stop and chew through it — buys time.',
      unlockGreg: 'Plate Barriers are steel lunch for golems. Park \'em in front of your shooters — they buy you seconds, and seconds are Ore.'
    },
    steam_kettle: {
      id: 'steam_kettle',
      name: 'Steam Kettle',
      cost: 125,
      hp: 110,
      cooldown: 7,
      kind: 'shooter',
      damage: 28,
      rate: 2.2,
      range: 2.2,
      splash: 0.8,
      unlockLevel: 3,
      desc: 'Close-range steam blast with splash. Put it near the front.',
      unlockGreg: 'Steam Kettles vent superheated junk at the belt face. Short range, big splash — hug the front row or waste it.'
    },
    magnet_coil: {
      id: 'magnet_coil',
      name: 'Magnet Coil',
      cost: 175,
      hp: 130,
      cooldown: 10,
      kind: 'support',
      rate: 1.8,
      range: 2.5,
      unlockLevel: 5,
      desc: 'Strips armor from golems in adjacent lanes. Pair with cannons.',
      unlockGreg: 'Magnet Coils rip rivets off armored haulers. If it clanks, coil it — then let cannons finish the job.'
    },
    drill_pod: {
      id: 'drill_pod',
      name: 'Drill Pod',
      cost: 75,
      hp: 80,
      cooldown: 15,
      kind: 'trap',
      damage: 180,
      unlockLevel: 6,
      desc: 'Buried trap — one huge hit when a golem steps on it.',
      unlockGreg: 'Drill Pods hide under the belt plates. One golem, one surprise hole. Don\'t plant on a lane you still need open.'
    },
    conveyor_drone: {
      id: 'conveyor_drone',
      name: 'Conveyor Drone',
      cost: 150,
      hp: 95,
      cooldown: 8,
      kind: 'shooter',
      damage: 14,
      rate: 0.65,
      range: 9,
      unlockLevel: 7,
      desc: 'Fast rivet fire down the lane. Melts swarms.',
      unlockGreg: 'Conveyor Drones spit rivets faster than OSHA allows. Swarm waves melt — just don\'t ask who pays for the ammo.'
    },
    tesla_pylon: {
      id: 'tesla_pylon',
      name: 'Tesla Pylon',
      cost: 200,
      hp: 140,
      cooldown: 12,
      kind: 'shooter',
      damage: 22,
      rate: 2.4,
      range: 4,
      chain: 3,
      unlockLevel: 9,
      desc: 'Arc lightning jumps between nearby golems.',
      unlockGreg: 'Tesla Pylons arc between clumped golems. Crowded lane? Chef\'s kiss. Spread out? Useless. Plan accordingly.'
    },
    foundry_bloom: {
      id: 'foundry_bloom',
      name: 'Foundry Bloom',
      cost: 175,
      hp: 115,
      cooldown: 10,
      kind: 'producer',
      steamOnKill: 15,
      range: 2.5,
      unlockLevel: 11,
      desc: 'Kills near this rig refund bonus Ore to your stockpile.',
      unlockGreg: 'Foundry Bloom converts scrap kills into bonus Ore. Kill zone is tight — plant where the fighting actually happens.'
    },
    coolant_sprayer: {
      id: 'coolant_sprayer',
      name: 'Coolant Sprayer',
      cost: 125,
      hp: 105,
      cooldown: 8,
      kind: 'support',
      rate: 1.5,
      range: 3,
      slow: 0.45,
      slowDur: 2.5,
      unlockLevel: 13,
      desc: 'Slows golems with coolant mist in a short radius.',
      unlockGreg: 'Coolant Sprayers gum up golem joints with frost mist. Slow targets eat twice the rivets. Pair with cannons.'
    },
    scrap_recycler: {
      id: 'scrap_recycler',
      name: 'Scrap Recycler',
      cost: 225,
      hp: 150,
      cooldown: 14,
      kind: 'shooter',
      damage: 32,
      rate: 2.8,
      range: 9,
      steamOnKill: 25,
      unlockLevel: 16,
      desc: 'Heavy shots that recycle scrap into bonus Ore on kill.',
      unlockGreg: 'Scrap Recyclers are endgame hardware — heavy shots, fat Ore refunds. Expensive. Worth it if you live.'
    }
  };

  NS.ENEMIES = {
    scrap_walker: {
      id: 'scrap_walker',
      name: 'Scrap Walker',
      hp: 110,
      speed: 0.22,
      damage: 1,
      armor: 0,
      reward: 8,
      bark: 'CLANG… must… recycle…',
      encounterGreg: 'Scrap Walkers — slow, dumb, endless. Like interns. Shoot them before they hug the reactor.'
    },
    riveted_brute: {
      id: 'riveted_brute',
      name: 'Riveted Brute',
      hp: 280,
      speed: 0.16,
      damage: 1,
      armor: 0,
      reward: 14,
      bark: 'Rivets… hold… forever…',
      encounterGreg: 'Riveted Brutes soak damage. Walls or focus fire — don\'t let them stack on one lane.'
    },
    shield_hauler: {
      id: 'shield_hauler',
      name: 'Shield Hauler',
      hp: 200,
      speed: 0.18,
      damage: 1,
      armor: 80,
      reward: 16,
      bark: 'Cargo… of… rust…',
      encounterGreg: 'Shield Haulers wear armor plates. Magnet Coils strip \'em — or brute force works if you\'re rich in Ore.'
    },
    spring_jumper: {
      id: 'spring_jumper',
      name: 'Spring Jumper',
      hp: 150,
      speed: 0.28,
      damage: 1,
      armor: 0,
      reward: 12,
      jumps: true,
      bark: 'BOING— overtime!',
      encounterGreg: 'Spring Jumpers leap the first rig they meet. Barriers bait the jump — then nail \'em on landing.'
    },
    lane_digger: {
      id: 'lane_digger',
      name: 'Lane Digger',
      hp: 180,
      speed: 0.24,
      damage: 1,
      armor: 0,
      reward: 14,
      underground: true,
      surfaceAt: 4.5,
      bark: 'dig dig dig…',
      encounterGreg: 'Lane Diggers burrow — you\'ll only see dust until they surface mid-lane. Drill Pods love these.'
    },
    rust_elite: {
      id: 'rust_elite',
      name: 'Rust Elite',
      hp: 320,
      speed: 0.32,
      damage: 2,
      armor: 20,
      reward: 22,
      bark: 'Premium… corrosion…',
      encounterGreg: 'Rust Elites are fast and mean. Priority targets — let them through and your shift ends early.'
    },
    conveyor_hijacker: {
      id: 'conveyor_hijacker',
      name: 'Hijacker',
      hp: 130,
      speed: 0.38,
      damage: 1,
      armor: 0,
      reward: 10,
      bark: 'Mine now!',
      encounterGreg: 'Hijackers sprint the belt. Slow fields or burst damage — they\'ll steal lane time if ignored.'
    },
    amalgam_swarm: {
      id: 'amalgam_swarm',
      name: 'Amalgam Bit',
      hp: 55,
      speed: 0.34,
      damage: 1,
      armor: 0,
      reward: 5,
      small: true,
      bark: 'tik-tik-tik',
      encounterGreg: 'Amalgam Bits swarm in packs. Splash damage and drones chew through — don\'t snipe one at a time.'
    },
    clunker_captain: {
      id: 'clunker_captain',
      name: 'Clunker Captain',
      hp: 900,
      speed: 0.12,
      damage: 2,
      armor: 60,
      reward: 80,
      boss: true,
      bark: 'ALL HANDS— SCRAP HIM!',
      encounterGreg: 'Clunker Captain — belt boss. Huge HP, armor, ego. Blast doors and everything you\'ve got. This is the performance review.'
    },
    smelter_king: {
      id: 'smelter_king',
      name: 'Smelter King',
      hp: 2200,
      speed: 0.09,
      damage: 3,
      armor: 120,
      reward: 200,
      boss: true,
      bark: 'MELT… THE… REACTOR…',
      encounterGreg: 'Smelter King. Final shift nightmare. Max everything. If he touches the core, we\'re all slag.'
    }
  };

  var GREG = {
    1: 'Welcome to shift one, rookie. Ore Collectors mine your paycheck — +25 Ore every 12 seconds. Reactor slag drip is pocket change. Plant collectors, then cannons.',
    2: 'Plate Barriers go in front. Golems eat rivets for breakfast but choke on steel.',
    3: 'Steam Kettles melt faces at close range. Keep \'em near the front.',
    5: 'Magnet Coils strip armor. Shield Haulers hate them. So do I, but for different reasons.',
    7: 'End of Outer Belt! Clunker Captain incoming. Blast doors are one-use per lane— don\'t waste \'em on squirrels.',
    8: 'Foundry Depths. Hotter, darker, more paperwork. Armored squads ahead.',
    14: 'Foundry boss wave. Hydrate. Cry if needed. Company policy allows 30 seconds.',
    15: 'Reactor Run. If they breach here, we all become space dust. No pressure!',
    21: 'Smelter King on final approach. I\'m not gonna lie— this is bad. Deploy everything.',
    22: 'Scrapyard challenge shifts. Stars optional, dignity not included.',
    24: 'Endless overtime. Survive as long as you can. Break room pizza is stale.'
  };

  NS.DEFAULT_WAVE_PREP = 12;
  NS.FIRST_WAVE_PREP = 10;

  function spawn(type, row, delay) {
    return { type: type, row: row, delay: delay || 0 };
  }

  /** PvZ-style wave: prep time, then spawns, then clear before next wave. */
  function wave(spawns, opts) {
    opts = opts || {};
    return {
      prep: opts.prep != null ? opts.prep : NS.DEFAULT_WAVE_PREP,
      spawns: spawns,
      announce: opts.announce || null,
      huge: !!opts.huge
    };
  }

  function level(id, name, waves, opts) {
    opts = opts || {};
    var world = 1;
    if (id >= 22) world = 4;
    else if (id >= 15) world = 3;
    else if (id >= 8) world = 2;
    return {
      id: id,
      world: world,
      name: name,
      intro: GREG[id] || ('Shift ' + id + '. Keep the reactor breathing.'),
      startSteam: opts.startSteam || NS.START_STEAM,
      waves: waves,
      flag: opts.flag || null
    };
  }

  function rowSpread(type, count, baseDelay, rowStart) {
    var out = [];
    var rows = [0, 1, 2, 3, 4];
    for (var i = 0; i < count; i++) {
      out.push(spawn(type, rows[(i + (rowStart || 0)) % 5], baseDelay + i * 2.5));
    }
    return out;
  }

  NS.LEVELS = [
    level(1, 'Orientation', [
      wave([spawn('scrap_walker', 2, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('scrap_walker', 2, 0), spawn('scrap_walker', 3, 4)], { prep: 12 }),
      wave(rowSpread('scrap_walker', 3, 0, 1), { prep: 14, huge: true, announce: 'Final patrol wave! Hold the reactor line!' })
    ]),
    level(2, 'Rivet Drill', [
      wave(rowSpread('scrap_walker', 2, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('scrap_walker', 1, 0), spawn('riveted_brute', 2, 6)], { prep: 12 }),
      wave(rowSpread('scrap_walker', 4, 0), { prep: 14, huge: true })
    ]),
    level(3, 'Steam Safety', [
      wave([spawn('scrap_walker', 0, 0), spawn('scrap_walker', 4, 3)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('scrap_walker', 3, 0), { prep: 12 }),
      wave([spawn('riveted_brute', 2, 0), spawn('scrap_walker', 1, 5), spawn('scrap_walker', 3, 5)], { prep: 14, huge: true })
    ]),
    level(4, 'Magnet Monday', [
      wave(rowSpread('scrap_walker', 3, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('shield_hauler', 2, 0), spawn('scrap_walker', 0, 4)], { prep: 12 }),
      wave([spawn('shield_hauler', 1, 0), spawn('shield_hauler', 3, 5), spawn('scrap_walker', 2, 8)], { prep: 15, huge: true, announce: 'Armored column incoming!' })
    ]),
    level(5, 'Spring Surprise', [
      wave([spawn('spring_jumper', 2, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('scrap_walker', 3, 0), { prep: 12 }),
      wave([spawn('spring_jumper', 1, 0), spawn('spring_jumper', 3, 3), spawn('riveted_brute', 2, 8)], { prep: 14, huge: true })
    ]),
    level(6, 'Underground Union', [
      wave([spawn('lane_digger', 2, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('scrap_walker', 4, 0), { prep: 12 }),
      wave([spawn('lane_digger', 1, 0), spawn('lane_digger', 3, 4), spawn('riveted_brute', 2, 10)], { prep: 15, huge: true, announce: 'Tunnel crew surfacing on all lanes!' })
    ]),
    level(7, 'Clunker Captain', [
      wave(rowSpread('scrap_walker', 4, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('shield_hauler', 2, 0), spawn('conveyor_hijacker', 4, 4)], { prep: 13 }),
      wave([spawn('clunker_captain', 2, 0), spawn('amalgam_swarm', 1, 8), spawn('amalgam_swarm', 3, 10)], { prep: 18, huge: true, announce: 'Clunker Captain leads the final wave!' })
    ], { flag: 'world1' }),
    level(8, 'Foundry Gate', [
      wave(rowSpread('riveted_brute', 2, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('shield_hauler', 2, 0), spawn('scrap_walker', 0, 5)], { prep: 12 }),
      wave(rowSpread('shield_hauler', 3, 0, 2), { prep: 14, huge: true })
    ]),
    level(9, 'Hijack Alley', [
      wave(rowSpread('conveyor_hijacker', 3, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('riveted_brute', 2, 0), spawn('conveyor_hijacker', 4, 4)], { prep: 12 }),
      wave(rowSpread('conveyor_hijacker', 5, 0), { prep: 15, huge: true, announce: 'Hijacker swarm on the belt!' })
    ]),
    level(10, 'Rust Storm', [
      wave([spawn('rust_elite', 2, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('scrap_walker', 4, 0), { prep: 12 }),
      wave([spawn('rust_elite', 1, 0), spawn('rust_elite', 3, 6), spawn('shield_hauler', 2, 10)], { prep: 15, huge: true })
    ]),
    level(11, 'Bloom Shift', [
      wave(rowSpread('amalgam_swarm', 6, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('riveted_brute', 2, 0), spawn('amalgam_swarm', 0, 4)], { prep: 12 }),
      wave(rowSpread('amalgam_swarm', 8, 0, 1), { prep: 16, huge: true, announce: 'Swarm wave! Foundry Bloom pays off here.' })
    ]),
    level(12, 'Coolant Crisis', [
      wave([spawn('spring_jumper', 1, 0), spawn('spring_jumper', 3, 3)], { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('rust_elite', 2, 0), spawn('lane_digger', 4, 5)], { prep: 12 }),
      wave(rowSpread('rust_elite', 2, 0), { prep: 14, huge: true })
    ]),
    level(13, 'Tesla Tuesday', [
      wave(rowSpread('shield_hauler', 3, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('clunker_captain', 2, 0)], { prep: 14 }),
      wave([spawn('rust_elite', 0, 0), spawn('rust_elite', 4, 4), spawn('conveyor_hijacker', 2, 8)], { prep: 16, huge: true, announce: 'Elite assault wave! Magnet Coils ready?' })
    ]),
    level(14, 'Foundry Finale', [
      wave(rowSpread('riveted_brute', 4, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('clunker_captain', 2, 0), spawn('shield_hauler', 1, 8)], { prep: 14 }),
      wave([spawn('clunker_captain', 2, 0), spawn('rust_elite', 0, 10), spawn('rust_elite', 4, 12)], { prep: 18, huge: true, announce: 'Foundry boss wave! Double Captains!' })
    ], { flag: 'world2' }),
    level(15, 'Reactor Approach', [
      wave(rowSpread('rust_elite', 2, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('lane_digger', 2, 0), spawn('spring_jumper', 1, 5)], { prep: 12 }),
      wave(rowSpread('conveyor_hijacker', 5, 0), { prep: 15, huge: true })
    ]),
    level(16, 'Recycler Ramp', [
      wave(rowSpread('amalgam_swarm', 8, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('shield_hauler', 2, 0), spawn('riveted_brute', 1, 6)], { prep: 12 }),
      wave([spawn('rust_elite', 2, 0), spawn('amalgam_swarm', 0, 4)], { prep: 15, huge: true })
    ]),
    level(17, 'Double Lane', [
      wave([spawn('spring_jumper', 0, 0), spawn('spring_jumper', 4, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('rust_elite', 3, 0), { prep: 12 }),
      wave([spawn('lane_digger', 1, 0), spawn('lane_digger', 3, 4), spawn('clunker_captain', 2, 12)], { prep: 16, huge: true, announce: 'Twin tunnel breach plus Captain!' })
    ]),
    level(18, 'Armor Parade', [
      wave(rowSpread('shield_hauler', 4, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('clunker_captain', 2, 0), spawn('riveted_brute', 1, 8)], { prep: 13 }),
      wave(rowSpread('shield_hauler', 3, 0), { prep: 16, huge: true })
    ]),
    level(19, 'Elite Hour', [
      wave(rowSpread('rust_elite', 3, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('conveyor_hijacker', 0, 0), spawn('conveyor_hijacker', 4, 2)], { prep: 12 }),
      wave([spawn('clunker_captain', 2, 0), spawn('rust_elite', 1, 10)], { prep: 16, huge: true })
    ]),
    level(20, 'Swarm Contract', [
      wave(rowSpread('amalgam_swarm', 10, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('riveted_brute', 2, 0), spawn('spring_jumper', 1, 6)], { prep: 12 }),
      wave(rowSpread('amalgam_swarm', 12, 0, 2), { prep: 18, huge: true, announce: 'Contract finale — maximum scrap density!' })
    ]),
    level(21, 'Smelter King', [
      wave(rowSpread('rust_elite', 2, 0), { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('clunker_captain', 1, 0), spawn('clunker_captain', 3, 8)], { prep: 14 }),
      wave([spawn('smelter_king', 2, 0), spawn('amalgam_swarm', 0, 10), spawn('amalgam_swarm', 4, 12)], { prep: 20, huge: true, announce: 'SMELTER KING! Everything you have, NOW!' })
    ], { flag: 'world3', startSteam: 200 }),
    level(22, 'Puzzle Belt', [
      wave([spawn('spring_jumper', 2, 0), spawn('lane_digger', 2, 8)], { prep: NS.FIRST_WAVE_PREP }),
      wave(rowSpread('shield_hauler', 3, 0), { prep: 12 }),
      wave([spawn('rust_elite', 2, 0), spawn('spring_jumper', 1, 6), spawn('spring_jumper', 3, 6)], { prep: 15, huge: true })
    ], { startSteam: 175 }),
    level(23, 'Boss Rush Lite', [
      wave([spawn('clunker_captain', 2, 0)], { prep: NS.FIRST_WAVE_PREP }),
      wave([spawn('clunker_captain', 1, 0), spawn('rust_elite', 3, 8)], { prep: 14 }),
      wave([spawn('smelter_king', 2, 0)], { prep: 18, huge: true, announce: 'Final boss wave. No overtime pay included.' })
    ], { startSteam: 200 }),
    level(24, 'Endless Overtime', [
      wave(rowSpread('scrap_walker', 3, 0), { prep: NS.FIRST_WAVE_PREP })
    ], { flag: 'endless', startSteam: 200 })
  ];

  NS.getLevel = function(id) {
    for (var i = 0; i < NS.LEVELS.length; i++) {
      if (NS.LEVELS[i].id === id) return NS.LEVELS[i];
    }
    return null;
  };

  NS.unlockedDefenders = function(levelId) {
    var list = [];
    for (var k in NS.DEFENDERS) {
      if (NS.DEFENDERS[k].unlockLevel <= levelId) list.push(NS.DEFENDERS[k]);
    }
    return list.sort(function(a, b) { return a.unlockLevel - b.unlockLevel || a.cost - b.cost; });
  };

  NS.defendersUnlockedAtLevel = function(levelId) {
    var list = [];
    for (var k in NS.DEFENDERS) {
      if (NS.DEFENDERS[k].unlockLevel === levelId) list.push(NS.DEFENDERS[k]);
    }
    return list.sort(function(a, b) { return a.cost - b.cost; });
  };

  NS.starsForRun = function(baseHp, maxHp, damageTaken) {
    if (damageTaken === 0) return 3;
    if (baseHp >= maxHp - 1) return 2;
    if (baseHp > 0) return 1;
    return 0;
  };
})(window.ForgeLine = window.ForgeLine || {});
