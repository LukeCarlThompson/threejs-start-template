export type AssetManifest = {
  texture: readonly { name: string; url: string }[];
  audio: readonly { name: string; url: string }[];
  gltf: readonly { name: string; url: string }[];
};
