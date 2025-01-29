import { ActiveEvents, CoefficientCombineRule, ColliderDesc, RigidBodyDesc } from "@dimforge/rapier3d-compat";
import type { Collider, RigidBody, World } from "@dimforge/rapier3d-compat";
import { Group, Mesh, Vector3 } from "three";

export type MoveableBlockProps = {
  physicsWorld: World;
  model: Mesh;
  shadows?: boolean;
};

export class MoveableBlock extends Group {
  public readonly rigidBody: RigidBody;
  public readonly collider: Collider;
  readonly #model: Mesh;
  readonly #physicsWorld: World;
  readonly #config = {
    mass: 0.1,
    friction: 0.2,
    restitution: 0,
    linearDamping: 0.3,
    angularDamping: 0.3,
  };
  readonly #startPositon: Vector3;

  public constructor({ physicsWorld, model, shadows = false }: MoveableBlockProps) {
    super();

    this.#physicsWorld = physicsWorld;
    const { x, y, z } = model.position;
    this.#startPositon = new Vector3(x, y + 1, z);
    model.position.set(0, 0, 0);

    const { rigidBody, collider } = this.#createPhysicsBody(physicsWorld, model);
    this.rigidBody = rigidBody;
    this.collider = collider;

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

  public readonly update = (_delta: number): void => {
    const position = this.rigidBody.translation();
    const { x, y, z, w } = this.rigidBody.rotation();

    this.position.set(position.x, position.y, position.z);
    this.quaternion.set(x, y, z, w);
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
    this.rigidBody.setTranslation(this.#startPositon, true);
  };

  #createPhysicsBody(physicsWorld: World, child: Mesh) {
    if (!child.geometry.boundingBox) {
      throw new Error("Movable block does not have bounding box");
    }

    const { min, max } = child.geometry.boundingBox;
    const width = Math.max(0.1, (Math.abs(max.x) + Math.abs(min.x)) * child.scale.x * 0.5 - 0.2);

    const { x, y, z } = this.#startPositon;
    const rigidBodyDesc = RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setRotation(child.quaternion)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, true)
      .setLinearDamping(this.#config.linearDamping)
      .setAngularDamping(this.#config.angularDamping)
      .setUserData({
        name: "MoveableBlock",
      });

    const colliderDesc = ColliderDesc.cuboid(width, width, width)
      .setRestitution(this.#config.restitution)
      .setFriction(this.#config.friction)
      .setDensity(0.5)
      .setContactSkin(0.2)
      .setFrictionCombineRule(CoefficientCombineRule.Min)
      .setRestitutionCombineRule(CoefficientCombineRule.Min)
      .setActiveEvents(ActiveEvents.COLLISION_EVENTS)
      .setActiveEvents(ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(300);

    const rigidBody = physicsWorld.createRigidBody(rigidBodyDesc);
    const collider = physicsWorld.createCollider(colliderDesc, rigidBody);

    return {
      collider,
      rigidBody,
    };
  }
}
