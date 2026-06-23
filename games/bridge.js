/**
 * Game Bridge Shim — provides window.gameBridge via postMessage.
 * Included by all games to communicate with the parent frame.
 */
(function() {
  if (window.gameBridge) return; // already set (e.g. running standalone)

  var _responseHandlers = {};
  var _msgId = 0;

  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg._bridge) return;

    if (msg.type === 'load-response' || msg.type === 'save-response' || msg.type === 'unlock-achievement-response' || msg.type === 'submit-score-response') {
      var handler = _responseHandlers[msg._id];
      if (handler) {
        handler(msg.data);
        delete _responseHandlers[msg._id];
      }
    }
  });

  function post(type, data) {
    return new Promise(function(resolve) {
      _msgId++;
      _responseHandlers[_msgId] = resolve;
      window.parent.postMessage({
        _bridge: true,
        _id: _msgId,
        type: type,
        data: data
      }, '*');
      // Timeout after 5s
      setTimeout(function() {
        if (_responseHandlers[_msgId]) {
          resolve(null);
          delete _responseHandlers[_msgId];
        }
      }, 5000);
    });
  }

  window.gameBridge = {
    save: function(data) { return post('save', data); },
    load: function() { return post('load', null); },
    unlockAchievement: function(achievementId) { return post('unlock-achievement', { achievementId: achievementId }); },
    submitScore: function(scoreData) { return post('submit-score', { score: scoreData }); },
  };
})();
