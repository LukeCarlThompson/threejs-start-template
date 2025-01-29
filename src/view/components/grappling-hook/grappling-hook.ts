import type { RigidBody, World } from "@dimforge/rapier3d-compat";

import { Group } from "three";
import { Ray } from "@dimforge/rapier3d-compat";
import { Spring } from "..";

export type GrapplingHookProps = {
  physicsWorld: World;
};

export type GrappleProps = {
  from: RigidBody;
  directionVector: { x: number; y: number };
};

export class GrapplingHook extends Group {
  public grappleRange: number = 9;
  public maxInstances: number = 4;
  readonly #physicsWorld: World;
  readonly #springs: Set<Spring> = new Set<Spring>();
  readonly #ray: Ray = new Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });

  public constructor({ physicsWorld }: GrapplingHookProps) {
    super();
    this.#physicsWorld = physicsWorld;
  }

  public grapple = ({ from, directionVector }: GrappleProps): boolean => {
    const fromVector = from.translation();
    this.#ray.origin.x = fromVector.x;
    this.#ray.origin.y = fromVector.y;
    this.#ray.origin.z = fromVector.z;

    this.#ray.dir.x = directionVector.x;
    this.#ray.dir.y = directionVector.y;
    this.#ray.dir.z = 0;

    const colliderToIgnore = from.collider(0);

    const rayHit = this.#physicsWorld.castRay(
      this.#ray,
      this.grappleRange,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      (collider) => {
        return !collider.isSensor() && collider !== colliderToIgnore;
      }
    );

    if (!rayHit) return false;

    const rigidBody = rayHit.collider.parent();
    if (!rigidBody) return false;

    if (this.#springs.size === this.maxInstances) {
      this.release("first");
    }

    const hitPoint = this.#ray.pointAt(rayHit.timeOfImpact);

    const hitTerrain = rigidBody.isFixed();
    const objectMass = rigidBody.mass();
    const stiffness = hitTerrain ? 10 : Math.min(objectMass * 20 + 0.1, 10);

    const newSpring = new Spring({
      parent: from,
      child: rigidBody,
      physicsWorld: this.#physicsWorld,
      stiffness,
      length: 1,
      randomOriginOffset: Math.random() * 0.4 - 0.2,
      childHitPoint: hitTerrain ? hitPoint : undefined,
    });

    this.#springs.add(newSpring);
    this.add(newSpring);

    return true;
  };

  public release = (order: "first" | "last" = "last"): void => {
    let springToRelease: Spring | undefined;
    this.#springs.forEach((spring) => {
      if (order === "first" && springToRelease) return;
      springToRelease = spring;
    });

    if (springToRelease) {
      this.#springs.delete(springToRelease);
      this.remove(springToRelease);
      springToRelease.destroy();
    }
  };

  public escape = (from: RigidBody): void => {
    let lastSpring: Spring | undefined = undefined;

    const newSprings: Spring[] = [];

    this.#springs.forEach((spring) => {
      if (spring.parentRigidBody !== from) {
        newSprings.push(spring);
        this.#springs.delete(spring);
        return;
      }

      if (lastSpring === undefined) {
        lastSpring = spring;
        return;
      }

      if (spring.childRigidBody === lastSpring.childRigidBody) {
        return;
      }

      const newSpring = new Spring({
        parent: spring.childRigidBody,
        parentHitPoint: spring.childHitPoint,
        child: lastSpring.childRigidBody,
        childHitPoint: lastSpring.childHitPoint,
        physicsWorld: this.#physicsWorld,
        stiffness: (spring.stiffness + lastSpring.stiffness) * 0.5,
        length: 1,
      });

      newSprings.push(newSpring);

      lastSpring = undefined;
    });

    // Delete the old springs
    this.#springs.forEach((spring) => {
      this.remove(spring);
      spring.destroy();
    });
    this.#springs.clear();

    // Add the new springs to the scene
    newSprings.forEach((spring) => {
      this.#springs.add(spring);
      this.add(spring);
    });
  };

  public readonly reset = (): void => {
    this.#springs.forEach((spring) => {
      this.#springs.delete(spring);
      this.remove(spring);
      spring.destroy();
    });
    this.#springs.clear();
  };

  public update = (delta: number): void => {
    this.#springs.forEach((spring) => {
      spring.update(delta);
    });
  };
}
