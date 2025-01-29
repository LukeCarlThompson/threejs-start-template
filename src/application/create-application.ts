import { Application } from "./application";
import { AssetLoader } from "../asset-loader";
import type { PhysicsDebugger } from "./physics";
import type Stats from "stats-gl";
import { assetManifest } from "../asset-manifest";
import { createPhysicsWorld } from "./physics";
import { createRenderer } from "./create-renderer";
import { gameState } from "../game-state.svelte";
import { getConfig } from "../get-config";

export const createApplication = async (appElement: HTMLElement): Promise<Application> => {
  const config = getConfig();

  const { world, eventQueue } = await createPhysicsWorld();

  const assetLoader = new AssetLoader();

  const renderer = await createRenderer(config.webGPUEnabled);

  const commonAssetCache = await assetLoader.loadAssetManifest({
    assetManifest: assetManifest.common,
    onProgress: (percentage) => {
      const modifiedPercentage = ((12 + percentage) / 112) * 100;
      gameState.loadingPercent = modifiedPercentage;
    },
  });

  let stats: Stats | undefined = undefined;
  if (config.stats) {
    const Stats = (await import("stats-gl")).default;
    stats = new Stats({
      trackGPU: true,
      trackHz: true,
      trackCPT: false,
    });

    void stats.init(renderer);

    document.body.appendChild(stats.dom);
  }
  let physicsDebugger: PhysicsDebugger | undefined = undefined;
  if (config.physicsDebugRender) {
    const { PhysicsDebugger } = await import("./physics");

    physicsDebugger = new PhysicsDebugger();
  }

  const application = new Application({
    renderer,
    world,
    eventQueue,
    appElement,
    commonAssetCache,
    assetLoader,
    gameState,
    physicsDebugger,
    stats,
  });

  return application;
};
