import type { TempContactForceEvent } from "@dimforge/rapier3d-compat";
import { type Collider, type EventQueue, type World } from "@dimforge/rapier3d-compat";
import type { Object3D, PerspectiveCamera, PointLight, SpotLight } from "three";
import { HemisphereLight, Scene, Vector3 } from "three";
import { GrapplingHook } from "./components";

import { damp } from "three/src/math/MathUtils.js";
import type { AudioControls } from "../audio-manager";
import { cameraFollowBehaviour } from "./camera-follow-behaviour";
import type { Enemy, MoveableBlock, Player } from "./components";
import { parseLevelModel } from "./parse-level-model";

export type AudioAssetName = "grapple" | "woodHit" | "drop" | "playerHit" | "blockDrag";

export type GameLevelAudio = {
  play: (name: AudioAssetName) => AudioControls;
  stop: (name: AudioAssetName) => void;
  stopAll: () => void;
};

export type GameLevelProps = {
  environmentModel: Object3D;
  audio: GameLevelAudio;
  player: Player;
  camera: PerspectiveCamera;
  physicsWorld: World;
  physicsEventQueue: EventQueue;
  userInputState: UserInputState;
  onReachedGoal: () => void;
  onPlayerDie: () => void;
};

export type UserInputEvent = "jump-pressed" | "grapple-pressed" | "grapple-release-pressed" | "grapple-escape-pressed";

export type UserInputState = {
  get up(): boolean;
  get down(): boolean;
  get left(): boolean;
  get right(): boolean;
  get boost(): boolean;
  get lookVector(): {
    x: number;
    y: number;
  };
};

type CollisionEvent = "player-hit-enemy" | "player-hit-goal" | "player-hit-danger";
type ContactForceEvent = "player" | "moveable-block";

export type GameLevelConfig = {
  cameraFollowDistance: number;
  cameraVerticalOffset: number;
  renderDistance: number;
  cameraFov: number;
  shadows: boolean;
};

export class GameLevel extends Scene {
  #camera: PerspectiveCamera;
  #player: Player;
  #audio: GameLevelAudio;
  #grapplingHook: GrapplingHook;
  #physicsWorld: World;
  #eventQueue: EventQueue;
  #config: GameLevelConfig;
  #terrainColliders: Collider[];
  #dangerSensors: Collider[];
  #enemies: Enemy[] = [];
  #moveableBlocks: MoveableBlock[];
  #goalSensors: Collider[];
  #light?: SpotLight | PointLight;
  #skyGlow?: Object3D;
  #userInputState: UserInputState;
  #onReachedGoal: () => void;
  #onPlayerDie: () => void;

  public constructor({
    environmentModel,
    audio,
    player,
    camera,
    physicsWorld,
    physicsEventQueue,
    userInputState,
    onReachedGoal,
    onPlayerDie,
  }: GameLevelProps) {
    super();
    const cameraFollowDistance = 45;
    this.#config = {
      cameraFollowDistance,
      cameraVerticalOffset: 1,
      renderDistance: cameraFollowDistance + 50,
      cameraFov: 20,
      shadows: false,
    };

    this.#player = player;
    this.#userInputState = userInputState;
    this.#grapplingHook = new GrapplingHook({ physicsWorld });
    this.#onReachedGoal = onReachedGoal;
    this.#onPlayerDie = onPlayerDie;
    this.#audio = audio;

    this.#physicsWorld = physicsWorld;
    this.#eventQueue = physicsEventQueue;

    this.#camera = camera;
    this.#camera.far = this.#config.renderDistance;
    this.#camera.fov = this.#config.cameraFov;
    this.#camera.position.set(0, 3, this.#config.cameraFollowDistance);

