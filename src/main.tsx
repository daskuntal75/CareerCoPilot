import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: Check if environment variables are loaded (rebuild trigger)
console.log('ENV Check:', {
  url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'MISSING',
});

// Mount the application
createRoot(document.getElementById("root")!).render(<App />);
