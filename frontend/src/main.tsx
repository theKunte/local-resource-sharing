import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ResourceProvider } from "./context/ResourceContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { initializeFirebase } from "./firebase.ts";

// Initialize Firebase with runtime config before rendering
initializeFirebase().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ResourceProvider>
          <App />
        </ResourceProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}).catch((error) => {
  console.error("Failed to initialize application:", error);
  // Render error state
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <div style={{ padding: '20px', color: 'red' }}>
      <h1>Application Initialization Failed</h1>
      <p>Failed to load configuration. Please check the console for details.</p>
    </div>
  );
});
