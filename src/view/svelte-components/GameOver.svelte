<script module lang="ts">
  export type GameOverProps = { onTryAgainClicked?: () => void; onChooseLevelClicked?: () => void };
</script>

<script lang="ts">
  import { fade, scale } from "svelte/transition";

  let { onTryAgainClicked, onChooseLevelClicked }: GameOverProps = $props();
</script>

<div class={"game-over"} transition:fade>
  <div class={"game-over__inner"}>
    <h2>Game Over</h2>
    <button onclick={onTryAgainClicked} in:scale>Try Again</button>
    <button onclick={onChooseLevelClicked} in:scale={{ delay: 200 }}>Level Select</button>
  </div>
</div>

<style lang="scss">
  .game-over {
    position: absolute;
    display: flex;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &__inner {
      position: relative;
      display: flex;
      gap: 5px;
      width: 100%;
      max-width: 300px;
      flex-direction: column;
      align-items: center;
      opacity: 1;
      padding: 20px;
    }
  }
</style>
