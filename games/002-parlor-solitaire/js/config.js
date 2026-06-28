/**
 * Parlor Klondike — constants, scoring, suit metadata.
 */
(function(NS) {
  NS.SUITS = [
    { id: 0, name: 'Spades', symbol: '♠', color: 'black' },
    { id: 1, name: 'Hearts', symbol: '♥', color: 'red' },
    { id: 2, name: 'Clubs', symbol: '♣', color: 'black' },
    { id: 3, name: 'Diamonds', symbol: '♦', color: 'red' }
  ];

  NS.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  NS.MODES = {
    classic: { id: 'classic', label: 'Classic', draw: 1, maxCycles: 999, vegas: false },
    classic3: { id: 'classic3', label: 'Draw three', draw: 3, maxCycles: 999, vegas: false },
    vegas: { id: 'vegas', label: 'Vegas', draw: 3, maxCycles: 3, vegas: true },
    daily: { id: 'daily', label: 'Daily deal', draw: 1, maxCycles: 999, vegas: false, daily: true }
  };

  NS.SCORE = {
    toFoundation: 10,
    toTableau: 5,
    flipTableau: 5,
    hintPenalty: 15,
    undoPenalty: 0,
    vegasStart: 52,
    timeBonusPerSec: 2
  };

  NS.isRed = function(suit) {
    return suit === 1 || suit === 3;
  };

  NS.cardColor = function(suit) {
    return NS.isRed(suit) ? 'red' : 'black';
  };

  NS.dailySeed = function() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  NS.dailyKey = function() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  NS.formatTime = function(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };
})(window.ParlorSolitaire = window.ParlorSolitaire || {});
