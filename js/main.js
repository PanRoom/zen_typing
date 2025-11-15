import { TypingGame } from './TypingGame.js';

// DOMの準備ができてからゲームを開始
window.addEventListener('DOMContentLoaded', () => {
    const game = new TypingGame();
    game.start();
});