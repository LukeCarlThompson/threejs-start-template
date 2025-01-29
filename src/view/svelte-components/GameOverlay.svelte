<script lang="ts">
  import type { Snippet } from "svelte";
  export type GameOverlayProps = { children?: Snippet };
  import { fade } from "svelte/transition";

  let { children }: GameOverlayProps = $props();
</script>

<div class={"overlay"} transition:fade>
  {@render children?.()}
</div>

<style lang="scss">
  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--pico-background-color);
  }
</style>