    const {
      fog,
      skyGlow,
      goalSensors,
      dangerSensors,
      terrainColliders,
      objectsToAddToToScene,
      enemies,
      moveableBlocks,
    } = parseLevelModel({ model: environmentModel, physicsWorld: this.#physicsWorld, config: this.#config });

    this.fog = fog;
    this.background = fog.color;
    this.#skyGlow = skyGlow;
    this.#goalSensors = goalSensors;
    this.#dangerSensors = dangerSensors;
    this.#enemies = enemies;
    this.#moveableBlocks = moveableBlocks;
    this.#terrainColliders = terrainColliders;

    const hemisphereLight = new HemisphereLight(undefined, undefined, 0.3);

    this.add(...objectsToAddToToScene, this.#grapplingHook, this.#player, hemisphereLight);
  }

  public readonly setShadowMapQuality = (quality: number): void => {
    // TODO: Remove this if it isn't being used
    if (!this.#light || !this.#config.shadows) return;
    const multiplier = (quality * 0.9 + 10) * 0.01;
    const shadowMapDimension = Math.round(2048 * multiplier);
    this.#light.shadow.mapSize.set(shadowMapDimension, shadowMapDimension);
    this.#light.shadow.map?.setSize(shadowMapDimension, shadowMapDimension);
  };

  public readonly handleJumpPressed = (): void => {
    this.#player.jump();
  };

  public readonly handleGrapplePressed = ({ width, height }: { width: number; height: number }): void => {
    const { x, y } = this.#userInputState.lookVector;
    // TODO: Cache this vector object
    let pos = new Vector3();
    pos = pos.setFromMatrixPosition(this.#player.matrixWorld);
    pos.project(this.#camera);

    const widthHalf = width / 2;
    const heightHalf = height / 2;

    pos.x = pos.x * widthHalf + widthHalf;
    pos.y = -(pos.y * heightHalf) + heightHalf;
    pos.z = 0;

    pos.x = x - pos.x;
    pos.y = pos.y - y;

    pos.normalize();

    const didGrapple = this.#grapplingHook.grapple({ from: this.#player.rigidBody, directionVector: pos });

    if (!didGrapple) return;
    const grappleAudioControl = this.#audio.play("grapple");
    grappleAudioControl.setVolume(0.7);
    grappleAudioControl.setDetune(Math.random() * 1000);
    grappleAudioControl.setPlaybackRate(0.75 + Math.random() * 0.5);
  };

  public readonly handleGrappleRelease = (): void => {
    this.#grapplingHook.release();
  };

  public readonly handleGrappleEscape = (): void => {
    this.#grapplingHook.escape(this.#player.rigidBody);
  };

  public readonly reset = (): void => {
    const vector3 = { x: 0, y: 1, z: 0 };
    this.#player.rigidBody.setTranslation(vector3, true);
    this.#player.rigidBody.setLinvel(vector3, true);
    this.#enemies.forEach((enemy) => {
      enemy.reset();
    });
    this.#moveableBlocks.forEach((block) => {
      block.reset();
    });
    this.#grapplingHook.reset();
  };

  /**
   * Removes any assets unique to this scene from memory.
   * Removes any physics objects unique to this scene.
   */
  public readonly destroy = (): void => {
    this.remove(this.#player);
    this.remove(this.#grapplingHook);
    this.#grapplingHook.reset();

    this.#audio.stop("grapple");
    this.#audio.stop("woodHit");
    this.#audio.stop("drop");
    this.#audio.stop("playerHit");
    this.#audio.stop("blockDrag");

    this.#terrainColliders.forEach((collider) => {
      const rigidBody = collider.parent();
      if (rigidBody) {
        this.#physicsWorld.removeRigidBody(rigidBody);
      }
      this.#physicsWorld.removeCollider(collider, false);
    });
    this.#dangerSensors.forEach((collider) => {
      this.#physicsWorld.removeCollider(collider, false);
    });
    this.#enemies.forEach((enemy) => {
      enemy.destroy();
    });
    this.#moveableBlocks.forEach((block) => {
      block.destroy();
    });
  };

  public update = (delta: number): void => {
    this.#physicsWorld.timestep = delta;
    this.#physicsWorld.step(this.#eventQueue);

    this.#player.update(delta);
    this.#enemies.forEach((enemy) => {
      enemy.update(delta);
    });
    this.#moveableBlocks.forEach((block) => {
      block.update(delta);
    });
    this.#grapplingHook.update(delta);

    if (this.#userInputState.left) {
      this.#player.moveLeft();
    }
    if (this.#userInputState.right) {
      this.#player.moveRight();
    }
    if (this.#userInputState.boost) {
      this.#player.boost();
    }

    cameraFollowBehaviour(
      this.#camera.position,
      this.#player.position,
      this.#config.cameraVerticalOffset,
      this.#config.cameraFollowDistance,
      delta
    );

    if (this.#skyGlow) {
      this.#skyGlow.position.set(this.#camera.position.x, this.#camera.position.y + 15, -60);
    }

    this.#processContactPairs(delta);

    this.#eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const eventName = this.#processCollisionEvent(started, handle1, handle2);

      switch (eventName) {
        case "player-hit-danger":
          this.#onPlayerDie();
          break;
        case "player-hit-enemy":
          // this.#onPlayerDie();
          break;
        case "player-hit-goal":
          this.#onReachedGoal();
          break;
      }
    });

    this.#eventQueue.drainContactForceEvents((event) => {
      const eventName = this.#processContactForceEvent(event);
      switch (eventName) {
        case "player": {
          const playerHitAudioControls = this.#audio.play("playerHit");
          const volume = Math.min(event.totalForceMagnitude() * 0.0003, 1);
          playerHitAudioControls.setVolume(volume);
          break;
        }
        case "moveable-block": {
          const woodHitControls = this.#audio.play("woodHit");
          const volume = Math.min(event.maxForceMagnitude() * 0.002, 1);
          woodHitControls.setVolume(volume);
          break;
        }
      }
    });
  };

  #processContactPairs = (delta: number): void => {
    const dragAudioControls = this.#audio.play("blockDrag");
    let dragAudioTargetVolume = 0;

    this.#terrainColliders.forEach((terrainCollider) => {
      this.#moveableBlocks.forEach((block) => {
        this.#physicsWorld.contactPair(terrainCollider, block.collider, () => {
          const dragVelocity = Math.abs(block.rigidBody.linvel().x);
          if (dragVelocity > 0.1) {
            dragAudioTargetVolume = Math.min(dragVelocity * 0.1, 1);
          }
        });
      });
    });

    const dragAudioDampedVolume = damp(dragAudioControls.getVolume(), dragAudioTargetVolume, 20, delta);
    if (dragAudioDampedVolume > 0) {
      dragAudioControls.setVolume(dragAudioDampedVolume);
    } else {
      dragAudioControls.stop();
    }
  };

  #processContactForceEvent = (event: TempContactForceEvent): ContactForceEvent | undefined => {
    const handle1 = event.collider1();
    const handle2 = event.collider2();

    const player = handle1 === this.#player.rigidBody.handle || handle2 === this.#player.rigidBody.handle;

    const moveableBlock = this.#moveableBlocks.find(
      (block) => block.collider.handle === handle1 || block.collider.handle === handle2
    );

    if (player) {
      return "player";
    }
    if (moveableBlock) {
      return "moveable-block";
    }

    return;
  };

  #processCollisionEvent = (started: boolean, handle1: number, handle2: number): CollisionEvent | undefined => {
    const goal = !!this.#goalSensors.find((sensor) => sensor.handle === handle1 || sensor.handle === handle2);

    const danger: boolean = !!this.#dangerSensors.find((sensor) => {
      return sensor.handle === handle1 || sensor.handle === handle2;
    });

    const player = handle1 === this.#player.rigidBody.handle || handle2 === this.#player.rigidBody.handle;

    const enemy = !!this.#enemies.find((enemy) => {
      return enemy.collider.handle === handle1 || enemy.collider.handle === handle2;
    });

    const playerHitGoal = started && goal && player;
    const playerHitEnemy = started && player && enemy;
    const playerHitDanger = started && player && danger;

    if (playerHitGoal) {
      return "player-hit-goal";
    }
    if (playerHitEnemy) {
      return "player-hit-enemy";
    }
    if (playerHitDanger) {
      return "player-hit-danger";
    }
  };
}
