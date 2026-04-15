import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@tanstack/react-query")) {
            return "query-vendor";
          }

          if (id.includes("@dnd-kit")) {
            return "dnd-vendor";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("react-day-picker") ||
            id.includes("input-otp")
          ) {
            return "ui-vendor";
          }

          if (id.includes("lucide-react") || id.includes("react-icons")) {
            return "icons-vendor";
          }

          if (
            id.includes("recharts") ||
            id.includes("framer-motion") ||
            id.includes("embla-carousel-react") ||
            id.includes("lottie-react") ||
            id.includes("lottie-web")
          ) {
            return "visual-vendor";
          }

          if (
            id.includes("@supabase/supabase-js") ||
            id.includes("openai") ||
            id.includes("zod") ||
            id.includes("date-fns")
          ) {
            return "app-vendor";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
