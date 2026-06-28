/**
 * Tutorial, how-to-play, level briefings, and in-game help copy.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var C = NS.Config;

  var TUTORIAL_STEPS = [
    {
      title: 'Welcome to the Ledger',
      body: 'You are the relief baker on a four-district route. Match pastries on the marble board, fulfil each shift ticket, and earn stars to unlock the next counter along the path.'
    },
    {
      title: 'Making Matches',
      body: 'Tap one pastry, then tap an adjacent one to swap — or drag between neighbours. You must <strong>swap</strong> to create a line of three or more in a row or column. Existing lines on the board do not clear by themselves. Matches vanish, new pastries fall in, and combos chain for bonus score.'
    },
    {
      title: 'Shift Tickets (Objectives)',
      body: 'Every level lists goals at the top: reach a score, collect pastry types, clear flour dust, drop cherries to the bottom, fill a vessel, or complete a mixed order. Finish <strong>all</strong> goals before moves run out (or the oven timer hits zero on rush shifts).'
    },
    {
      title: 'Obstacles & Boosters',
      body: '<strong>Flour dust</strong> (top-left puff) clears when you match next to it. <strong>Chain locks</strong> freeze a piece until you match it directly. <strong>Copper jars</strong> block a cell — hit them with two adjacent matches. Only one obstacle per tile.'
    },
    {
      title: 'Stars & the District Map',
      body: 'Clear a shift for 1★. Finish with plenty of moves or time left for 2★ and 3★. Stars unlock new districts on the scrollable path. Open <strong>Pantry & Craft</strong> between levels to brew whisk, rolling-pin, and sugar-dust boosters.'
    }
  ];

  var OBSTACLE_GUIDE = [
    { id: 'flour', name: 'Flour dust', desc: 'Small puff in the corner. Match pastries in any neighbouring cell to sweep it away.' },
    { id: 'glaze', name: 'Caramel glaze', desc: 'Corner drip — takes two neighbouring matches to remove.' },
    { id: 'wrap', name: 'Wax tag', desc: 'Corner tag on a pastry. Match that tile to peel it off (piece cannot move while tagged).' },
    { id: 'chain', name: 'Chain lock', desc: 'Padlock on a pastry. Match that exact tile to break the chain (cannot swap while locked).' },
    { id: 'jar', name: 'Copper jar', desc: 'Blocks the cell. Break it with two adjacent matches.' },
    { id: 'jam', name: 'Spreading jam', desc: 'Creeps to nearby tiles every few moves if not cleared.' },
    { id: 'drop', name: 'Cherry garnish', desc: 'Match above cherries to let them fall to the bottom row.' }
  ];

  function objectiveBrief(obj) {
    if (obj.type === 'score') return 'Reach ' + obj.target + ' points';
    if (obj.type === 'collect') return 'Collect ' + obj.target + ' ' + C.TILE_LABELS[obj.tile] + ' pastries';
    if (obj.type === 'clear_overlay') return 'Clear all ' + (obj.overlay || 'flour') + ' from the board';
    if (obj.type === 'drop') return 'Drop ' + obj.target + ' cherries to the bottom row';
    if (obj.type === 'fill') return 'Fill the service vessel to 100%';
    if (obj.type === 'order') {
      var parts = [];
      var keys = Object.keys(obj.counts || {});
      for (var i = 0; i < keys.length; i++) {
        parts.push(obj.counts[keys[i]] + ' ' + keys[i]);
      }
      return 'Complete order: ' + parts.join(', ');
    }
    return 'Complete the shift ticket';
  }

  function obstaclesInLevel(levelDef) {
    var types = {};
    var obs = levelDef.obstacles || [];
    for (var i = 0; i < obs.length; i++) types[obs[i].type] = true;
    if ((levelDef.drops || []).length) types.drop = true;
    var list = [];
    for (var j = 0; j < OBSTACLE_GUIDE.length; j++) {
      if (types[OBSTACLE_GUIDE[j].id]) list.push(OBSTACLE_GUIDE[j]);
    }
    return list;
  }

  function levelBriefingHtml(levelDef) {
    var ch = C.CHAPTERS[levelDef.chapter - 1];
    var html = '<p class="brief-sector">Sector <span class="accent">' + levelDef.id + '</span> · ' + ch.name + '</p>';
    html += '<h2 class="brief-title">' + levelDef.name + '</h2>';
    html += '<p class="brief-lede">' + ch.subtitle + '</p>';

    html += '<div class="brief-box"><h3 class="brief-heading">Shift ticket</h3><ul class="brief-list">';
  if (levelDef.time > 0) {
      html += '<li><strong>Rush shift</strong> — oven timer ' + levelDef.time + 's (no move limit)</li>';
    } else {
      html += '<li><strong>' + levelDef.moves + ' moves</strong> to complete all goals</li>';
    }
    for (var i = 0; i < levelDef.objectives.length; i++) {
      html += '<li>' + objectiveBrief(levelDef.objectives[i]) + '</li>';
    }
    html += '</ul></div>';

    var obs = obstaclesInLevel(levelDef);
    if (obs.length > 0) {
      html += '<div class="brief-box"><h3 class="brief-heading">Obstacles this shift</h3><ul class="brief-list">';
      for (var o = 0; o < obs.length; o++) {
        html += '<li><strong>' + obs[o].name + '</strong> — ' + obs[o].desc + '</li>';
      }
      html += '</ul></div>';
    }

    html += '<p class="hint">Match 4 in a row for a line clearer · 5 for a colour bomb · L-shapes for area bursts</p>';
    html += '<button type="button" class="overlay-btn" id="btn-begin-shift">Begin shift</button>';
    html += '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-brief-back">Back to map</button>';
    return html;
  }

  function howToPlayHtml() {
    var html = '<p class="lede">How Patisserie Ledger works</p>';
    html += '<div class="guide-section"><h3>Matching</h3><p>Swap adjacent pastries to form lines of 3+. Pieces fall and refill; chains score more.</p></div>';
    html += '<div class="guide-section"><h3>Winning a shift</h3><p>Complete every objective on the ticket before moves or time run out.</p></div>';
    html += '<div class="guide-section"><h3>Stars</h3><p>1★ clear the shift · 2★ finish with 25%+ moves/time left · 3★ with 50%+ remaining.</p></div>';
    html += '<div class="guide-section"><h3>Pantry</h3><p>Ingredients drop during play. On the map, open Pantry & Craft to build boosters.</p></div>';
    html += '<div class="guide-section"><h3>Obstacle glossary</h3><ul class="brief-list">';
    for (var i = 0; i < OBSTACLE_GUIDE.length; i++) {
      html += '<li><strong>' + OBSTACLE_GUIDE[i].name + '</strong> — ' + OBSTACLE_GUIDE[i].desc + '</li>';
    }
    html += '</ul></div>';
    html += '<button type="button" class="overlay-btn" id="btn-guide-close">Close</button>';
    return html;
  }

  function tutorialStepHtml(stepIndex) {
    var step = TUTORIAL_STEPS[stepIndex];
    var html = '<p class="tutorial-progress">Guide ' + (stepIndex + 1) + ' / ' + TUTORIAL_STEPS.length + '</p>';
    html += '<h2 class="brief-title">' + step.title + '</h2>';
    html += '<p class="brief-lede">' + step.body + '</p>';
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      html += '<button type="button" class="overlay-btn" id="btn-tutorial-next">Next</button>';
      html += '<button type="button" class="overlay-btn overlay-btn-ghost" id="btn-tutorial-skip">Skip guide</button>';
    } else {
      html += '<button type="button" class="overlay-btn" id="btn-tutorial-done">Open district map</button>';
    }
    return html;
  }

  NS.Guide = {
    TUTORIAL_STEPS: TUTORIAL_STEPS,
    OBSTACLE_GUIDE: OBSTACLE_GUIDE,
    objectiveBrief: objectiveBrief,
    levelBriefingHtml: levelBriefingHtml,
    howToPlayHtml: howToPlayHtml,
    tutorialStepHtml: tutorialStepHtml
  };
})(window.PatisserieLedger);
