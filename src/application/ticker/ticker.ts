export type UpdateFunction = (delta: number) => void;

export type TickerProps = {
  beforeTick?: () => void;
  afterTick?: () => void;
};

export class Ticker {
  #deltaMax = 0.1;
  #time;
  #updateQueue: Set<(delta: number) => void> = new Set();
  #running = false;
  public beforeTick?: () => void;
  public afterTick?: () => void;

  public constructor() {
    this.#time = performance.now() / 1000;
  }

  public start(): void {
    if (this.#running) return;
    this.#running = true;

    this.#time = performance.now() / 1000;
    this.#update();
  }

  public stop(): void {
    this.#running = false;
  }

  public resume(): void {
    if (this.#running) return;

    this.#time = performance.now() / 1000;

    this.#update();
  }

  public add(updateFunction: UpdateFunction): void {
    this.#updateQueue.add(updateFunction);
  }

  public remove(updateFunction: UpdateFunction): void {
    this.#updateQueue.delete(updateFunction);
  }

  get #delta(): number {
    const currentTime = performance.now() / 1000;
    const delta = currentTime - this.#time;
    this.#time = currentTime;
    return Math.min(delta, this.#deltaMax);
  }

  readonly #update = (): void => {
    if (!this.#running) return;
    this.beforeTick?.();

    const delta = this.#delta;

    this.#updateQueue.forEach((updateFunction) => {
      updateFunction(delta);
    });

    this.afterTick?.();

    requestAnimationFrame(this.#update);
  };
}
