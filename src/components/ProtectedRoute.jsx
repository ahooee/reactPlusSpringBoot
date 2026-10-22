import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading, isAdmin } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();

    if (loading) return <p className="page-state">{t("common.loading")}</p>;
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
    return children;
}
