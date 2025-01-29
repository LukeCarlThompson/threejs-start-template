<script module lang="ts">
  export type LevelCompleteProps = { onClicked?: () => void; timeMs: number };
</script>

<script lang="ts">
  import { fade } from "svelte/transition";

  let { onClicked, timeMs }: LevelCompleteProps = $props();
</script>

<div class={"level-complete"} transition:fade>
  <div class={"level-complete__inner"}>
    <h2>Level Complete</h2>
    <p>Duration: {timeMs}</p>
    <button onclick={onClicked}>Next</button>
  </div>
</div>

<style lang="scss">
  .level-complete {
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
