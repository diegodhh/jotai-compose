<!-- @format -->

# Jotai Composer

A powerful utility library for composing and managing Jotai atoms in React applications.

[GitHub Repository](https://github.com/diegodhh/jotai-compose)

## Installation

```bash
npm install jotai-composer
# or
yarn add jotai-composer
# or
pnpm add jotai-composer
```

## Features

- Compose multiple Jotai atoms with type safety
- Derive state from existing atoms
- Handle actions with custom setters
- Pipe multiple state transformations
- Type-safe state management

## Quick Start

```tsx
import { atom, useAtom } from "jotai";
import { pipe } from "remeda";
import {
  extendStateAndDeriveFromDecorator,
  ignoreSetterAtom,
} from "jotai-composer";

// Create your base atom
const firstAtom = atom({ first: 1 });

// Create decorators to extend and derive state
// derivation of state
const firstPlusOneDecorator = {
  getter: ({ last }) =>
    atom({
      firstPlusOne: last.first + 1,
    }),
};

// Use pipe to compose multiple state transformations
const composedAtom = pipe(
  firstAtom,
  extendStateAndDeriveFromDecorator(firstPlusOneDecorator),
);

// Use in your component
function MyComponent() {
  const [state, setState] = useAtom(composedAtom);

  // When we call setState, it will delegate to the first atom's setter
  // because the decorator's setter is not defined
  const handleRandomFirst = () => {
    setState({ first: Math.floor(Math.random() * 100) });
  };

  return (
    <div>
      <div>First plus one: {state.firstPlusOne}</div>
      <button onClick={handleRandomFirst}>Increment First</button>
    </div>
  );
}
```

## API Reference

### `extendStateAndDeriveFromDecorator`

A higher-order function that creates a decorator to extend and derive state from an existing atom.

```tsx
type ExtendStateAndDeriveDecorator<TLastState, TParameterExtended, TResult> = {
  getter?: (params: { last: TLastState }) => Atom<TResult> | TResult;
  setter?: (params: {
    stateHelper: {
      last: TLastState;
      get: Getter;
      set: Setter;
    };
    update: TParameterExtended;
  }) => { shouldAbortNextSetter?: boolean };
};
```

## Examples

### Basic Usage

```tsx
// Create a base atom
const firstAtom = atom({ first: 1 });

// Create a simple decorator that adds a derived value
const firstPlusOneDecorator = {
  getter: ({ last }) =>
    atom({
      firstPlusOne: last.first + 1,
    }),
};
```

### Advanced Usage

# Jotai Composer Guide

This guide explains how to use Jotai Composer to manage state in React applications, using our example project's three decorators: Counter, Modal, and Base Plus One.

## What is Jotai Composer?

Jotai Composer is a library that extends Jotai's state management capabilities by allowing you to compose multiple state decorators together. In our example, we'll see how to combine three different decorators to create a cohesive state management solution.

### Key Benefits

- **Modular State Management**: Break down complex state into smaller, manageable pieces
- **Type Safety**: Full TypeScript support for state and actions
- **Composition**: Combine multiple state patterns seamlessly
- **Persistence**: Built-in support for state persistence
- **Performance**: Optimized for React's rendering cycle

## Our Decorators

### 1. Counter Decorator

Manages a simple counter state with increment functionality.

```typescript
// src/decorators/addCounterDecorator.ts
export enum Action {
  ADD_COUNT = "ADD_COUNT",
}

export const createCounterDecorator = (
  countAtom: WritableAtom<number, [number], void>,
) => {
  const counterDecorator: ExtendStateAndDeriveDecorator<
    object,
    DispatcherAction<Action, never>,
    { count: number }
  > = {
    getter: ({ last }) => {
      return atom((get) => ({ count: get(countAtom) }));
    },
    setter: ({ stateHelper: { set, get }, update }) => {
      if (update.type === Action.ADD_COUNT) {
        set(countAtom, get(countAtom) + 1);
        return { shouldAbortNextSetter: true };
      }
      return { shouldAbortNextSetter: false };
    },
  };
  return counterDecorator;
};
```

### 2. Modal Decorator

Manages modal state with open/close functionality.

```typescript
// src/decorators/addModalDecorator.ts
export type ModalState = {
  isOpen: boolean;
  content: string | null;
};

export enum ModalAction {
  OPEN_MODAL = "OPEN_MODAL",
  CLOSE_MODAL = "CLOSE_MODAL",
}

export const createModalDecorator = (
  modalAtom: WritableAtom<ModalState, [ModalState], void>,
) => {
  const modalDecorator: ExtendStateAndDeriveDecorator<
    Partial<object>,
    Required<DispatcherAction<ModalAction, string | null>>,
    ModalState
  > = {
    getter: () => {
      return atom((get) => get(modalAtom));
    },
    setter: ({ stateHelper: { set }, update }) => {
      if (update.type === ModalAction.OPEN_MODAL) {
        set(modalAtom, {
          isOpen: true,
          content: update.payload,
        });
        return { shouldAbortNextSetter: true };
      }

      if (update.type === ModalAction.CLOSE_MODAL) {
        set(modalAtom, {
          isOpen: false,
          content: null,
        });
        return { shouldAbortNextSetter: true };
      }

      return { shouldAbortNextSetter: false };
    },
  };
  return modalDecorator;
};
```

### 3. Base Plus One Decorator

Manages a base number and its derived value (base + 1).

```typescript
// src/decorators/basePlusOneDecorator.ts
export type FirstPlusOne = {
  base: number;
  firstPlusOne: number;
};

export enum BaseAction {
  SAVE_BASE = "SAVE_BASE",
}

export const createBasePlusOneDecorator = (
  baseNumberAtom: WritableAtom<number, [number], void>,
) => {
  const firstPlusOneDecorator: ExtendStateAndDeriveDecorator<
    Partial<object>,
    Required<DispatcherAction<BaseAction, number>>,
    FirstPlusOne
  > = {
    getter: () => {
      return atom((get) => ({
        base: get(baseNumberAtom),
        firstPlusOne: get(baseNumberAtom) + 1,
      }));
    },
    setter: ({ stateHelper: { set }, update }) => {
      if (update.type === BaseAction.SAVE_BASE) {
        set(baseNumberAtom, update.payload ?? 0);
        return { shouldAbortNextSetter: true };
      }
      return { shouldAbortNextSetter: false };
    },
  };
  return firstPlusOneDecorator;
};
```

## Composing the Decorators

In `src/coposedAtom.ts`, we combine all three decorators:

```typescript
import { extendStateAndDeriveFromDecorator } from "jotai-composer";
import { atomWithStorage } from "jotai/utils";
import { pipe } from "remeda";
import { createCounterDecorator } from "./decorators/addCounterDecorator";
import {
  createModalDecorator,
  ModalState,
} from "./decorators/addModalDecorator";
import { createBasePlusOneDecorator } from "./decorators/basePlusOneDecorator";

// Create base atoms
const baseAtom = atomWithStorage("base", 1);
const counterAtom = atomWithStorage("counter", 0);
const modalAtom = atomWithStorage<ModalState>("modal", {
  isOpen: false,
  content: null,
});

// Compose the decorators
export const composedAtom = pipe(
  extendStateAndDeriveFromDecorator(createCounterDecorator(counterAtom))(),
  extendStateAndDeriveFromDecorator(createBasePlusOneDecorator(baseAtom)),
  extendStateAndDeriveFromDecorator(createModalDecorator(modalAtom)),
);
```

## Using in Components

Here's how to use the composed atom in a React component:

```typescript
function App() {
  const [atomValue, dispatch] = useAtom(composedAtom);

  // Counter actions
  const handleAddCount = () => {
    dispatch({ type: Action.ADD_COUNT });
  };

  // Base actions
  const handleSaveBase = () => {
    dispatch({
      type: BaseAction.SAVE_BASE,
      payload: Math.floor(Math.random() * 100),
    });
  };

  // Modal actions
  const handleOpenModal = () => {
    dispatch({
      type: ModalAction.OPEN_MODAL,
      payload: "This is a modal message!",
    });
  };

  const handleCloseModal = () => {
    dispatch({
      type: ModalAction.CLOSE_MODAL,
      payload: null,
    });
  };

  return (
    <div>
      {/* Counter display */}
      <div>
        <span>Count: {atomValue.count}</span>
        <button onClick={handleAddCount}>Add Count</button>
      </div>

      {/* Base display */}
      <div>
        <span>Base: {atomValue.base}</span>
        <span>Base + 1: {atomValue.firstPlusOne}</span>
        <button onClick={handleSaveBase}>Set Random Base</button>
      </div>

      {/* Modal */}
      <button onClick={handleOpenModal}>Open Modal</button>
      {atomValue.isOpen && (
        <div className="modal">
          <div className="modal-content">
            <p>{atomValue.content}</p>
            <button onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Key Concepts Demonstrated

1. **State Separation**

   - Each decorator manages its own piece of state
   - Clear separation of concerns
   - Easy to maintain and test

2. **Action Handling**

   - Each decorator handles its own actions
   - Actions are type-safe
   - Clear action flow

3. **State Composition**

   - Decorators are composed in a specific order
   - State is combined automatically
   - Actions are properly routed

4. **Type Safety**
   - Full TypeScript support
   - Proper type definitions for state and actions
   - Compile-time error checking

## Best Practices Demonstrated

1. **Single Responsibility**

   - Each decorator has one job
   - Clear state boundaries
   - Focused action handling

2. **Type Safety**

   - Proper TypeScript types
   - Enum for actions
   - Type-safe payloads

3. **Persistence**

   - Using `atomWithStorage`
   - State survives page refresh
   - Proper initialization

4. **Composition**
   - Clear composition order
   - Proper action handling
   - State combination

## Troubleshooting

1. **Type Errors**

   - Check action types match exactly
   - Verify payload types
   - Ensure state shapes match

2. **State Updates**

   - Verify `shouldAbortNextSetter`
   - Check action types
   - Ensure proper payload

3. **Composition Issues**
   - Check decorator order
   - Verify state compatibility
   - Check action conflicts

## Resources

- [Jotai Documentation](https://jotai.org/)
- [Jotai Composer GitHub](https://github.com/jotai-composer/jotai-composer)
- [Remeda Documentation](https://remedajs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
