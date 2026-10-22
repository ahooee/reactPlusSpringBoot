import { createContext, useCallback, useContext, useRef, useState } from "react";
import "./Toast.css";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback(id => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const showToast = useCallback(message => {
        const id = nextId++;
        setToasts(prev => [...prev.slice(-2), { id, message }]);
        timers.current.set(id, setTimeout(() => dismiss(id), 2800));
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-host" aria-live="polite">
                {toasts.map(t => (
                    <button key={t.id} type="button" className="toast" onClick={() => dismiss(t.id)}>
                        {t.message}
                    </button>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    return ctx || { showToast: () => {} };
}
