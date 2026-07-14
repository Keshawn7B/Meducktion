import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Meducktion/" : "/",
  plugins: [react()],
  test: {
    environment: "node",
    // Serial files avoid jsdom timing contention on OneDrive-backed workspaces.
    fileParallelism: false,
    exclude: [...configDefaults.exclude, "src/multiplayer-room/firestore.rules.test.ts"],
    // The legacy jsdom interaction suite can exceed Vitest's 5s default on
    // Windows when the OneDrive-backed workspace is under load.
    testTimeout: 10_000,
  },
});
