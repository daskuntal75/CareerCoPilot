import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Fallback environment variables for Supabase connection
  // These are used when .env file is not properly synced
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || "https://vyijbdrvixngzklwgdsw.supabase.co"),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aWpiZHJ2aXhuZ3prbHdnZHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTQwNTcsImV4cCI6MjA4MzU3MDA1N30.0YXt5r-1Z8i8FfIcgEU1ddOSWB1x2ZOgN8aOHBaVD_Y"),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(process.env.VITE_SUPABASE_PROJECT_ID || "vyijbdrvixngzklwgdsw"),
  },
  build: {
    // Generate source maps for production debugging (optional)
    sourcemap: mode === "development",
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core React framework - rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI library - Radix primitives
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-select",
            "@radix-ui/react-switch",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-label",
          ],
          // Animation library - framer-motion is used widely
          "vendor-animation": ["framer-motion"],
          // Charts - only loaded on analytics pages
          "vendor-charts": ["recharts"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // Form handling
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Date utilities
          "vendor-date": ["date-fns"],
          // Icons - lucide is large
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "@supabase/supabase-js",
    ],
    // Exclude heavy libraries that are dynamically imported
    exclude: ["docx"],
  },
}));
