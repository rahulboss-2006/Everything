import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

// GitHub Pages SPA route restore
const redirect = sessionStorage.getItem("redirect");

if (redirect) {
  sessionStorage.removeItem("redirect");

  const redirectUrl = new URL(redirect);

  if (
    redirectUrl.origin === window.location.origin &&
    redirectUrl.pathname !== window.location.pathname
  ) {
    window.history.replaceState(
      null,
      "",
      redirectUrl.pathname + redirectUrl.search + redirectUrl.hash
    );
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
