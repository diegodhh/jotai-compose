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
   1. [Enhancer](#enhancer)
   2. [`enhanceWith`](#enhancewith)
   3. [`composedToEnhancer`](#composedtoenhancer)
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
import { enhanceWith, AtomEnhancer, DispatcherAction } from "jotai-composer";

/* 1. Base atom */
const countAtom = atom(0);

/* 2. Enhancer */
export enum CounterAction {
  ADD = "ADD",
}
const counterEnhancer: AtomEnhancer<
  object,
  DispatcherAction<CounterAction>,
  { count: number }
> = {
  read: () => atom((get) => ({ count: get(countAtom) })),
  write: ({ stateHelper: { set, get }, update }) => {
    if (update.type === CounterAction.ADD) {
      set(countAtom, get(countAtom) + 1);
      return { shouldAbortNextSetter: true };
    }
    return { shouldAbortNextSetter: false };
  },
};

/* 3. Compose */
export const composedAtom = pipe(enhanceWith(counterEnhancer)());

/* 4. Use in React */
function Counter() {
  const [state, dispatch] = useAtom(composedAtom);

  return (
    <button onClick={() => dispatch({ type: CounterAction.ADD })}>
      {state.count}
    </button>
  );
}
```

---

## Core Concepts

### Enhancer

An **enhancer** owns a slice of state (`read`) and can react to dispatched
**actions** (`write`). It is just a plain object that fits the
`AtomEnhancer` type:

```ts
export type AtomEnhancer<
  TLastState extends object,   // State exposed _before_ this enhancer
  TParam     extends object,   // Allowed payload for dispatch()
  TResult    extends object    // State exposed _by_ this enhancer
> = {
  read?:  ({ last }: { last: TLastState }) => Atom<TResult> | TResult;
  write?: ({
    stateHelper: { last: TLastState; get: Getter; set: Setter };
    update: TParam;
  }) => { shouldAbortNextSetter?: boolean };
};
```

_Return `shouldAbortNextSetter: true` if the action has been fully
processed and should **not** propagate to previous atoms._

---

### `enhanceWith`

`enhanceWith(enhancer)` returns a **function** that receives the previous
atom and returns a new **derived atom** that merges both states and
forwards `write` calls.

```ts
const todoEnhancer   = …;
const filterEnhancer = …;

const composedAtom = pipe(
  enhanceWith(todoEnhancer)(),       // start the chain
  enhanceWith(filterEnhancer),       // add another slice
);
```

---

### `composedToEnhancer`

Sometimes you need to embed an **already composed** atom inside a larger
pipeline. `composedToEnhancer` adapts any existing atom into an
enhancer:

```ts
const userAtom = /* exposes { id, name } */

const userEnhancer = composedToEnhancer({
  composed: userAtom,
  keyString: "user",   // optional – nest under `state.user`
});
```

---

## API Reference

| Function                                       | Description                                           |
| ---------------------------------------------- | ----------------------------------------------------- |
| `enhanceWith(enhancer)()`                      | Starts a chain with the given enhancer.               |
| `enhanceWith(enhancer)(prevAtom)`              | Adds the enhancer on top of `prevAtom`.               |
| `composedToEnhancer({ composed, keyString? })` | Wrap an existing atom so it behaves like an enhancer. |
| `ignoreSetterAtom(atom)`                       | Read-only mirror – **any** `set` is silently ignored. |

All helpers are fully typed—all your `state`, `actions` and `payloads`
get inferred end-to-end.

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
const composedAtom = pipe(
  enhanceWith(createCounter(counterAtom))(), // 1️⃣
  enhanceWith(baseEnhancer), // 2️⃣ + 3️⃣ (sub-composition)
  enhanceWith(createInputState(inputAtom, "")),
  enhanceWith(modalEnhancer),
);
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
