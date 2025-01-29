export type Config = {
  stats: boolean;
  debugControls: boolean;
  physicsDebugRender: boolean;
  webGPUEnabled: boolean;
};

export const getConfig = (): Config => {
  if (import.meta.env.DEV) {
    return {
      stats: true,
      debugControls: true,
      physicsDebugRender: false,
      webGPUEnabled: false,
    };
  }

  return {
    stats: false,
    debugControls: false,
    physicsDebugRender: false,
    webGPUEnabled: false,
  };
};
