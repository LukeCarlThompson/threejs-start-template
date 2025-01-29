import type { Vector3 } from "three";
import { damp } from "three/src/math/MathUtils.js";

export const cameraFollowBehaviour = (
  cameraPosition: Vector3,
  cameraFollowPosition: Vector3,
  cameraVerticalOffset: number,
  cameraFollowDistance: number,
  delta: number
): void => {
  const dampXMultiplier =
    Math.abs(cameraPosition.x - cameraFollowPosition.x) * Math.abs(cameraPosition.x - cameraFollowPosition.x);
  const dampYMultiplier =
    Math.abs(cameraPosition.y - cameraFollowPosition.y + cameraVerticalOffset) *
    Math.abs(cameraPosition.y - cameraFollowPosition.y + cameraVerticalOffset);

  cameraPosition.x = damp(cameraPosition.x, cameraFollowPosition.x, dampXMultiplier, delta);
  cameraPosition.y = damp(cameraPosition.y, cameraFollowPosition.y + cameraVerticalOffset, dampYMultiplier, delta);
  cameraPosition.z = damp(cameraPosition.z, cameraFollowPosition.z + cameraFollowDistance, dampYMultiplier, delta);
};
