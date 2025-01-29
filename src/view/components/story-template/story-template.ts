import { Pane } from "tweakpane";
import { PerspectiveCamera } from "three";
import { RenderResolutionController } from "../../../application/render-resolution-controller";
import Stats from "stats-gl";
import { Ticker } from "../../../application/ticker";
import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";
import { createRenderer } from "../../../application/create-renderer";

export const createStoryTemplate = async (
  webGPUEnabled?: boolean
): Promise<{
  storyElement: HTMLElement;
  ticker: Ticker;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer | WebGPURenderer;
  tweakpane: Pane;
}> => {
  const storyElement = document.createElement("div");
  storyElement.style.position = "absolute";
  storyElement.style.top = "0";
  storyElement.style.left = "0";
  storyElement.style.width = "100%";
  storyElement.style.height = "100%";

  const { clientWidth, clientHeight } = storyElement;

  const stats = new Stats({
    trackGPU: true,
    trackHz: false,
    trackCPT: false,
  });

  const renderer = await createRenderer(webGPUEnabled || false);
  storyElement.appendChild(renderer.domElement);

  const camera = new PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 1000);

  const ticker = new Ticker();

  ticker.beforeTick = () => {
    stats.begin();
  };

  ticker.afterTick = () => {
    stats.end();
    stats.update();
  };

  const renderResolutionController = new RenderResolutionController({
    maxPixels: 1920 * 1080,
    minPixels: 400 * 600,
    quality: 100,
    size: { width: clientWidth, height: clientHeight },
  });

  const handleResize = () => {
    const { clientWidth, clientHeight } = storyElement;
    renderResolutionController.size.width = clientWidth;
    renderResolutionController.size.height = clientHeight;
    renderResolutionController.applyTo(renderer, camera);
  };
  window.addEventListener("resize", handleResize);
  handleResize();

  const tweakpane = new Pane();
  tweakpane.element.style.position = "absolute";
  tweakpane.element.style.top = "10px";
  tweakpane.element.style.right = "10px";
  tweakpane.element.style.zIndex = "2";

  storyElement.appendChild(tweakpane.element);

  storyElement.appendChild(stats.dom);

  // Render resolution controls
  const resolutionFolder = tweakpane.addFolder({
    title: "Resolution",
  });

  const quality = {
    percentage: 100,
  };

  resolutionFolder
    .addBinding(quality, "percentage", {
      min: 0,
      max: 100,
    })
    .on("change", () => {
      renderResolutionController.quality = quality.percentage;
      renderResolutionController.applyTo(renderer, camera);
    });

  return {
    storyElement,
    ticker,
    camera,
    renderer,
    tweakpane,
  };
};
