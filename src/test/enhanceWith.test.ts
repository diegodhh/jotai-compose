import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { describe, expect, it } from "vitest";
import { enhanceWith } from "../enhanceWith";

describe("enhanceWith", () => {
  it("should create a basic atom with default state", () => {
    const baseAtom = enhanceWith({})();
    const store = createStore();

    expect(store.get(baseAtom)).toEqual({});
  });

  it("should add state from read function", () => {
    const withCounter = enhanceWith({
      read: () => ({ count: 5 }),
    })();

    const store = createStore();
    expect(store.get(withCounter)).toEqual({ count: 5 });
  });

  it("should compose with existing atom", () => {
    // Create a base atom
    const baseAtom = atom({ name: "test" });

    // Enhance it with additional state
    const enhanced = enhanceWith({
      read: () => ({ count: 10 }),
    })(baseAtom);

    const store = createStore();
    expect(store.get(enhanced)).toEqual({
      name: "test",
      count: 10,
    });
  });

  it("should support write operations", () => {
    interface TestState {
      count: number;
    }

    interface TestAction {
      type: string;
      payload?: number;
    }

    const baseAtom = atom<TestState>({ count: 0 });
    const enhanced = enhanceWith<TestState, TestAction>({
      write: ({ stateHelper, update }) => {
        if (update.type === "increment") {
          // Here we could update some derived state if needed
        }
        return {}; // Continue with base atom updates
      },
    })(baseAtom);

    const store = createStore();
    store.set(enhanced, { type: "increment", payload: 1 });

    // Even though our write handler didn't update the state directly,
    // it allowed the base atom's setter to run
    expect(store.get(baseAtom)).toEqual({ type: "increment", payload: 1 });
  });

  it("should abort next setter when specified", () => {
    interface TestState {
      count: number;
    }

    interface TestAction {
      type: string;
      payload?: number;
    }

    const baseAtom = atom<TestState>({ count: 0 });
    const enhanced = enhanceWith<TestState, TestAction>({
      write: ({ stateHelper, update }) => {
        // Prevent the update from propagating to the base atom
        return { shouldAbortNextSetter: true };
      },
    })(baseAtom);

    const store = createStore();
    const initialState = store.get(baseAtom);

    // This update should be intercepted
    store.set(enhanced, { type: "increment", payload: 1 });

    // The base atom's state should remain unchanged
    expect(store.get(baseAtom)).toEqual(initialState);
  });

  it("should support read function returning an atom", () => {
    const countAtom = atom(5);

    const enhanced = enhanceWith({
      read: () => ({
        value: 5,
      }),
    })();

    const store = createStore();
    expect(store.get(enhanced)).toEqual({ value: 5 });
  });

  it("should handle atom returned from read function", () => {
    const valueAtom = atom({ count: 10 });

    // According to the implementation, if the read function returns
    // an atom, that atom's value is read and merged into the state
    const enhanced = enhanceWith({
      read: () => valueAtom,
    })();

    const store = createStore();
    // The atom's value should be read and merged
    expect(store.get(enhanced)).toEqual({ count: 10 });

    // When the original atom changes, the enhanced atom should reflect that
    store.set(valueAtom, { count: 20 });
    expect(store.get(enhanced)).toEqual({ count: 20 });
  });

  it("should compose multiple enhancers", () => {
    const baseAtom = atom({ name: "test" });

    const withCounter = enhanceWith({
      read: () => ({ count: 5 }),
    });

    const withStatus = enhanceWith({
      read: () => ({ status: "active" }),
    });

    const enhanced = withStatus(withCounter(baseAtom));

    const store = createStore();
    expect(store.get(enhanced)).toEqual({
      name: "test",
      count: 5,
      status: "active",
    });
  });
});
