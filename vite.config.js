import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // Enable cross-origin isolation
  // Required for WebAssembly multi-threading
  server: {
    headers: {
      "Cross-Origin-Opener-Policy":
        "same-origin",

      "Cross-Origin-Embedder-Policy":
        "require-corp",
    },
  },

  // Same headers for production preview
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy":
        "same-origin",

      "Cross-Origin-Embedder-Policy":
        "require-corp",
    },
  },
});
