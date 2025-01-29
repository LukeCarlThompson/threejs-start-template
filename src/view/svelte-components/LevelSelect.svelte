<script module lang="ts">
  export type LevelSelectProps<T> = {
    levels: { name: T; unlocked: boolean }[];
    selectedLevelName: T;
    onConfirmed?: (selectedGameLevelName: T) => void;
    onSelectionClicked?: (selectedGameLevelName: T) => void;
  };

  export type T = string;
</script>

<script lang="ts" generics="T extends string">
  import { fade } from "svelte/transition";
  let { levels, selectedLevelName, onConfirmed, onSelectionClicked }: LevelSelectProps<T> = $props();
</script>

<div class={"level-select"} transition:fade>
  <div class={"level-select__inner"}>
    <fieldset class="level-select__grid">
      <legend>Level Select:</legend>
      {#each levels as { name, unlocked } (name)}
        <label>
          <input
            type="radio"
            name="level-select"
            value={name}
            checked={name === selectedLevelName}
            disabled={!unlocked}
            onclick={() => {
              onSelectionClicked?.(name);
            }}
          />
          <span class="hidden">{name}</span>
        </label>
      {/each}
    </fieldset>
  </div>
  <button
    onclick={() => {
      onConfirmed?.(selectedLevelName);
    }}
  >
    Play Level
  </button>
</div>

<style lang="scss">
  .level-select {
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

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, 26px);
      grid-gap: 10px;
    }
  }

  input[type="radio"] {
    display: block;
    margin-inline-end: 0;
    margin: 0;
  }

  .hidden {
    position: absolute;
    height: 0;
    width: 0;
    visibility: hidden;
  }
</style>
