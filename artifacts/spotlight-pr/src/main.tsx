import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Registers the Supabase-backed API handler so the generated API client
// (still used by the admin panel and business management pages) routes its
// requests to Supabase instead of the retired Express backend.
import "@/lib/apiHandler";

createRoot(document.getElementById("root")!).render(<App />);
