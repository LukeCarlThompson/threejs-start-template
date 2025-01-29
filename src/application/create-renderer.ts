import { ACESFilmicToneMapping } from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";

const checkForWebGPUSupport = async (): Promise<boolean> => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  let isAvailable = typeof navigator !== "undefined" && navigator.gpu !== undefined;

  if (typeof window !== "undefined" && isAvailable) {
    isAvailable = (await navigator.gpu.requestAdapter()) !== null;
  }

  return isAvailable;
};

export const createRenderer = async (webGPUEnabled: boolean): Promise<WebGLRenderer | WebGPURenderer> => {
  const webGPUSupported = await checkForWebGPUSupport();

  if (webGPUEnabled && webGPUSupported) {
    const { WebGPURenderer } = await import("three/webgpu");
    const renderer = new WebGPURenderer({
      powerPreference: "high-performance",
      antialias: true,
    });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;

    return renderer;
  } else if (WebGL.isWebGL2Available()) {
    const { WebGLRenderer } = await import("three");
    const renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true,
    });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;

    return renderer;
  }

  throw new Error("Your browser does not support WebGL or WebGPU");
};
