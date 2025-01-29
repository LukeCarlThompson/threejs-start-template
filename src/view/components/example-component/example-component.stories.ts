import type { Meta, StoryObj } from "@storybook/html";
import { Scene } from "three";
import { createStoryTemplate } from "../story-template";
import type { ExampleComponentProps } from "./example-component";
import { ExampleComponent } from "./example-component";

const meta = {
  title: "Example/Example Component",
  render: ({ dimensions }) => {
    const div = document.createElement("div");

    const asyncLoading = async () => {
      const exampleComponent = new ExampleComponent({ dimensions });

      const { storyElement, ticker, camera, renderer, tweakpane } = await createStoryTemplate();

      div.appendChild(storyElement);

      tweakpane.addFolder({
        title: "Folder",
      });

      camera.position.z = 5;
      const scene = new Scene();
      scene.add(exampleComponent);

      ticker.add(exampleComponent.update);
      ticker.add(() => {
        if ("renderAsync" in renderer) {
          void renderer.renderAsync(scene, camera);
        } else {
          renderer.render(scene, camera);
        }
      });
      ticker.start();

      window.dispatchEvent(new Event("resize"));
    };

    void asyncLoading();

    return div;
  },
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  args: {
    dimensions: {
      x: 1,
      y: 1,
      z: 1,
    },
  },
} satisfies Meta<ExampleComponentProps>;

export default meta;
type Story = StoryObj<ExampleComponentProps>;

export const Default: Story = {
  args: {
    dimensions: {
      x: 1,
      y: 1,
      z: 1,
    },
  },
};
