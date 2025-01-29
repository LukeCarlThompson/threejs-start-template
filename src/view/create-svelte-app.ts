import SvelteApp from "./SvelteApp.svelte";
import { mount } from "svelte";

export type CreateSvelteAppProps = {
  parentElement: HTMLElement;
  onStartLevelClicked?: () => void;
  onLevelCompleteClicked?: () => void;
  onTitleScreenClicked?: () => void;
  onChooseLevelClicked?: () => void;
  onTryAgainClicked?: () => void;
};

export const createSvelteApp = ({
  parentElement,
  onLevelCompleteClicked,
  onStartLevelClicked,
  onTitleScreenClicked,
  onChooseLevelClicked,
  onTryAgainClicked,
}: CreateSvelteAppProps): void => {
  mount(SvelteApp, {
    target: parentElement,
    props: {
      onStartLevelClicked,
      onLevelCompleteClicked,
      onTitleScreenClicked,
      onChooseLevelClicked,
      onTryAgainClicked,
    },
  });
};
