import type { ImpulseJoint, RigidBody, Vector, World } from "@dimforge/rapier3d-compat";
import { CylinderGeometry, Group, Mesh, MeshLambertMaterial, Object3D, Vector3, type ColorRepresentation } from "three";

import { JointData } from "@dimforge/rapier3d-compat";
import { lerp } from "three/src/math/MathUtils.js";

export type PhysicsObject = Object3D & { rigidBody: RigidBody };

export type SpringProps = {
  parent: RigidBody;
  child: RigidBody;
  physicsWorld: World;
  length?: number;
  stiffness?: number;
  colour?: ColorRepresentation;
  randomOriginOffset?: number;
  parentHitPoint?: Vector;
  childHitPoint?: Vector;
};

export class Spring extends Group {
  readonly #cylinderMesh: Mesh;
  readonly #parentObject = new Object3D();
  readonly #childPositionVector = new Vector3();
  readonly #joint: ImpulseJoint;
  readonly #physicsWorld: World;
  readonly #randomOriginOffset: number;
  readonly #parentHitPoint: Vector;
  readonly #childHitPoint: Vector;
  #stiffness: number;
  #age: number = 0;

  public constructor({
    parent,
    child,
    length = 1,
    stiffness = 3,
    colour = 0xffffff,
    physicsWorld,
    randomOriginOffset = 0,
    parentHitPoint = { x: 0, y: 0, z: 0 },
    childHitPoint = { x: 0, y: 0, z: 0 },
  }: SpringProps) {
    super();
    this.#physicsWorld = physicsWorld;
    this.#randomOriginOffset = randomOriginOffset;
    this.#parentHitPoint = parentHitPoint;
    this.#childHitPoint = childHitPoint;
    this.#stiffness = stiffness;

    const springDescription = JointData.spring(length, stiffness, 0.2, parentHitPoint, childHitPoint);
    this.#joint = this.#physicsWorld.createImpulseJoint(springDescription, parent, child, true);

    const parentPosition = parent.translation();
    const childPosition = child.translation();

    const tubeGeometry = new CylinderGeometry(0.05, 0.05, 1, 5);
    const material = new MeshLambertMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.5 });
    this.#cylinderMesh = new Mesh(tubeGeometry, material);
    this.#cylinderMesh.position.y = 0.5;
    this.#parentObject.add(this.#cylinderMesh);

    this.#parentObject.position.set(
      parentPosition.x + this.#parentHitPoint.x + this.#randomOriginOffset,
      parentPosition.y + this.#parentHitPoint.y + this.#randomOriginOffset,
      parentPosition.z + this.#parentHitPoint.z
    );
    this.#childPositionVector.set(
      childPosition.x + this.#childHitPoint.x,
      childPosition.y + this.#childHitPoint.y,
      childPosition.z + this.#childHitPoint.z
    );
    this.#parentObject.lookAt(this.#childPositionVector);
    this.#parentObject.rotateX(Math.PI * 0.5);

    this.add(this.#parentObject);
  }

  public readonly update = (delta: number): void => {
    const parentPosition = this.#joint.body1().translation();

    const childPosition = this.#joint.body2().translation();

    this.#parentObject.position.set(
      parentPosition.x + this.#parentHitPoint.x + this.#randomOriginOffset,
      parentPosition.y + this.#parentHitPoint.y + this.#randomOriginOffset,
      parentPosition.z + this.#parentHitPoint.z
    );
    this.#childPositionVector.set(
      childPosition.x + this.#childHitPoint.x,
      childPosition.y + this.#childHitPoint.y,
      childPosition.z + this.#childHitPoint.z
    );
    this.#parentObject.lookAt(this.#childPositionVector);
    this.#parentObject.rotateX(Math.PI * 0.5);
    this.#age = Math.min(this.#age + delta * 10, 1);

    this.#parentObject.scale.y = lerp(
      this.#parentObject.scale.y,
      this.#parentObject.position.distanceTo(this.#childPositionVector),
      this.#age
    );

    const zScale = Math.min(
      Math.max(0.4, 1 - this.#parentObject.position.distanceTo(this.#childPositionVector) * 0.1),
      1
    );
    this.#parentObject.scale.z = zScale;
  };

  public get parentRigidBody(): RigidBody {
    return this.#joint.body1();
  }

  public get childRigidBody(): RigidBody {
    return this.#joint.body2();
  }

  public get childHitPoint(): Vector {
    return this.#childHitPoint;
  }

  public get parentHitPoint(): Vector {
    return this.#parentHitPoint;
  }

  public get stiffness(): number {
    return this.#stiffness;
  }

  /**
   * Removes the joint from the physics world
   */
  public readonly destroy = (): void => {
    this.#physicsWorld.removeImpulseJoint(this.#joint, true);
  };
}
