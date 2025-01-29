import type { AssetCache, AssetLoader, AssetManifest } from "../asset-loader";
import type { EventQueue, World } from "@dimforge/rapier3d-compat";
import { GameLevel, Player } from "../view";
import type { GameLevelName, GameState } from "../game-state.svelte";

import type { AudioControls } from "../audio-manager";
import { PerspectiveCamera } from "three";
import type { PhysicsDebugger } from "./physics";
import type { PlayerAudioAssetName } from "../view/components";
import { RenderResolutionController } from "./render-resolution-controller";
import type Stats from "stats-gl";
import { Ticker } from "./ticker";
import { UserInput } from "./user-input";
import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";
import { assetManifest } from "../asset-manifest";
import { createAudioManager } from "../audio-manager";

export type ApplicationProps = {
  renderer: WebGLRenderer | WebGPURenderer;
  world: World;
  eventQueue: EventQueue;
  appElement: HTMLElement;
  assetLoader: AssetLoader;
  commonAssetCache: AssetCache<AssetManifest>;
  gameState: GameState;
  physicsDebugger?: PhysicsDebugger;
  stats?: Stats;
};

export type CommonAudioAssetName = PlayerAudioAssetName | "grapple" | "woodHit" | "drop" | "playerHit" | "blockDrag";

export type CommonAudioManager = {
  play: (name: CommonAudioAssetName) => AudioControls;
  stop: (name: CommonAudioAssetName) => void;
  stopAll: () => void;
};

export class Application {
  #renderer: WebGLRenderer | WebGPURenderer;
  #ticker: Ticker;
  #camera: PerspectiveCamera;
  #physicsWorld: World;
  #eventQueue: EventQueue;
  #userInput: UserInput;
  #renderResolutionController: RenderResolutionController;
  #assetLoader: AssetLoader;
  #commonAssetCache: AssetCache<AssetManifest>;
  #commonAudioManager: CommonAudioManager;
  #currentLevel?: GameLevel;
  #player: Player;
  #gameState: GameState;
  #appElement: HTMLElement;
  #physicsDebugger?: PhysicsDebugger;

  public constructor({
    renderer,
    world,
    eventQueue,
    appElement,
    assetLoader,
    commonAssetCache,
    gameState,
    physicsDebugger,
    stats,
  }: ApplicationProps) {
    this.#gameState = gameState;
    this.#renderer = renderer;
    this.#physicsWorld = world;
    this.#eventQueue = eventQueue;
    this.#physicsDebugger = physicsDebugger;
    this.#appElement = appElement;
    this.#appElement.appendChild(this.#renderer.domElement);
    appElement.focus();
    appElement.style.outline = "none";
    appElement.addEventListener("click", () => {
      appElement.focus();
    });
    const { clientWidth, clientHeight } = appElement;
    this.#camera = new PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 1000);
    this.#userInput = new UserInput(appElement);
    this.#renderResolutionController = new RenderResolutionController({
      maxPixels: 1920 * 1080,
      minPixels: 400 * 600,
      quality: this.#gameState.renderQuality,
      size: { width: clientWidth, height: clientHeight },
    });
    this.#assetLoader = assetLoader;
    this.#commonAssetCache = commonAssetCache;

    this.#commonAudioManager = createAudioManager({
      masterVolume: 1,
      assets: {
        grapple: { file: this.#commonAssetCache.audio.grapple, maxInstances: 5 },
        woodHit: { file: this.#commonAssetCache.audio.woodHit, maxInstances: 5 },
        drop: { file: this.#commonAssetCache.audio.drop },
        playerHit: { file: this.#commonAssetCache.audio.playerHit, maxInstances: 5 },
        blockDrag: { file: this.#commonAssetCache.audio.concreteDrag, loop: true },
        jetpackLoop: {
          file: this.#commonAssetCache.audio.jetpackLoop,
          loop: true,
        },
        jetpackBurst: {
          file: this.#commonAssetCache.audio.jetpackBurst,
          maxInstances: 5,
        },
        footsteps: {
          file: this.#commonAssetCache.audio.footsteps,
          loop: true,
        },
      },
    });

    const walkAnimation = this.#commonAssetCache.gltf.player.animations.find((item) => item.name === "walk");
    if (!walkAnimation) {
      throw new Error("Player walk animation missing");
    }

    this.#player = new Player({
      model: this.#commonAssetCache.gltf.player.scene,
      animations: {
        walk: walkAnimation,
      },
      audio: this.#commonAudioManager,
      physicsWorld: world,
    });
    this.#ticker = new Ticker();
    this.#ticker.add(this.#update);
    this.#ticker.start();

    if (stats) {
      this.#ticker.beforeTick = () => {
        stats.begin();
      };

      this.#ticker.afterTick = () => {
        stats.end();
        stats.update();
      };
    }
  }

  public readonly handleResize = (): void => {
    const { clientWidth, clientHeight } = this.#appElement;
    this.#renderResolutionController.size.width = clientWidth;
    this.#renderResolutionController.size.height = clientHeight;
    this.#renderResolutionController.applyTo(this.#renderer, this.#camera);
  };

  public readonly restartCurrentLevel = (): void => {
    this.#currentLevel?.reset();
  };

  public readonly switchLevel = async ({
    levelName,
    onLoadingProgressChanged,
  }: {
    levelName: GameLevelName;
    onLoadingProgressChanged: (progress: number) => void;
  }): Promise<void> => {
    const assetCache = await this.#assetLoader.loadAssetManifest({
      assetManifest: assetManifest[levelName],
      onProgress: onLoadingProgressChanged,
    });

    this.#currentLevel?.destroy();

    this.#currentLevel = new GameLevel({
      environmentModel: assetCache.gltf.environment.scene,
      audio: this.#commonAudioManager,
      player: this.#player,
      camera: this.#camera,
      physicsEventQueue: this.#eventQueue,
      physicsWorld: this.#physicsWorld,
      userInputState: this.#userInput,
      onReachedGoal: () => {
        this.#gameState.currentScene = "level-complete";
        this.#commonAudioManager.stopAll();
      },
      onPlayerDie: () => {
        this.#gameState.currentScene = "game-over";
      },
    });

    this.#userInput.onJumpPressed = this.#currentLevel.handleJumpPressed;
    this.#userInput.onGrapplePressed = this.#currentLevel.handleGrapplePressed;
    this.#userInput.onGrappleReleasePressed = this.#currentLevel.handleGrappleRelease;
    this.#userInput.onGrappleEscapePressed = this.#currentLevel.handleGrappleEscape;

    this.handleResize();

    this.#currentLevel.reset();

    this.#currentLevel.setShadowMapQuality(this.#gameState.renderQuality);

    if (this.#physicsDebugger) {
      this.#currentLevel.add(this.#physicsDebugger);
    }
  };

  public setRenderQuality = (quality: number): void => {
    this.#gameState.renderQuality = quality;
    this.#renderResolutionController.quality = this.#gameState.renderQuality;
    if (this.#currentLevel) {
      this.#currentLevel.setShadowMapQuality(this.#gameState.renderQuality);
    }
    this.#renderResolutionController.applyTo(this.#renderer, this.#camera);
  };

  #update = (delta: number): void => {
    if (!this.#currentLevel || this.#gameState.currentScene !== "game") return;

    this.#currentLevel.update(delta);
    this.#physicsDebugger?.update(this.#physicsWorld);

    if ("renderAsync" in this.#renderer) {
      void this.#renderer.renderAsync(this.#currentLevel, this.#camera);
    } else {
      this.#renderer.render(this.#currentLevel, this.#camera);
    }
  };
}
