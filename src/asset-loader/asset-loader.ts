import { AudioLoader, LoadingManager, NearestFilter, RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";

import type { AssetCache } from "./asset-cache";
import type { AssetManifest } from "./asset-manifest";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type LoadAssetManifestProps<AssetManifest> = {
  assetManifest: AssetManifest;
  onProgress?: (percentageLoaded: number) => void;
};

export class AssetLoader {
  readonly #textureLoader: TextureLoader;
  readonly #gltfLoader: GLTFLoader;
  readonly #dracoLoader: DRACOLoader;
  readonly #audioLoader: AudioLoader;
  readonly #loadingManager: LoadingManager;
  public readonly promises: Promise<unknown>[] = [];

  public constructor() {
    this.#loadingManager = new LoadingManager();
    this.#textureLoader = new TextureLoader(this.#loadingManager);
    this.#audioLoader = new AudioLoader(this.#loadingManager);
    this.#gltfLoader = new GLTFLoader(this.#loadingManager);
    this.#dracoLoader = new DRACOLoader(this.#loadingManager);
    this.#dracoLoader.setDecoderPath("./draco/");
    this.#gltfLoader.setDRACOLoader(this.#dracoLoader);
  }

  public readonly loadAssetManifest = async <Manifest extends AssetManifest>({
    assetManifest,
    onProgress = () => undefined,
  }: LoadAssetManifestProps<Manifest>): Promise<AssetCache<Manifest>> => {
    this.#loadingManager.onProgress = (_url: string, loaded: number, total: number) => {
      onProgress((loaded / total) * 100 || 0);
    };

    const { texture, audio, gltf } = assetManifest;

    const assetCache = {
      texture: {},
      audio: {},
      gltf: {},
    } as AssetCache<Manifest>;

    texture.forEach(({ name, url }) => {
      const asyncFunction = async ({ name, url }: { name: string; url: string }) => {
        const texture = await this.#textureLoader.loadAsync(url);
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.magFilter = NearestFilter;
        texture.flipY = false;
        assetCache.texture[name as Manifest["texture"][number]["name"]] = texture;
      };

      this.promises.push(asyncFunction({ name, url }));
    });

    audio.forEach(({ name, url }) => {
      const asyncFunction = async ({ name, url }: { name: string; url: string }) => {
        const asset = await this.#audioLoader.loadAsync(url);
        assetCache.audio[name as Manifest["audio"][number]["name"]] = asset;
      };

      this.promises.push(asyncFunction({ name, url }));
    });

    gltf.forEach(({ name, url }) => {
      const asyncFunction = async ({ name, url }: { name: string; url: string }) => {
        const asset = await this.#gltfLoader.loadAsync(url);

        assetCache.gltf[name as Manifest["gltf"][number]["name"]] = asset;
      };

      this.promises.push(asyncFunction({ name, url }));
    });

    await Promise.all(this.promises);

    return assetCache;
  };
}
