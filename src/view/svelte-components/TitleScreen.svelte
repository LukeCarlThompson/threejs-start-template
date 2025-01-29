<script module lang="ts">
  export type TitleScreenProps = { onClicked?: () => void };
</script>

<script lang="ts">
  import { scale } from "svelte/transition";

  let { onClicked }: TitleScreenProps = $props();
</script>

<div class={"title-screen"} transition:scale>
  <div class={"title-screen__inner"}>
    <button onclick={onClicked}>Start game</button>
  </div>
</div>

<style lang="scss">
  .title-screen {
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
