import { ActiveEvents, CoefficientCombineRule, ColliderDesc, Ray, RigidBodyDesc } from "@dimforge/rapier3d-compat";
import type { Collider, RayColliderHit, RigidBody, World } from "@dimforge/rapier3d-compat";
import { Group, Mesh, Vector3 } from "three";
import { damp, degToRad } from "three/src/math/MathUtils.js";

import type { Object3D } from "three";

export type EnemyProps = {
  physicsWorld: World;
  model: Object3D;
  shadows?: boolean;
};

export class Enemy extends Group {
  public readonly rigidBody: RigidBody;
  public readonly collider: Collider;
  public readonly impulse = new Vector3();
  readonly #model: Object3D;
  readonly #rayRight: Ray;
  readonly #rayLeft: Ray;
  readonly #physicsWorld: World;
  readonly #startPositon: Vector3;
  readonly #config = {
    mass: 0.5,
    friction: 0.1,
    horizontalMovementForce: 2.5,
  };
  readonly #state: {
    direction: "left" | "right";
  } = {
    direction: "right",
  };

  public constructor({ physicsWorld, model, shadows = false }: EnemyProps) {
    super();

    this.#physicsWorld = physicsWorld;
    const { x, y, z } = model.position;
    this.#startPositon = new Vector3(x, y, z);
    this.position.set(x, y, z);
    model.position.set(0, 0, 0);

    this.#rayRight = new Ray(this.position, { x: 1, y: 0, z: 0 });
    this.#rayLeft = new Ray(this.position, { x: -1, y: 0, z: 0 });

    const { rigidBody, collider } = this.#createPhysicsBody(physicsWorld);
    this.rigidBody = rigidBody;
    this.collider = collider;
    model.position.set(0, 0, 0);

    model.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = shadows;
        child.receiveShadow = shadows;

        return;
      }
    });

    model.castShadow = shadows;
    model.receiveShadow = shadows;
    this.#model = model;

    this.add(this.#model);
  }

  public readonly hitLeft = (): RayColliderHit | null => {
    const hitLeft = this.#physicsWorld.castRay(
      this.#rayLeft,
      0.45,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        return !collider.isSensor() && collider !== this.collider;
      }
    );
    return hitLeft;
  };

  public readonly hitRight = (): RayColliderHit | null => {
    const hitRight = this.#physicsWorld.castRay(
      this.#rayRight,
      0.45,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        return !collider.isSensor() && collider !== this.collider;
      }
    );
    return hitRight;
  };

  public readonly update = (delta: number): void => {
    const position = this.rigidBody.translation();
    const velocity = this.rigidBody.linvel();

    this.position.set(position.x, position.y, position.z);

    if (this.hitLeft()) {
      this.#state.direction = "right";
    } else if (this.hitRight()) {
      this.#state.direction = "left";
    }

    this.impulse.x =
      this.#state.direction === "right"
        ? this.#config.horizontalMovementForce
        : this.#config.horizontalMovementForce * -1;

    this.impulse.multiplyScalar(delta);

    this.rigidBody.applyImpulse(this.impulse, true);

    const rotation = velocity.x > 0 ? 70 : -70;
    this.#model.rotation.y = damp(this.#model.rotation.y, degToRad(rotation), 10, delta);

    const tilt = velocity.x > 0 ? -0.2 : 0.2;
    this.rotation.z = damp(this.rotation.z, tilt + velocity.x * 0.05, 10, delta);
  };

  /**
   * Removes the collider and rigid body from the physics world
   */
  public readonly destroy = (): void => {
    this.#physicsWorld.removeCollider(this.collider, false);
    this.#physicsWorld.removeRigidBody(this.rigidBody);
  };

  /**
   * Sets the object back to it's starting state
   */
  public readonly reset = (): void => {
    this.rigidBody.setTranslation(this.#startPositon, false);
  };

  #createPhysicsBody(physicsWorld: World) {
    const rigidBodyDesc = RigidBodyDesc.dynamic()
      .setTranslation(this.position.x, this.position.y, this.position.z)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, false)
      .setLinearDamping(0.2)
      .setAngularDamping(0)
      .setUserData({
        name: "Enemy",
      });
    const rigidBody = physicsWorld.createRigidBody(rigidBodyDesc);
    const colliderDesc = ColliderDesc.ball(0.2)
      .setRestitution(0)
      .setDensity(0)
      .setContactSkin(0.2)
      .setFriction(this.#config.friction)
      .setMass(this.#config.mass)
      .setFrictionCombineRule(CoefficientCombineRule.Min)
      .setRestitutionCombineRule(CoefficientCombineRule.Min)
      .setActiveEvents(ActiveEvents.COLLISION_EVENTS);
    const collider = physicsWorld.createCollider(colliderDesc, rigidBody);

    return {
      collider,
      rigidBody,
    };
  }
}
