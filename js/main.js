import { Board } from './Board.js';
import { SoundEngine } from './SoundEngine.js';
import { FlightPoller } from './FlightPoller.js';
import { KeyboardController } from './KeyboardController.js';

document.addEventListener('DOMContentLoaded', () => {
  const boardContainer = document.getElementById('board-container');
  const soundEngine = new SoundEngine();
  const board = new Board(boardContainer, soundEngine);
  const poller = new FlightPoller(board);
  const keyboard = new KeyboardController(poller, soundEngine);

  // Initialize audio on first user interaction (browser autoplay policy)
  let audioInitialized = false;
  const initAudio = async () => {
    if (audioInitialized) return;
    audioInitialized = true;
    await soundEngine.init();
    soundEngine.resume();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  // Start polling flights
  poller.start();

  // Volume toggle button
  const volumeBtn = document.getElementById('volume-btn');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      initAudio();
      const muted = soundEngine.toggleMute();
      volumeBtn.classList.toggle('muted', muted);
    });
  }

  // Fullscreen button
  const fsBtn = document.getElementById('fullscreen-btn');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      initAudio();
      boardContainer.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.documentElement.requestFullscreen().catch(() => {});
      }, 400);
    });
  }
});
