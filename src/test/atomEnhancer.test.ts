import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { piped } from "remeda";
import { describe, expect, it } from "vitest";
import { atomEnhancer } from "../atomEnhancer";
import { Enhancer } from "../enhanceWith";
import { DispatcherAction } from "../types";
describe("atomEnhancer", () => {
  const countAtom = atom(0);
  const actionLogger = atom<DispatcherAction<Actions, number>[]>([]);
  const counterFlag = atom(false);
  type Actions = "increment" | "decrement";
  // Create a count enhancer that doubles the value
  const actionLoggerEnhancer = atomEnhancer<
    { count: number; description: string },
    DispatcherAction<Actions, number>,
    {
      count: number;
      description: string;
      lastAction: DispatcherAction<Actions, number>;
    }
  >(
    (get, { last }) => {
      const actions = get(actionLogger);
      const lastAction = actions[actions.length - 1];
      return {
        ...last,
        lastAction,
      };
    },
    (get, set, update) => {
      const actions = get(actionLogger);
      actions.push(update) || [];
      set(actionLogger, [...actions]);
      return { shouldAbortNextSetter: false };
    },
  );
  const falbackPipe = piped(actionLoggerEnhancer);
  const createCountPermissionEnhancer = (fallback: ReturnType<Enhancer>) =>
    atomEnhancer<object, DispatcherAction<Actions, number>, object>(
      (get) => ({}),
      async (get, set, update) => {
        // forbid increment or decrement by 2
        if (update.payload === 2) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          console.log("not-count");
          return { shouldAbortNextSetter: true };
        }
        return { shouldAbortNextSetter: false };
      },
      fallback,
    );
  const countEnhancerIncrement = atomEnhancer<
    object,
    DispatcherAction<Actions, number>,
    object
  >(
    // Read function - doubles the value
    (get) => ({}),
    // Write function - halves the value before setting
    (get, set, update) => {
      if (update.type === "increment") {
        set(countAtom, get(countAtom) + (update.payload ?? 0));
        return { shouldAbortNextSetter: false };
      }
      return { shouldAbortNextSetter: false };
    },
  );
  const countEnhancerDecrement = atomEnhancer<
    object,
    DispatcherAction<Actions, number>,
    object
  >(
    // Read function - doubles the value
    (get) => ({}),
    // Write function - halves the value before setting
    (get, set, update) => {
      if (update.type === "decrement") {
        set(countAtom, get(countAtom) - (update.payload ?? 0));
        return { shouldAbortNextSetter: false };
      }
      return { shouldAbortNextSetter: false };
    },
  );
  const countEnhancerDerivation = atomEnhancer<
    object,
    DispatcherAction<Actions, number>,
    { count: number }
  >((get) => ({ count: get(countAtom) }));
  const descriptionDerivationEnhancer = atomEnhancer<
    { count: number },
    DispatcherAction<Actions, number>,
    { description: string }
  >((get) => {
    const count = get(countAtom);
    return { description: `Count is ${count}` };
  });
  const enhanced = piped(
    falbackPipe,
    descriptionDerivationEnhancer,
    countEnhancerDerivation,
    countEnhancerIncrement,
    countEnhancerDecrement,
    createCountPermissionEnhancer(falbackPipe(undefined)),
  )(undefined);

  it("should initialize with correct state", () => {
    const store = createStore();
    expect(store.get(enhanced)).toEqual({
      count: 0,
      description: "Count is 0",
    });
  });

  it("should handle increment action", async () => {
    const store = createStore();
    const result = await store.set(enhanced, { type: "increment", payload: 1 });
    expect(result).toEqual({ shouldAbortNextSetter: false });
    expect(store.get(enhanced)).toEqual({
      count: 1,
      description: "Count is 1",
      lastAction: { type: "increment", payload: 1 },
    });
  });

  it("should handle decrement action", async () => {
    const store = createStore();
    await store.set(enhanced, { type: "decrement", payload: 1 });
    expect(store.get(enhanced)).toEqual({
      count: -1,
      description: "Count is -1",
      lastAction: { type: "decrement", payload: 1 },
    });
  });

  it("should handle forbidden action and run fallback", async () => {
    const store = createStore();
    await store.set(enhanced, { type: "increment", payload: 2 });
    const result = store.get(enhanced);
    console.log(result);
    expect(result).toEqual({
      count: 0,
      description: "Count is 0",
      lastAction: { type: "increment", payload: 2 },
    });
  });
});
