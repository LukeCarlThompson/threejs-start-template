import type { Collider, RayColliderHit, RigidBody, World } from "@dimforge/rapier3d-compat";
import { ActiveEvents, CoefficientCombineRule, ColliderDesc, Ray, RigidBodyDesc } from "@dimforge/rapier3d-compat";
import type { AnimationAction, AnimationClip, Object3D } from "three";
import {
  AnimationMixer,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  SphereGeometry,
  Vector3,
} from "three";
import { damp, degToRad } from "three/src/math/MathUtils.js";

import type { AudioControls } from "../../../audio-manager";
import { FakeGlowMaterial } from "../../materials";

export type PlayerAudioAssetName = "jetpackBurst" | "jetpackLoop" | "footsteps";

export type PlayerAudio = {
  play: (name: PlayerAudioAssetName) => AudioControls;
  stop: (name: PlayerAudioAssetName) => void;
  stopAll: () => void;
};

export type PlayerProps = {
  physicsWorld: World;
  model: Object3D;
  animations: {
    walk: AnimationClip;
  };
  audio: PlayerAudio;
  shadows?: boolean;
};

export class Player extends Group {
  public readonly rigidBody: RigidBody;
  public readonly collider: Collider;
  public readonly proximitySensor: Collider;
  public readonly impulse = new Vector3();
  readonly #model: Object3D;
  readonly #audio: PlayerAudio;
  readonly #animationMixer: AnimationMixer;
  readonly #actions: {
    walk: AnimationAction;
  };
  readonly #boostIndicator: Object3D;
  readonly #ray: Ray;
  readonly #physicsWorld: World;
  readonly #config = {
    playerMass: 5,
    playerFriction: 0.25,
    playerVelocityLimit: 10,
    horizontalMovementForce: 100,
    jumpForce: 40,
    wallJumpForce: 15,
    wallJumpHorizontalForce: 35,
    boost: {
      force: 110,
      capacity: 7000,
      usageRate: 10000,
      regenerationRate: 10000,
    },
  };
  readonly #state: {
    boostRemaining: number;
    direction: "left" | "right";
    isBoosting: boolean;
    hitLeft: boolean;
    hitRight: boolean;
    hitDown: boolean;
  } = {
    boostRemaining: 10000,
    direction: "right",
    isBoosting: false,
    hitLeft: false,
    hitRight: false,
    hitDown: false,
  };

  public constructor({ physicsWorld, model, animations, audio, shadows = false }: PlayerProps) {
    super();

    this.#physicsWorld = physicsWorld;
    this.#ray = new Ray(this.position, { x: 0, y: 0, z: 0 });
    this.#audio = audio;

    const { rigidBody, collider } = this.#createPhysicsBody(physicsWorld);
    this.rigidBody = rigidBody;
    this.collider = collider;

    this.#animationMixer = new AnimationMixer(model);

    this.#actions = {
      walk: this.#animationMixer.clipAction(animations.walk),
    };

    const pointLight = new PointLight(0xffffff, 10, 20, 1);

    this.proximitySensor = this.#createProximitySensor(physicsWorld);

    model.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = shadows;
        child.receiveShadow = shadows;

        return;
      }
    });

    model.castShadow = shadows;
    model.receiveShadow = shadows;
    model.position.set(0, -0.45, 0);
    this.#model = model;

    // Boost indicator
    const geometry = new BoxGeometry(0.2, 0.5, 0.2);
    const material = new MeshBasicMaterial({ color: 0xffffff });
    const glowGeometry = new SphereGeometry(5, 8, 8);
    const glowMaterial = new FakeGlowMaterial({
      depthTest: true,
      glowColor: new Color(0xffffff),
      falloff: 0.3,
      glowInternalRadius: 30,
      glowSharpness: 1,
      opacity: 0.9,
      side: 0,
    });

    const glow = new Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, -0.1, 0);
    glow.castShadow = false;
    glow.receiveShadow = false;

    this.#boostIndicator = new Mesh(geometry, material);
    this.#boostIndicator.castShadow = false;
    this.#boostIndicator.receiveShadow = false;
    this.#boostIndicator.position.set(0, 0.3, -0.4);
    this.#boostIndicator.add(glow);

    this.#model.add(this.#boostIndicator);
    this.add(this.#model, pointLight);
  }

  public readonly jump = (): void => {
    const { hitLeft, hitRight, hitDown } = this.#state;
    this.#audio.play("jetpackBurst");

    // const horizontalForce = hitDown
    //   ? 0
    //   : hitRight
    //   ? this.#config.wallJumpHorizontalForce * -1
    //   : hitLeft
    //   ? this.#config.wallJumpHorizontalForce
    //   : 0;
    const horizontalForce = 0;

    const wallJump = !hitDown && (hitRight || hitLeft);
    const verticalForce = hitDown ? this.#config.jumpForce : wallJump ? this.#config.wallJumpForce : 0;

    this.rigidBody.applyImpulse({ x: horizontalForce, y: verticalForce, z: 0 }, true);
  };

  public readonly boost = (): void => {
    this.#state.isBoosting = true;
  };

  public readonly moveLeft = (): void => {
    this.impulse.x += this.#config.horizontalMovementForce * -1;
    this.#state.direction = "left";
  };

  public readonly moveRight = (): void => {
    this.impulse.x += this.#config.horizontalMovementForce;
    this.#state.direction = "right";
  };

  readonly #rayCast = (direction: "up" | "down" | "left" | "right", rayLength: number): RayColliderHit | null => {
    this.#ray.dir.x = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    this.#ray.dir.y = direction === "down" ? -1 : direction === "up" ? 1 : 0;
    this.#ray.dir.z = 0;

    const rayHit = this.#physicsWorld.castRay(
      this.#ray,
      rayLength,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        return !collider.isSensor() && collider !== this.collider;
      }
    );
    return rayHit;
  };

  public readonly update = (delta: number): void => {
    this.#animationMixer.update(delta);
    this.#syncWithPhysics();
    this.#updateHitState();
    this.#boostLogic(delta);

    if (this.impulse.x || this.impulse.y) {
      this.impulse.multiplyScalar(delta);
      this.rigidBody.applyImpulse(this.impulse, true);
    }

    const velocity = this.rigidBody.linvel();
    const absoluteVelocityX = Math.abs(velocity.x);

    let walkTimeScale = 0;
    let walkAudioSpeed = 0;
    const footStepsAudioControls = this.#audio.play("footsteps");
    if (this.#state.hitDown && absoluteVelocityX > 0) {
      this.#actions.walk.play();
      walkTimeScale = absoluteVelocityX * 0.8;
      walkAudioSpeed = walkTimeScale;
    } else if (!this.#state.hitDown) {
      footStepsAudioControls.stop();
      walkAudioSpeed = 0;
      walkTimeScale = Math.min(absoluteVelocityX * 0.1, 0.2);
    } else {
      footStepsAudioControls.stop();
      walkAudioSpeed = 0;
      walkTimeScale = 0;
    }
    this.#actions.walk.timeScale = damp(this.#actions.walk.timeScale, walkTimeScale, 10, delta);
    footStepsAudioControls.setPlaybackRate(walkAudioSpeed);

    // const hasHorizontalImpulse = Math.abs(this.impulse.x);

    if (absoluteVelocityX > this.#config.playerVelocityLimit) {
      velocity.x = velocity.x * 0.9;
      this.rigidBody.setLinvel(velocity, true);
    }

    // Wall sticking logic
    // TODO: Make this an ability that can be turned on and off
    // if (!this.#state.hitDown && hasHorizontalImpulse && (this.#state.hitLeft || this.#state.hitRight)) {
    //   this.collider.setFrictionCombineRule(CoefficientCombineRule.Max);
    // } else {
    //   this.collider.setFrictionCombineRule(CoefficientCombineRule.Min);
    // }

    // Player model tilt behaviour
    const rotation = this.#state.direction === "left" ? -70 : 70;
    this.#model.rotation.y = damp(this.#model.rotation.y, degToRad(rotation), 10, delta);

    const tilt = this.#state.direction === "left" ? 0.1 : -0.1;
    this.rotation.z = damp(this.rotation.z, tilt + velocity.x * -0.03, 10, delta);

    this.#resetImpulse();
  };

  #boostLogic = (delta: number): void => {
    const isBoosting = this.#state.isBoosting;
    const boostFull = this.#state.boostRemaining === this.#config.boost.capacity;
    const boostEmpty = this.#state.boostRemaining === 0;
    const boostPercentRemaining = this.#state.boostRemaining / this.#config.boost.capacity;

    const jetpackLoopAudioControls = this.#audio.play("jetpackLoop");
    if (isBoosting && !boostEmpty) {
      this.impulse.y += this.#config.boost.force;
      this.#state.boostRemaining = Math.max(this.#state.boostRemaining - this.#config.boost.usageRate * delta, 0);
    }

    if (!isBoosting) {
      this.#state.boostRemaining = Math.min(
        this.#state.boostRemaining + this.#config.boost.regenerationRate * delta,
        this.#config.boost.capacity
      );
    }

    const boostIndicatorScale = boostFull && isBoosting ? 5 : boostFull ? 0.5 : isBoosting ? boostPercentRemaining : 0;
    const dampedBoostIndicatorScale = damp(this.#boostIndicator.scale.x, boostIndicatorScale, 10, delta);
    const boostVolume = !boostEmpty && isBoosting ? 1 : 0;
    const dampedBoostVolume = damp(jetpackLoopAudioControls.getVolume(), boostVolume, 20, delta);
    jetpackLoopAudioControls.setVolume(dampedBoostVolume);

    if (dampedBoostVolume < 0.01) {
      jetpackLoopAudioControls.stop();
    }

    this.#boostIndicator.scale.x = dampedBoostIndicatorScale;
    this.#boostIndicator.scale.z = dampedBoostIndicatorScale;
    this.#boostIndicator.scale.y = boostFull && !this.#state.isBoosting ? 0.5 : 1;
    this.#state.isBoosting = false;
  };

  #updateHitState = (): void => {
    this.#state.hitDown = this.#rayCast("down", 0.6) !== null;
    this.#state.hitLeft = this.#rayCast("left", 0.6) !== null;
    this.#state.hitRight = this.#rayCast("right", 0.6) !== null;
  };

  #resetImpulse = (): void => {
    this.impulse.x = 0;
    this.impulse.y = 0;
    this.impulse.z = 0;
  };

  #syncWithPhysics() {
    const position = this.rigidBody.translation();
    this.proximitySensor.setTranslation(position);
    this.position.set(position.x, position.y, position.z);
  }

  #createPhysicsBody(physicsWorld: World) {
    const rigidBodyDesc = RigidBodyDesc.dynamic()
      .setTranslation(this.position.x, this.position.y, this.position.z)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, false)
      .setCcdEnabled(false)
      .setLinearDamping(1)
      .setAngularDamping(0)
      .setUserData({
        name: "Player",
      });
    const rigidBody = physicsWorld.createRigidBody(rigidBodyDesc);
    const colliderDesc = ColliderDesc.ball(0.2)
      .setRestitution(0)
      .setDensity(0)
      .setFriction(this.#config.playerFriction)
      .setMass(this.#config.playerMass)
      .setContactSkin(0.2)
      .setFrictionCombineRule(CoefficientCombineRule.Min)
      .setRestitutionCombineRule(CoefficientCombineRule.Min)
      .setActiveEvents(ActiveEvents.COLLISION_EVENTS)
      .setActiveEvents(ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(300);
    const collider = physicsWorld.createCollider(colliderDesc, rigidBody);

    return {
      collider,
      rigidBody,
    };
  }

  #createProximitySensor(physicsWorld: World) {
    const proximityColliderDesc = ColliderDesc.ball(2)
      .setActiveEvents(ActiveEvents.COLLISION_EVENTS)
      .setSensor(true)
      .setTranslation(this.position.x, this.position.y, this.position.z);
    return physicsWorld.createCollider(proximityColliderDesc);
  }
}
