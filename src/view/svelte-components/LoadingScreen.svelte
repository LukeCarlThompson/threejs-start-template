<script module lang="ts">
  export type LoadingScreenProps = {
    loadingPercentage: number;
  };
</script>

<script lang="ts">
  import { scale } from "svelte/transition";
  let { loadingPercentage }: LoadingScreenProps = $props();
</script>

<div class={"loading"} transition:scale>
  <div class={"loading__inner"}>
    <h4>Loading</h4>
    <p>{Math.round(loadingPercentage)}%</p>
    <progress value={loadingPercentage} max="100"></progress>
  </div>
</div>

<style lang="scss">
  .loading {
    position: absolute;
    display: flex;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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
