import type { AssetManifest } from "./asset-manifest";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Texture } from "three";

export type AssetCache<Manifest extends AssetManifest> = {
  texture: Record<Manifest["texture"][number]["name"], Texture>;
  audio: Record<Manifest["audio"][number]["name"], AudioBuffer>;
  gltf: Record<Manifest["gltf"][number]["name"], GLTF>;
};
