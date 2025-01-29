import type { EventQueue, World } from "@dimforge/rapier3d-compat";

export const createPhysicsWorld = async (): Promise<{ world: World; eventQueue: EventQueue }> => {
  const Rapier = await import("@dimforge/rapier3d-compat");
  await Rapier.init();
  const world = new Rapier.World({ x: 0, y: -30, z: 0 });
  const eventQueue = new Rapier.EventQueue(true);

  return { world, eventQueue };
};
