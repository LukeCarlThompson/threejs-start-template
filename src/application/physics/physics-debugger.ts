import { BufferAttribute, LineBasicMaterial, LineSegments } from "three";

import type { World } from "@dimforge/rapier3d-compat";

export class PhysicsDebugger extends LineSegments {
  public constructor() {
    super();
    this.material = new LineBasicMaterial({ vertexColors: true });
  }

  public readonly update = (physicsWorld: World): void => {
    const buffers = physicsWorld.debugRender();
    const vertices = new BufferAttribute(buffers.vertices, 3);
    const colors = new BufferAttribute(buffers.colors, 4);

    this.geometry.setAttribute("position", vertices);
    this.geometry.setAttribute("color", colors);
    this.geometry.computeBoundingSphere();
  };
}
