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
  const handleIncrement = () => {
    setState({ first: state.first + 1 });
  };

  return (
    <div>
      <div>First plus one: {state.firstPlusOne}</div>
      <button onClick={handleIncrement}>Increment First</button>
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

// Without ignoreSetterAtom, any update would reach firstAtom
const unsafeComposedAtom = pipe(
  firstAtom,
  extendStateAndDeriveFromDecorator(firstPlusOneDecorator),
);

// With ignoreSetterAtom, updates that aren't handled by decorators
// won't reach firstAtom, preventing unexpected state changes
const safeComposedAtom = pipe(
  ignoreSetterAtom(firstAtom),
  extendStateAndDeriveFromDecorator(firstPlusOneDecorator),
);
```

### Advanced Usage

Here's a more complex example showing multiple state transformations, actions, and derived state:

```tsx
import { atom, useAtom } from "jotai";
import { pipe } from "remeda";
import {
  extendStateAndDeriveFromDecorator,
  ignoreSetterAtom,
} from "jotai-composer";

// Base state
type First = { first: number };
const firstAtom = atom<First>({ first: 1 });

// First decorator - simple derivation
type FirstPlusOneState = { firstPlusOne: number };
const firstPlusOneDecorator = {
  getter: ({ last }) =>
    atom({
      firstPlusOne: last.first + 1,
    }),
};

// Second decorator - modal state with actions
type ModalAction = { type: "OPEN_MODAL"; payload: boolean };
type ModalState = { modalOpen: boolean };
const modalAtom = atom<ModalState>({ modalOpen: false });

const modalDecorator = {
  getter: () => atom((get) => get(modalAtom)),
  setter: ({ stateHelper: { set }, update }) => {
    if (update.type === "OPEN_MODAL") {
      set(modalAtom, { modalOpen: update.payload });
    }
    return { shouldAbortNextSetter: false };
  },
};

// Third decorator - combined state with actions
type CombinedAction = { type: "ADD_VALUE"; payload: number };
type CombinedState = { combined: number };
const additionalAtom = atom<number>(0);

const combinedDecorator = {
  getter: ({ last }) =>
    atom((get) => ({
      combined: last.first + get(additionalAtom),
    })),
  setter: ({ stateHelper: { set }, update }) => {
    if (update.type === "ADD_VALUE") {
      set(additionalAtom, (prev) => prev + update.payload);
    }
    return { shouldAbortNextSetter: false };
  },
};

// Compose all decorators
const composedAtom = pipe(
  ignoreSetterAtom(firstAtom),
  extendStateAndDeriveFromDecorator(firstPlusOneDecorator),
  extendStateAndDeriveFromDecorator(modalDecorator),
  extendStateAndDeriveFromDecorator(combinedDecorator),
);

// Use in a component
function StoreComponent() {
  const [state, update] = useAtom(composedAtom);

  return (
    <div>
      <h3>Store State</h3>
      <div>
        <p>First: {state.first}</p>
        <p>First plus one: {state.firstPlusOne}</p>
        <p>Modal: {state.modalOpen ? "Open" : "Closed"}</p>
        <p>Combined: {state.combined}</p>
      </div>
      <div>
        <button onClick={() => update({ type: "ADD_VALUE", payload: 5 })}>
          Add 5
        </button>
        <button onClick={() => update({ type: "OPEN_MODAL", payload: true })}>
          Open Modal
        </button>
        <button onClick={() => update({ type: "OPEN_MODAL", payload: false })}>
          Close Modal
        </button>
      </div>
    </div>
  );
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC © [Your Name]
