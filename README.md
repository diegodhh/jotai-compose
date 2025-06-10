<!-- @format -->

# Jotai Composer

> _Compose fully-typed **enhancers** into a single Jotai atom._

<p align="center">
  <a href="https://www.npmjs.com/package/jotai-composer">
    <img alt="npm" src="https://img.shields.io/npm/v/jotai-composer?color=cb3837&logo=npm" />
  </a>
  <a href="https://github.com/jotai-composer/jotai-composer/blob/main/LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://github.com/diegodhh/jotai-compose">
    <img alt="Repo" src="https://img.shields.io/badge/Repo-GitHub-blue" />
  </a>
  <a href="https://github.com/diegodhh/jotai-compose-example">
    <img alt="Example" src="https://img.shields.io/badge/Example-Project-green" />
  </a>
</p>

---

`jotai-composer` is a tiny helper on top of
[Jotai](https://jotai.org/) that lets you build a **modular, type-safe state
layer** by composing small, isolated **enhancers**.

- **Modularity** – keep each state slice in its own file.
- **Composition** – chain enhancers in a simple pipeline.
- **Type-safety** – state _and_ actions are fully typed end-to-end.
- **Interop friendly** – works with `atomWithStorage`, `atomWithObservable`,
  etc.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
   1. [`atomEnhancer`](#atomenhancer)
   2. [Precomposing with `piped`](#precomposing-with-piped)
4. [API Reference](#api-reference)
5. [Example Project](#example-project)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [License](#license)

---

## Installation

```bash
npm install jotai-composer            # npm
# or
yarn add jotai-composer               # Yarn
# or
pnpm add jotai-composer               # pnpm
```

---

## Quick Start

```tsx
import { atom, useAtom } from "jotai";
import { piped } from "remeda";
import { atomEnhancer, DispatcherAction } from "jotai-composer";

/* 1. Base atoms */
const countAtom = atom(0);
const actionLogger = atom<DispatcherAction<Actions, number>[]>([]);

/* 2. Define action types */
type Actions = "increment" | "decrement";

/* 3. Create enhancers */
// Action logger enhancer - tracks all actions
const actionLoggerEnhancer = atomEnhancer<
  { count: number; description: string },
  DispatcherAction<Actions, number>,
  {
    count: number;
    description: string;
    lastAction: DispatcherAction<Actions, number>;
  }
>(
  // Read function - adds last action to state
  (get, { last }) => {
    const actions = get(actionLogger);
    const lastAction = actions[actions.length - 1];
    return {
      ...last,
      lastAction,
    };
  },
  // Write function - logs actions
  (get, set, update) => {
    const actions = get(actionLogger);
    actions.push(update) || [];
    set(actionLogger, [...actions]);
    return { shouldAbortNextSetter: false };
  },
);

// Count derivation enhancer - exposes count value
const countEnhancerDerivation = atomEnhancer<
  object,
  DispatcherAction<Actions, number>,
  { count: number }
>((get) => ({ count: get(countAtom) }));

// Description enhancer - adds human-readable description
const descriptionDerivationEnhancer = atomEnhancer<
  { count: number },
  DispatcherAction<Actions, number>,
  { description: string }
>((get) => {
  const count = get(countAtom);
  return { description: `Count is ${count}` };
});

// Increment action handler
const countEnhancerIncrement = atomEnhancer<
  object,
  DispatcherAction<Actions, number>,
  object
>(
  (get) => ({}),
  (get, set, update) => {
    if (update.type === "increment") {
      set(countAtom, get(countAtom) + (update.payload ?? 0));
      return { shouldAbortNextSetter: false };
    }
    return { shouldAbortNextSetter: false };
  },
);

// Decrement action handler
const countEnhancerDecrement = atomEnhancer<
  object,
  DispatcherAction<Actions, number>,
  object
>(
  (get) => ({}),
  (get, set, update) => {
    if (update.type === "decrement") {
      set(countAtom, get(countAtom) - (update.payload ?? 0));
      return { shouldAbortNextSetter: false };
    }
    return { shouldAbortNextSetter: false };
  },
);

// Permission enhancer - can block certain actions
const createCountPermissionEnhancer = (fallback: ReturnType<Enhancer>) =>
  atomEnhancer<object, DispatcherAction<Actions, number>, object>(
    (get) => ({}),
    async (get, set, update) => {
      // forbid increment or decrement by 2
      if (update.payload === 2) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { shouldAbortNextSetter: true };
      }
      return { shouldAbortNextSetter: false };
    },
    fallback,
  );
const fallbackPipe = piped(actionLoggerEnhancer);
/* 4. Compose enhancers */
// Note: Order matters! Setters are called from last to first
const enhanced = piped(
  // First in pipe = last to handle actions
  fallbackPipe,
  // Second in pipe = second to last to handle actions
  descriptionDerivationEnhancer,
  // Third in pipe = third to last to handle actions
  countEnhancerDerivation,
  // Fourth in pipe = fourth to last to handle actions
  countEnhancerIncrement,
  // Fifth in pipe = fifth to last to handle actions
  countEnhancerDecrement,
  // Last in pipe = first to handle actions
  createCountPermissionEnhancer(fallbackPipe(undefined)),
)(undefined);

/* 5. Use in React */
function Counter() {
  const [state, dispatch] = useAtom(enhanced);

  return (
    <div>
      <p>{state.description}</p>
      <p>Last action: {state.lastAction?.type}</p>
      <button onClick={() => dispatch({ type: "increment", payload: 1 })}>
        Increment
      </button>
      <button onClick={() => dispatch({ type: "decrement", payload: 1 })}>
        Decrement
      </button>
      <button onClick={() => dispatch({ type: "increment", payload: 2 })}>
        Increment by 2 (forbidden)
      </button>
    </div>
  );
}
```

---

## Core Concepts

### `atomEnhancer`

`atomEnhancer(read, write?)` is a **shorthand** that lets you create an
`AtomEnhancer` using just two pure functions:

```ts
import { atom, Getter, Setter } from "jotai";
import { atomEnhancer, DispatcherAction } from "jotai-composer";

type Actions = "increment" | "decrement";

const countAtom = atom(0);

const counterEnhancer = atomEnhancer(
  // 1️⃣ read - derives new state slice
  (get: Getter) => ({ count: get(countAtom) }),

  // 2️⃣ write (optional) - handles dispatched actions
  (get: Getter, set: Setter, update: DispatcherAction<Actions>) => {
    if (update.type === "increment") {
      set(countAtom, get(countAtom) + (update.payload ?? 0));
      return { shouldAbortNextSetter: false };
    }
    return { shouldAbortNextSetter: false };
  },
);
```

This internally creates an enhancer that can be composed with other enhancers.

---

### Precomposing with `piped`

The recommended way to precompose related enhancers is using the `piped` function, which allows you to create reusable groups of enhancers. **Important**: The order of enhancers in the pipe matters because setters are called from last to first:

```ts
import { piped } from "jotai-composer";
// or import { pipe } from "remeda";

// Precompose related enhancers
const baseEnhancer = piped(
  // First in pipe = last to handle actions
  createBase(baseAtom),
  // Second in pipe = second to last to handle actions
  createBasePlus(1),
);

// Use in main composition
export const composedAtom = piped(
  // First in pipe = last to handle actions
  createCounter(counterAtom),
  // Second in pipe = second to last to handle actions
  baseEnhancer,
  // Third in pipe = third to last to handle actions
  createInputState(inputAtom, ""),
  // Last in pipe = first to handle actions
  modalEnhancer,
)(undefined); // Final invocation with undefined (no previous atom)
```

This approach makes your code more modular and maintainable, especially when dealing with complex state compositions. Remember that the order of enhancers in the pipe determines the order in which their setters are called when an action is dispatched.

---

```ts
const userPipe = piped(
  createUserProfile(profileAtom),
  createUserPreferences(preferencesAtom),
  createUserPermissions(permissionsAtom),
)(undefined);

// Embed the composed user atom in a larger pipeline
const appAtom = piped(
  createAppState(appAtom),
  userPipe,
  createAppSettings(settingsAtom),
)(undefined);
```

---

## Best Practices

1. **Order Matters**: Remember that setters are called from last to first in the pipe. This means that the first enhancer in the pipe will be the last to handle actions, and the last enhancer in the pipe will be the first to handle actions.

2. **Type Safety**: Always define your action types and use them in your enhancers to ensure type safety.

3. **Modularity**: Keep each enhancer focused on a single responsibility. This makes your code more maintainable and easier to test.

4. **Composition**: Use `piped` to compose related enhancers together. This makes your code more modular and easier to understand.

5. **Testing**: Write tests for your enhancers to ensure they work as expected. The test examples in this documentation show how to test your enhancers.

---

## Troubleshooting

1. **Setters not being called**: Remember that setters are called from last to first in the pipe. If your setter is not being called, check the order of your enhancers in the pipe.

2. **Type errors**: Make sure you have defined your action types correctly and are using them in your enhancers.

3. **State not updating**: Check that your enhancers are returning the correct state shape and that your setters are being called in the correct order.

---

## License

MIT © [Diego Herrero](https://github.com/diegodhh)
