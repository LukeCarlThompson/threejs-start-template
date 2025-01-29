import { ActiveEvents, ColliderDesc, RigidBodyDesc, type Collider, type World } from "@dimforge/rapier3d-compat";
import { BatchedMesh, Color, Fog, Mesh, MeshStandardMaterial, Object3D, type BufferGeometry } from "three";

import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { Enemy, MoveableBlock } from "./components";
import type { GameLevelConfig } from "./game-level";
import { FakeGlowMaterial } from "./materials";

export type ParseLevelModelProps = { model: Object3D; physicsWorld: World; config: GameLevelConfig };

export type ParsedLevelModel = {
  fog: Fog;
  skyGlow: Object3D;
  goalSensors: Collider[];
  dangerSensors: Collider[];
  terrainColliders: Collider[];
  objectsToAddToToScene: Object3D[];
  enemies: Enemy[];
  moveableBlocks: MoveableBlock[];
};

export const parseLevelModel = ({ model, physicsWorld, config }: ParseLevelModelProps): ParsedLevelModel => {
  const objectsToAddToBatchedMesh: Mesh[] = [];
  const objectsToAddToToScene: Object3D[] = [];
  const meshesToMakeEnemies: Object3D[] = [];
  const meshesToMakeMoveableBlocks: Mesh[] = [];
  let textureAtlasMaterial: MeshStandardMaterial = new MeshStandardMaterial({
    forceSinglePass: true,
  });

  let verticesCount = 0;
  let indexCount = 0;

  const fog: Fog = new Fog(0xffffff, config.cameraFollowDistance - 25, config.renderDistance);
  let skyGlow: Object3D = new Object3D();
  const goalSensors: Collider[] = [];
  const dangerSensors: Collider[] = [];
  const terrainColliders: Collider[] = [];
  const enemies: Enemy[] = [];
  const moveableBlocks: MoveableBlock[] = [];

  model.traverse((child) => {
    if (child.name.includes("user-data")) {
      if ("backgroundColour" in child.userData && typeof child.userData.backgroundColour === "string") {
        const { backgroundColour } = child.userData;
        const colour = new Color(backgroundColour);
        fog.color = colour;
      }
      return;
    }

    // Textured trees
    if (child.name.includes("textured")) {
      objectsToAddToToScene.push(child);
      return;
    }

    if (child instanceof Mesh) {
      child.castShadow = config.shadows;
      child.receiveShadow = config.shadows;

      // Light rays
      if (child.name.includes("light")) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material instanceof MeshStandardMaterial) {
          child.material.fog = true;
        }
        objectsToAddToToScene.push(child);
        return;
      }

      // Glow
      if (child.name.includes("glow")) {
        const glowMaterial = new FakeGlowMaterial({
          depthTest: true,
          glowColor: new Color(0xffffff),
          falloff: 1,
          glowInternalRadius: 2,
          glowSharpness: 1,
          opacity: 0.3,
          side: 0,
        });
        child.material = glowMaterial;
        child.castShadow = false;
        child.receiveShadow = false;
        objectsToAddToToScene.push(child);

        skyGlow = child;

        return;
      }

      if (child.material instanceof MeshStandardMaterial && child.material.name.includes("gradient material")) {
        textureAtlasMaterial = child.material;
      }

      // Create enemy
      if (child.name.includes("enemy")) {
        meshesToMakeEnemies.push(child);
        return;
      }

      if (child.name.includes("moveable-block")) {
        meshesToMakeMoveableBlocks.push(child as Mesh);
        return;
      }

      // Create sensor for goal
      if (child.name.includes("goal_sensor")) {
        const goalSensor = createGoalSensor(child as Mesh, physicsWorld);
        goalSensors.push(goalSensor);
        return;
      }

      // Create sensor for danger
      if (child.name.includes("danger")) {
        const dangerSensor = createDangerSensor(child as Mesh, physicsWorld);
        dangerSensors.push(dangerSensor);
        objectsToAddToToScene.push(child);
        return;
      }

      // Batched mesh items below here
      objectsToAddToBatchedMesh.push(child as Mesh);

      // Count vertices and indexes for batched mesh
      if ("position" in (child.geometry as BufferGeometry).attributes) {
        verticesCount += (child.geometry as BufferGeometry).attributes.position.count;
        indexCount += (child.geometry as BufferGeometry).index?.count || 0;
      }

      // Create collider
      if (child.name.includes("ground")) {
        // TODO: Can I merge these together and create one big collider?
        const groundCollider = createGroundCollider(child as Mesh, physicsWorld);
        terrainColliders.push(groundCollider);
      }
      return;
    }
  });

  meshesToMakeEnemies.forEach((mesh) => {
    const enemy = new Enemy({ physicsWorld: physicsWorld, model: mesh, shadows: config.shadows });
    enemies.push(enemy);
    objectsToAddToToScene.push(enemy);
  });

  meshesToMakeMoveableBlocks.forEach((mesh) => {
    const moveableBlock = new MoveableBlock({
      physicsWorld: physicsWorld,
      model: mesh,
      shadows: config.shadows,
    });
    moveableBlocks.push(moveableBlock);
    objectsToAddToToScene.push(moveableBlock);
  });

  const batchedMesh = new BatchedMesh(
    objectsToAddToBatchedMesh.length,
    verticesCount,
    indexCount,
    textureAtlasMaterial
  );

  batchedMesh.castShadow = config.shadows;
  batchedMesh.receiveShadow = config.shadows;
  // batchedMesh.perObjectFrustumCulled = false;
  // batchedMesh.sortObjects = false;

  objectsToAddToBatchedMesh.forEach((object) => {
    const geometryId = batchedMesh.addGeometry(object.geometry);
    const instancedId = batchedMesh.addInstance(geometryId);
    batchedMesh.setMatrixAt(instancedId, object.matrix);
  });

  objectsToAddToToScene.push(batchedMesh);

  return {
    fog,
    skyGlow,
    goalSensors,
    dangerSensors,
    terrainColliders,
    objectsToAddToToScene,
    enemies,
    moveableBlocks,
  };
};

