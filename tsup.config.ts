/** @format */
import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: !options.watch, // ✅ Limpia solo si NO es modo watch
  splitting: false,
  minify: !options.watch, // ✅ No minifiques en desarrollo
  target: "es2020",
  outDir: "dist",
  external: ["react", "jotai"], // opcional, si hacés una lib
}));
