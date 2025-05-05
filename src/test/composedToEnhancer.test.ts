import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { describe, expect, it } from "vitest";
import { composedToEnhancer } from "../composedToEnhancer";
import { enhanceWith } from "../enhanceWith";

describe("composedToEnhancer", () => {
  it("should convert a composed atom to an enhancer with direct state merging", () => {
    // Create a base atom
    const counterAtom = atom({ count: 5 });

    // Convert it to an enhancer
    const enhancer = composedToEnhancer({ composed: counterAtom });

    // Create a new atom using the enhancer
    const enhancedAtom = enhanceWith(enhancer)();

    // Set up a store to test
    const store = createStore();

    // Test that the state is directly merged
    expect(store.get(enhancedAtom)).toEqual({ count: 5 });

    // Test that updates to the original atom are reflected
    store.set(counterAtom, { count: 10 });
    expect(store.get(enhancedAtom)).toEqual({ count: 10 });
  });

  it("should convert a composed atom to an enhancer with a keyString", () => {
    // Create a base atom
    const counterAtom = atom({ count: 5 });

    // Convert it to an enhancer with a keyString
    const enhancer = composedToEnhancer({
      composed: counterAtom,
      keyString: "counter",
    });

    // Create a new atom using the enhancer
    const enhancedAtom = enhanceWith(enhancer)();

    // Set up a store to test
    const store = createStore();

    // Test that the state is nested under the key
    expect(store.get(enhancedAtom)).toEqual({ counter: { count: 5 } });

    // Test that updates to the original atom are reflected
    store.set(counterAtom, { count: 10 });
    expect(store.get(enhancedAtom)).toEqual({ counter: { count: 10 } });
  });

  it("should support write operations", () => {
    // Create a base atom
    const counterAtom = atom({ count: 5 });

    // Convert it to an enhancer
    const enhancer = composedToEnhancer({ composed: counterAtom });

    // Create a new atom using the enhancer
    const enhancedAtom = enhanceWith(enhancer)();

    // Set up a store to test
    const store = createStore();

    // Test the initial state
    expect(store.get(enhancedAtom)).toEqual({ count: 5 });

    // Update through the enhanced atom
    store.set(enhancedAtom, { count: 15 });

    // The update should propagate to the original atom
    expect(store.get(counterAtom)).toEqual({ count: 15 });
    expect(store.get(enhancedAtom)).toEqual({ count: 15 });
  });

  it("should support write operations with keyString", () => {
    // Create a base atom
    const counterAtom = atom({ count: 5 });

    // Convert it to an enhancer with a keyString
    const enhancer = composedToEnhancer({
      composed: counterAtom,
      keyString: "counter",
    });

    // Create a new atom using the enhancer
    const enhancedAtom = enhanceWith(enhancer)();

    // Set up a store to test
    const store = createStore();

    // Updates to the enhanced atom should propagate to the original atom
    store.set(enhancedAtom, { count: 20 });

    // Even though we access the counter under a key in the enhanced atom,
    // the update is passed directly to the original atom
    expect(store.get(counterAtom)).toEqual({ count: 20 });
    expect(store.get(enhancedAtom)).toEqual({ counter: { count: 20 } });
  });
});
