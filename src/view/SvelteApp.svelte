<script lang="ts">
  import { GameOver, GameOverlay, LevelComplete, LevelSelect, LoadingScreen, TitleScreen } from "./svelte-components";

  import type { GameLevelName } from "../game-state.svelte";
  import { gameState } from "../game-state.svelte";

  export type AppProps = {
    onStartLevelClicked?: () => void;
    onLevelCompleteClicked?: () => void;
    onTitleScreenClicked?: () => void;
    onTryAgainClicked?: () => void;
    onChooseLevelClicked?: () => void;
  };

  let {
    onStartLevelClicked,
    onLevelCompleteClicked,
    onTitleScreenClicked,
    onTryAgainClicked,
    onChooseLevelClicked,
  }: AppProps = $props();

  const showOverlay = $derived(gameState.currentScene !== "game");
  const showTitle = $derived(gameState.currentScene === "title");
  const showLoadingScreen = $derived(gameState.currentScene === "loading");
  const showLevelSelect = $derived(gameState.currentScene === "level-select");
  const showLevelComplete = $derived(gameState.currentScene === "level-complete");
  const showGameOver = $derived(gameState.currentScene === "game-over");
</script>

<div>
  {#if showOverlay}
    <GameOverlay>
      {#if showLoadingScreen}
        <LoadingScreen loadingPercentage={gameState.loadingPercent} />
      {/if}
      {#if showTitle}
        <TitleScreen onClicked={onTitleScreenClicked} />
      {/if}
      {#if showLevelSelect}
        <LevelSelect
          levels={gameState.levels}
          selectedLevelName={gameState.selectedLevel}
          onSelectionClicked={(selectedLevel) => {
            gameState.selectedLevel = selectedLevel as GameLevelName;
          }}
          onConfirmed={onStartLevelClicked}
        />
      {/if}

      {#if showLevelComplete}
        <LevelComplete timeMs={100} onClicked={onLevelCompleteClicked} />
      {/if}

      {#if showGameOver}
        <GameOver {onTryAgainClicked} {onChooseLevelClicked} />
      {/if}
    </GameOverlay>
  {/if}
</div>
