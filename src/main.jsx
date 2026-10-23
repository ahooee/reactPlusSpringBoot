import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider>
                    <CartProvider>
                        <App />
                    </CartProvider>
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    </StrictMode>
);
