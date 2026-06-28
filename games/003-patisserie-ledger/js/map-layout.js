/**
 * Scrollable world-map node layout — winding path through four districts.
 */
window.PatisserieLedger = window.PatisserieLedger || {};

(function(NS) {
  var C = NS.Config;

  function buildMapNodes() {
    var nodes = [];
    var cx = 240;
    var y = 130;
    var landmarks = [];

    for (var ch = 0; ch < C.CHAPTERS.length; ch++) {
      var chapter = C.CHAPTERS[ch];
      landmarks.push({ y: y - 50, label: chapter.name, chapter: chapter.id });

      for (var lv = 0; lv < C.LEVELS_PER_CHAPTER; lv++) {
        var wave = Math.sin(lv * 0.65 + ch) * 95;
        var x = cx + wave;
        nodes.push({
          id: chapter.id + '-' + (lv + 1),
          chapter: chapter.id,
          level: lv + 1,
          x: x,
          y: y
        });
        y += 58;
      }
      y += 72;
    }

    return { nodes: nodes, landmarks: landmarks, height: y + 100 };
  }

  NS.MapLayout = buildMapNodes();
})(window.PatisserieLedger);
