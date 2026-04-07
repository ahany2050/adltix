import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Shopify needs to be the host HMR server
declare module "react-router" {
  interface Future {
    unstable_optimizeDeps: true;
  }
}

export default defineConfig({
  plugins: [
    reactRouter({
      future: {
        unstable_optimizeDeps: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    // Allow imports from workspace packages
    fs: {
      allow: ["../.."],
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
});
