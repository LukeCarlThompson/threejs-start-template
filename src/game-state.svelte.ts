export type GameLevelName = "Level One" | "Level Two" | "Level Three" | "Level Four" | "Level Five";
export type GameSceneName = "game" | "level-select" | "loading" | "title" | "level-complete" | "game-over";
export type GameLevelEntry = { name: GameLevelName; unlocked: boolean; completed: boolean; bestTime?: number };
export type GameState = {
  renderQuality: number;
  loadingPercent: number;
  currentScene: GameSceneName;
  levelTimerMs: number;
  selectedLevel: GameLevelName;
  levels: GameLevelEntry[];
};

export const gameState: GameState = $state({
  renderQuality: 100,
  loadingPercent: 0,
  currentScene: "loading",
  levelTimerMs: 0,
  selectedLevel: "Level One",
  levels: [
    { name: "Level One", unlocked: true, completed: false, bestTime: undefined },
    { name: "Level Two", unlocked: true, completed: false, bestTime: undefined },
    { name: "Level Three", unlocked: true, completed: false, bestTime: undefined },
    { name: "Level Four", unlocked: true, completed: false, bestTime: undefined },
    { name: "Level Five", unlocked: true, completed: false, bestTime: undefined },
  ],
});
