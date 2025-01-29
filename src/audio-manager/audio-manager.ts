import type { AudioControls } from "./audio-pool";
import { AudioPool } from "./audio-pool";

export type AudioRecord<AssetName extends string> = Record<
  AssetName,
  { file: AudioBuffer; maxInstances?: number; volume?: number; loop?: boolean }
>;

export type AudioManagerProps<AssetName extends string> = {
  masterVolume: number;
  assets: AudioRecord<AssetName>;
};

export const createAudioManager = <AudioAssetName extends string>(
  props: AudioManagerProps<AudioAssetName>
): AudioManager<AudioAssetName> => {
  return new AudioManager(props);
};

export class AudioManager<AudioAssetName extends string> {
  readonly #audioPools: Record<AudioAssetName, AudioPool>;
  #masterVolume: number;

  public constructor({ masterVolume, assets }: AudioManagerProps<AudioAssetName>) {
    this.#masterVolume = Math.max(Math.min(masterVolume, 1), 0);

    this.#audioPools = Object.keys(assets).reduce<Record<AudioAssetName, AudioPool>>((prev, next) => {
      const audioAssetName = next as AudioAssetName;
      const { file, maxInstances, volume, loop } = assets[audioAssetName];

      prev[audioAssetName] = new AudioPool({
        audioBuffer: file,
        maxPoolSize: maxInstances ?? 1,
        volume: volume ?? 1,
        loop: loop ?? false,
      });

      return prev;
    }, {} as Record<AudioAssetName, AudioPool>);
  }

  public readonly play = (name: AudioAssetName): AudioControls => {
    const audioPlayControls = this.#audioPools[name].play();
    return {
      ...audioPlayControls,
      setVolume: (volume: number) => {
        audioPlayControls.setVolume(this.#masterVolume * volume);
      },
    };
  };

  public readonly stop = (name: AudioAssetName): void => {
    this.#audioPools[name].stopAll();
  };

  public readonly stopAll = (): void => {
    Object.keys(this.#audioPools).forEach((audioPoolName) => {
      this.#audioPools[audioPoolName as AudioAssetName].stopAll();
    });
  };

  /**
   * @param volume A number from 0 - 1 that sets the volume of all sounds
   */
  public readonly setMasterVolume = (volume: number): void => {
    // TODO: Update the volume of any currently playing audio files
    this.#masterVolume = Math.min(volume, 1);
  };
}
