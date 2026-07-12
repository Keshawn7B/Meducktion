import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // Serial files avoid jsdom timing contention on OneDrive-backed workspaces.
    fileParallelism: false,
  },
});