const createGoalSensor = (child: Mesh, physicsWorld: World): Collider => {
  const bufferGeometry = BufferGeometryUtils.mergeVertices(child.geometry);
  bufferGeometry.scale(child.scale.x, child.scale.y, child.scale.z);
  const vertices = bufferGeometry.attributes.position.array as Float32Array;
  const indices = bufferGeometry.index?.array as Uint32Array;
  const colliderDesc = ColliderDesc.trimesh(vertices, indices);
  colliderDesc.translation = child.position;
  colliderDesc.rotation = child.quaternion;
  colliderDesc.setSensor(true).setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  return physicsWorld.createCollider(colliderDesc);
};

const createDangerSensor = (child: Mesh, physicsWorld: World): Collider => {
  const bufferGeometry = BufferGeometryUtils.mergeVertices(child.geometry);
  bufferGeometry.scale(child.scale.x, child.scale.y, child.scale.z);
  const vertices = bufferGeometry.attributes.position.array as Float32Array;
  const indices = bufferGeometry.index?.array as Uint32Array;
  const colliderDesc = ColliderDesc.trimesh(vertices, indices);
  colliderDesc.translation = child.position;
  colliderDesc.rotation = child.quaternion;
  colliderDesc.setSensor(true).setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  return physicsWorld.createCollider(colliderDesc);
};

const createGroundCollider = (child: Mesh, physicsWorld: World): Collider => {
  const bufferGeometry = BufferGeometryUtils.mergeVertices(child.geometry);
  bufferGeometry.scale(child.scale.x, child.scale.y, child.scale.z);
  const vertices = bufferGeometry.attributes.position.array as Float32Array;
  const indices = bufferGeometry.index?.array as Uint32Array;
  const colliderDesc = ColliderDesc.trimesh(vertices, indices);
  colliderDesc.translation = child.position;
  colliderDesc.rotation = child.quaternion;
  colliderDesc.friction = 30;
  const rigidBody = physicsWorld.createRigidBody(RigidBodyDesc.fixed());
  return physicsWorld.createCollider(colliderDesc, rigidBody);
};
