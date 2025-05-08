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
   3. [`toEnhancer`](#toenhancer)
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
import { pipe } from "remeda";
import { atomEnhancer, DispatcherAction } from "jotai-composer";

/* 1. Base atom */
const countAtom = atom(0);

/* 2. Enhancer */
export enum CounterAction {
  ADD = "ADD",
}
const counterEnhancer = atomEnhancer(
  // Read function
  (get) => ({ count: get(countAtom) }),

  // Write function
  (get, set, update: DispatcherAction<CounterAction>) => {
    if (update.type === CounterAction.ADD) {
      set(countAtom, get(countAtom) + 1);
      return { shouldAbortNextSetter: true };
    }
    return { shouldAbortNextSetter: false };
  },
);

/* 2.5 Another enhancer */
const countPlusOneEnhancer = atomEnhancer(
  // Read function - adds a derived state
  (get, { last }) => ({
    countPlusOne: last.count + 1,
  }),

  // No write function needed - it's a derived state
);

/* 3. Compose */
export const composedAtom = piped(
  counterEnhancer,
  countPlusOneEnhancer,
)(undefined); // passing undefined as the initial atom
// We pass undefined as the first atom in the composition chain.
// This tells the enhancers to start with an empty state object.
// Each enhancer will then add its own state properties to this object.

/* 4. Use in React */
function Counter() {
  const [state, dispatch] = useAtom(composedAtom);

  return (
    <button onClick={() => dispatch({ type: CounterAction.ADD })}>
      Count: {state.count} (Plus one: {state.countPlusOne})
    </button>
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

export enum CounterAction {
  ADD = "ADD",
}

const countAtom = atom(0);

const counterEnhancer = atomEnhancer(
  // 1️⃣ read - derives new state slice
  (get: Getter) => ({ count: get(countAtom) }),

  // 2️⃣ write (optional) - handles dispatched actions
  (get: Getter, set: Setter, update: DispatcherAction<CounterAction>) => {
    if (update.type === CounterAction.ADD) {
      set(countAtom, get(countAtom) + 1);
      return { shouldAbortNextSetter: true };
    }
    return { shouldAbortNextSetter: false };
  },
);
```

This internally creates an enhancer that can be composed with other enhancers.

---

### Precomposing with `piped`

The recommended way to precompose related enhancers is using the `piped` function, which allows you to create reusable groups of enhancers:

```ts
import { piped } from "jotai-composer";
// or import { pipe } from "remeda";

// Precompose related enhancers
const baseEnhancer = piped(
  createBase(baseAtom), // First enhancer in the chain
  createBasePlus(1), // Second enhancer in the chain
);

// Use in main composition
export const composedAtom = piped(
  createCounter(counterAtom), // Counter enhancer
  baseEnhancer, // Precomposed Base + BasePlus enhancers
  createInputState(inputAtom, ""), // Input state management
  modalEnhancer, // Modal functionality
)(undefined); // Final invocation with undefined (no previous atom)
```

This approach makes your code more modular and maintainable, especially when dealing with complex state compositions.

---

### `toEnhancer`

Sometimes you need to embed an **already composed** atom inside a larger
pipeline. `toEnhancer` adapts any existing atom into an
enhancer:

```ts
import { toEnhancer } from "jotai-composer";

const userAtomComposition = piped(
  createUserProfile(profileAtom),
  createUserPreferences(preferencesAtom),
  createUserPermissions(permissionsAtom),
)(undefined);

const userEnhancer = toEnhancer({
  composed: userAtomComposition,
  keyString: "user", // optional – nest under `state.user`
});
```

Use `toEnhancer` only when you need to incorporate an existing atom into your composition with a specific key structure. Unlike regular enhancers that participate in the full composition chain, `toEnhancer` creates a disconnected atom that doesn't receive the previous atom's state as a parameter.

---

## API Reference

| Function                               | Description                                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `atomEnhancer(read, write?)()`         | Creates an enhancer and starts a chain with it.                                                                                                       |
| `atomEnhancer(read, write?)(prevAtom)` | Creates an enhancer and adds it on top of `prevAtom`.                                                                                                 |
| `piped(...enhancers)(prevAtom?)`       | Precompose multiple enhancers into a reusable group that can be used in larger compositions.                                                          |
| `toEnhancer({ composed, keyString? })` | Wrap an existing atom so it behaves like an enhancer. All helpers are fully typed—all your `state`, `actions` and `payloads` get inferred end-to-end. |

---

## Example Project

For a complete, runnable example see the
[`jotai-composer-example`](https://github.com/diegodhh/jotai-compose-example)
repo. It demonstrates **five enhancers** working together:

| #   | Enhancer         | Purpose                            |
| --- | ---------------- | ---------------------------------- |
| 1   | Counter          | Numeric `count` + increment action |
| 2   | Base             | Saves a `base` number              |
| 3   | Base Plus        | Derived `basePlus = base + 1`      |
| 4   | Input            | `value` + `SET` / `RESET` actions  |
| 5   | Modal (composed) | `isOpen`, `modalType`, `content`   |

```ts
// Using piped for precomposition
const baseEnhancer = piped(
  createBase(baseAtom), // 2️⃣
  createBasePlus(1), // 3️⃣
);

// Main composition
const composedAtom = piped(
  createCounter(counterAtom), // 1️⃣
  baseEnhancer, // 2️⃣ + 3️⃣ (precomposed)
  createInputState(inputAtom, ""), // 4️⃣
  modalEnhancer, // 5️⃣
)(undefined);
```

Resulting state shape:

```ts
{
  count: number;
  base: number;
  basePlus: number;
  value: string;
  modal: {
    isOpen: boolean;
    modalType: ModalType;
    content: string;
  }
}
```

Every enhancer's actions flow through the tuple returned by
`useAtom(composedAtom)`.

---

## Best Practices

1. **Single responsibility** – one slice per enhancer.
2. **Enum actions** – ensures exhaustive checking.
3. **Abort smartly** – return `shouldAbortNextSetter: true` when you _own_
   the action.
4. **Keep `read` pure** – avoid side-effects.
5. **Persist at the edges** – wrap storage-backed atoms, not the whole
   composition.
6. **Use `piped` for related enhancers** – precompose logically grouped enhancers for better organization.
7. **Reserve `toEnhancer` for specific cases** – only use when integrating an existing atom that needs a nested structure.

---

## Troubleshooting

| Symptom              | Checklist                                              |
| -------------------- | ------------------------------------------------------ |
| Action ignored       | Is the enhancer in the pipeline? Enum value correct?   |
| State doesn't update | Did you forget `shouldAbortNextSetter: true`?          |
| Type errors          | Check `DispatcherAction` payload / enum / state types. |

---

## License

MIT © [Diego Herrero](https://github.com/diegodhh)
