import { OrthographicCamera, PerspectiveCamera } from "three";

import type { WebGLRenderer } from "three";
import type { WebGPURenderer } from "three/webgpu";

export type RenderResolutionControllerProps = {
  size: {
    height: number;
    width: number;
  };
  quality: number;
  maxPixels: number;
  minPixels: number;
};

export class RenderResolutionController {
  public readonly size: {
    height: number;
    width: number;
  };
  public quality: number;
  public maxPixels: number;
  public minPixels: number;
  readonly #resolution = {
    width: 0,
    height: 0,
  };

  public constructor({ size, quality, maxPixels, minPixels }: RenderResolutionControllerProps) {
    this.size = size;
    this.quality = quality;
    this.maxPixels = maxPixels;
    this.minPixels = minPixels;
  }

  public get resolution(): { width: number; height: number } {
    return this.#resolution;
  }

  public readonly applyTo = (
    renderer: WebGLRenderer | WebGPURenderer,
    camera: PerspectiveCamera | OrthographicCamera
  ): void => {
    const { width, height } = this.size;

    renderer.setSize(width, height);

    const pixelRatio = this.#calculatePixelRatio(width * height, this.quality);

    renderer.setPixelRatio(pixelRatio);

    this.#resolution.width = width * pixelRatio;
    this.#resolution.height = height * pixelRatio;

    if (camera instanceof PerspectiveCamera) {
      camera.aspect = width / height;
    }
    if (camera instanceof OrthographicCamera) {
      camera.left = width * -0.05;
      camera.right = width * 0.05;
      camera.bottom = height * -0.05;
      camera.top = height * 0.05;
    }
    camera.updateProjectionMatrix();
  };

  #calculatePixelRatio(screenPixels: number, qualitySetting: number) {
    const maxPixelRatio = Math.min(this.maxPixels / screenPixels, 2);
    const minPixelRatio = Math.min(this.minPixels / screenPixels, 0.5);

    const result = (qualitySetting / 100) * (maxPixelRatio - minPixelRatio) + minPixelRatio;

    return result;
  }
}
