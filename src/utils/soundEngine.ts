const SCENE_FILES: Record<string, string> = {
  lobby: "./sounds/lobby.mp3",
  battle: "./sounds/battle.mp3",
  divination: "./sounds/divination.mp3",
  victory: "./sounds/lobby.mp3",
};

export type SoundScene = keyof typeof SCENE_FILES;

let engineInstance: SoundEngine | null = null;

export function getSoundEngine(): SoundEngine {
  if (!engineInstance) {
    engineInstance = new SoundEngine();
  }
  return engineInstance;
}

class SoundEngine {
  private audio: HTMLAudioElement | null = null;
  private currentScene: SoundScene = "lobby";
  private running = false;

  start(scene: SoundScene = "lobby") {
    if (this.running && this.currentScene === scene) {
      return;
    }

    this.currentScene = scene;
    this.stopAudio();
    this.running = true;

    const src = SCENE_FILES[scene];
    if (!src) {
      return;
    }

    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = 0;

    const handlePlay = () => {
      if (this.audio) {
        this.fadeVolume(this.audio, 0, 0.16, 1500);
      }
    };

    this.audio.addEventListener("canplaythrough", handlePlay, { once: true });
    this.audio.load();
    this.audio.play().catch(() => {
      // Autoplay blocked, will retry on next user interaction
    });
  }

  stop() {
    this.stopAudio();
    this.running = false;
  }

  setEnabled(enabled: boolean) {
    if (enabled) {
      this.start(this.currentScene);
    } else {
      this.stop();
    }
  }

  switchScene(scene: SoundScene) {
    this.start(scene);
  }

  destroy() {
    this.stop();
  }

  private stopAudio() {
    if (this.audio) {
      const audio = this.audio;
      const fadeAndStop = () => {
        this.fadeVolume(audio, audio.volume, 0, 500);
        setTimeout(() => {
          audio.pause();
          audio.remove();
        }, 600);
      };

      if (audio.readyState >= 2) {
        fadeAndStop();
      } else {
        audio.pause();
        audio.remove();
      }
      this.audio = null;
    }
  }

  private fadeVolume(
    element: HTMLAudioElement,
    from: number,
    to: number,
    duration: number,
  ) {
    const start = performance.now();

    const step = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      element.volume = from + (to - from) * eased;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    step();
  }
}
