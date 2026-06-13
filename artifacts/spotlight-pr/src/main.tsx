import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Registers the Supabase-backed API handler so the app runs serverless
// (all /api/* calls are routed to Supabase). Must run before any data fetch.
import "./lib/apiHandler";

createRoot(document.getElementById("root")!).render(<App />);
