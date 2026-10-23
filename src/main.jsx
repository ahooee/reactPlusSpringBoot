import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

window.onerror = (msg, url, line, col, error) => {
    console.error("GLOBAL ERROR:", msg, url, line, col, error);
};

window.onunhandledrejection = (e) => {
    console.error("UNHANDLED REJECTION:", e.reason);
};

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ToastProvider>
            <AuthProvider>
                <ThemeProvider>
                    <LanguageProvider>
                        <CartProvider>
                            <App />
                        </CartProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </AuthProvider>
        </ToastProvider>
    </StrictMode>
);
