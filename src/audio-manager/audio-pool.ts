import { Audio, AudioListener } from "three";

export type AudioControls = {
  setDetune: (detune: number) => void;
  setPlaybackRate: (playbackRate: number) => void;
  setLoop: (loop: boolean) => void;
  stop: () => void;
  isPlaying: boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
};

export type AudioPoolProps = { audioBuffer: AudioBuffer; maxPoolSize: number; volume: number; loop: boolean };

export class AudioPool {
  readonly #audioBuffer: AudioBuffer;
  readonly #maxPoolSize: number;
  readonly #volume: number;
  readonly #pool: Audio[] = [];
  #playIndex = 0;

  public constructor({ audioBuffer, maxPoolSize, volume, loop }: AudioPoolProps) {
    this.#audioBuffer = audioBuffer;
    this.#maxPoolSize = maxPoolSize;
    this.#volume = volume;

    const audio = new Audio(new AudioListener());
    audio.setBuffer(audioBuffer);
    audio.setLoop(loop);
    audio.setVolume(volume);

    this.#pool.push(audio);
  }

  public readonly play = (): AudioControls => {
    const initialAudioInstance = this.#pool[this.#playIndex];
    if (initialAudioInstance.isPlaying && this.#pool.length < this.#maxPoolSize) {
      this.#createNewInstance();
      this.#incrementPlayIndex();
    }
    const currentAudioInstance = this.#pool[this.#playIndex];

    if (!currentAudioInstance.isPlaying) {
      currentAudioInstance.play();
    }

    return {
      setDetune: (detune: number) => {
        currentAudioInstance.detune = detune;
      },
      setPlaybackRate: (playbackRate: number) => {
        currentAudioInstance.setPlaybackRate(playbackRate);
      },
      setLoop: (loop: boolean) => {
        currentAudioInstance.loop = loop;
      },
      stop: () => currentAudioInstance.stop(),
      isPlaying: currentAudioInstance.isPlaying,
      setVolume: (volume: number) => {
        if (!currentAudioInstance.isPlaying) return;
        currentAudioInstance.setVolume(volume);
      },
      getVolume: () => currentAudioInstance.getVolume(),
    };
  };

  public readonly stopAll = (): void => {
    this.#pool.forEach((instance) => instance.stop());
  };

  #incrementPlayIndex() {
    this.#playIndex = (this.#playIndex + 1) % this.#pool.length;
  }

  #createNewInstance(): Audio {
    const audio = new Audio(new AudioListener());
    audio.setBuffer(this.#audioBuffer);
    audio.setVolume(this.#volume);

    this.#pool.push(audio);

    return audio;
  }
}
