import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: Check if environment variables are loaded (force env sync)
console.log('ENV Check - Build ID:', Date.now(), {
  url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING',
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID ? 'SET' : 'MISSING',
});

// Mount the application
createRoot(document.getElementById("root")!).render(<App />);
