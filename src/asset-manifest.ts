import type { GameLevelName } from "./game-state.svelte";
import concreteDragUrl from "./assets/audio/scrape.mp3";
import dropUrl from "./assets/audio/drop.mp3?url";
import footstepsUrl from "./assets/audio/footsteps.mp3?url";
import grappleUrl from "./assets/audio/grapple.mp3?url";
import jetpackBurstUrl from "./assets/audio/jetpack-burst.mp3?url";
import jetpackLoopUrl from "./assets/audio/jetpack-loop.mp3?url";
import levelFiveUrl from "./assets/level_05.glb?url";
import levelFourUrl from "./assets/level_04.glb?url";
import levelOneUrl from "./assets/level_01.glb?url";
import levelThreeUrl from "./assets/level_03.glb?url";
import levelTwoUrl from "./assets/level_02.glb?url";
import playerHitUrl from "./assets/audio/player-hit.mp3";
import playerUrl from "./assets/player.glb?url";
import woodHitUrl from "./assets/audio/wood-hit.mp3?url";

export const commonAssetManifest = {
  texture: [],
  audio: [
    { name: "jetpackLoop", url: jetpackLoopUrl },
    { name: "jetpackBurst", url: jetpackBurstUrl },
    { name: "grapple", url: grappleUrl },
    { name: "footsteps", url: footstepsUrl },
    { name: "woodHit", url: woodHitUrl },
    { name: "drop", url: dropUrl },
    { name: "playerHit", url: playerHitUrl },
    { name: "concreteDrag", url: concreteDragUrl },
  ],
  gltf: [{ name: "player", url: playerUrl }],
} as const;

export const levelOneAssetManifest = {
  texture: [],
  audio: [],
  gltf: [{ name: "environment", url: levelOneUrl }],
} as const;

export const levelTwoAssetManifest = {
  texture: [],
  audio: [],
  gltf: [{ name: "environment", url: levelTwoUrl }],
} as const;

export const levelThreeAssetManifest = {
  texture: [],
  audio: [],
  gltf: [{ name: "environment", url: levelThreeUrl }],
} as const;

export const levelFourAssetManifest = {
  texture: [],
  audio: [],
  gltf: [{ name: "environment", url: levelFourUrl }],
} as const;

export const levelFiveAssetManifest = {
  texture: [],
  audio: [],
  gltf: [{ name: "environment", url: levelFiveUrl }],
} as const;

export type AssetManifest =
  | typeof commonAssetManifest
  | typeof levelOneAssetManifest
  | typeof levelTwoAssetManifest
  | typeof levelThreeAssetManifest
  | typeof levelFourAssetManifest;

export const assetManifest: Record<"common" | GameLevelName, AssetManifest> = {
  common: commonAssetManifest,
  "Level One": levelOneAssetManifest,
  "Level Two": levelTwoAssetManifest,
  "Level Three": levelThreeAssetManifest,
  "Level Four": levelFourAssetManifest,
  "Level Five": levelFiveAssetManifest,
} as const;
