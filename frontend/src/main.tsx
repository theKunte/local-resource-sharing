import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ResourceProvider } from "./context/ResourceContext";
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ResourceProvider>
        <App />
      </ResourceProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
