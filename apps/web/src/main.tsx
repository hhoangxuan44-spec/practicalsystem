import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createApi } from "./lib/api.ts";
import { AppProvider } from "./lib/app.tsx";
import { applyTheme, readTheme } from "./lib/theme.ts";
import "./styles.css";

applyTheme(readTheme());

const api = createApi();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider api={api}>
      <App />
    </AppProvider>
  </StrictMode>,
);
