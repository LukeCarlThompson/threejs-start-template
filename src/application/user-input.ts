import type { UserInputState } from "../view/game-level";

export type Event<EventData extends Record<string, unknown>> = { name: string; data: EventData };
export type Events = [{ name: "grapple-pressed"; data: { width: number; height: number } }];
export class UserInput implements UserInputState {
  public onGrapplePressed?: ({ width, height }: { width: number; height: number }) => void;
  public onGrappleReleasePressed?: () => void;
  public onGrappleEscapePressed?: () => void;
  public onJumpPressed?: () => void;
  readonly #state = {
    lookVector: {
      x: 0,
      y: 0,
    },
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  };
  #touchStart = {
    x: 0,
    y: 0,
  };
  readonly #gameKeys = [
    "w",
    "a",
    "d",
    "s",
    "q",
    "e",
    " ",
    "ArrowUp",
    "ArrowLeft",
    "ArrowRight",
    "ArrowDown",
    "Shift",
    "/",
    ".",
  ];
  #parentElement: HTMLElement;

  public constructor(parentElement: HTMLElement) {
    this.#parentElement = parentElement;

    parentElement.addEventListener("keydown", this.#keyDownHandler);
    parentElement.addEventListener("keyup", this.#keyUpHandler);
    parentElement.addEventListener("mousedown", this.#mouseDownHandler);
    parentElement.addEventListener("mouseup", this.#mouseUpHandler);
    parentElement.addEventListener("touchstart", this.#touchStartHandler);
    parentElement.addEventListener("touchend", this.#touchEndHandler);
    parentElement.addEventListener("mousemove", this.#mouseMovehandler);
    parentElement.addEventListener("touchmove", this.#touchMoveHandler);

    // Stop context menu on the game
    parentElement.addEventListener(`contextmenu`, (e) => {
      e.preventDefault();
    });
  }

  public get lookVector(): { x: number; y: number } {
    return this.#state.lookVector;
  }
  public get left(): boolean {
    return this.#state.left;
  }
  public get right(): boolean {
    return this.#state.right;
  }
  public get up(): boolean {
    return this.#state.up;
  }
  public get down(): boolean {
    return this.#state.down;
  }
  public get boost(): boolean {
    return this.#state.boost;
  }

  #keyDownHandler = (e: KeyboardEvent) => {
    if (e.target !== this.#parentElement) return;

    if (this.#gameKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.repeat) return;

    if (e.key === " " || e.key === "w" || e.key === "ArrowUp") {
      this.#state.boost = true;
      this.onJumpPressed?.();
    } else if (e.key === "s" || e.key === "ArrowDown") {
      this.#state.down = true;
    } else if (e.key === "a" || e.key === "ArrowLeft") {
      this.#state.left = true;
    } else if (e.key === "d" || e.key === "ArrowRight") {
      this.#state.right = true;
    } else if (e.key === "/" || e.key === "e") {
      this.onGrappleReleasePressed?.();
    } else if (e.key === "." || e.key === "q") {
      this.onGrappleEscapePressed?.();
    }
  };

  readonly #keyUpHandler = (e: KeyboardEvent) => {
    if (e.target !== this.#parentElement) return;

    if (this.#gameKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.repeat) return;

    if (e.key === " " || e.key === "w" || e.key === "ArrowUp") {
      this.#state.boost = false;
    } else if (e.key === "s" || e.key === "ArrowDown") {
      this.#state.down = false;
    } else if (e.key === "a" || e.key === "ArrowLeft") {
      this.#state.left = false;
    } else if (e.key === "d" || e.key === "ArrowRight") {
      this.#state.right = false;
    }
  };

  readonly #mouseDownHandler = (e: MouseEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    // Left click
    if (e.button === 0) {
      this.onGrapplePressed?.(this.#parentElement.getBoundingClientRect());
      return;
    }

    // Mouse wheel click
    if (e.button === 1) {
      this.onGrappleEscapePressed?.();
      return;
    }

    // Right click
    if (e.button === 2) {
      this.onGrappleReleasePressed?.();
      return;
    }
  };

  readonly #mouseUpHandler = (e: MouseEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  readonly #touchStartHandler = (e: TouchEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    this.#state.lookVector.x = 0;
    this.#state.lookVector.y = 0;
    this.#touchStart.x = e.touches[0].clientX;
    this.#touchStart.y = e.touches[0].clientY;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (e.touches[1]) {
      this.#state.up = true;
    }
  };

  readonly #touchMoveHandler = (e: TouchEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = this.#parentElement.getBoundingClientRect();

    this.#state.lookVector.x = e.touches[0].clientX - this.#touchStart.x - rect.left;
    this.#state.lookVector.y = e.touches[0].clientY - this.#touchStart.y - rect.top;
  };

  readonly #touchEndHandler = (e: TouchEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    this.#state.lookVector.x = 0;
    this.#state.lookVector.y = 0;
    this.#state.up = false;
  };

  readonly #mouseMovehandler = (e: MouseEvent) => {
    if (e.target instanceof Node && !this.#parentElement.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = this.#parentElement.getBoundingClientRect();

    if (e.buttons === 0) {
      this.#state.lookVector.x = e.clientX - this.#touchStart.x - rect.left;
      this.#state.lookVector.y = e.clientY - this.#touchStart.y - rect.top;
    }
  };
}
