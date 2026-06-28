/**
 * Forge Line — tray icons now use SpriteAtlas bitmaps; this shim stays for compatibility.
 */
(function(NS) {
  NS.rigIconHtml = function(id) {
    NS.SpriteAtlas.init();
    var c = NS.SpriteAtlas.createTrayIcon(id);
    return c.outerHTML;
  };
})(window.ForgeLine = window.ForgeLine || {});
