import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Page from "./pages/Page";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import ProductDetail from "./pages/ProductDetail";
import Blog from "./pages/Blog";
import Basket from "./pages/Basket";
import PostDetail from "./pages/PostDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Support from "./pages/Support";
import Notifications from "./pages/Notifications";
import Orders from "./pages/Orders";
import Account from "./pages/Account";
import Dashboard from "./pages/admin/Dashboard";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminPages from "./pages/admin/AdminPages";
import AdminMenus from "./pages/admin/AdminMenus";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminRail from "./pages/admin/AdminRail";
import AdminPostRail from "./pages/admin/AdminPostRail";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminBot from "./pages/admin/AdminBot";
import AdminBookUpload from "./pages/admin/AdminBookUpload";
import AdminMessenger from "./pages/admin/AdminMessenger";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminBackup from "./pages/admin/AdminBackup";
import OrderTrack from "./pages/OrderTrack";
import ProtectedRoute from "./components/ProtectedRoute";
import CartDrawer from "./components/CartDrawer";
import Navbar from "./components/Navbar";
import PaperSoon from "./components/PaperSoon";
import { ToastProvider } from "./context/ToastContext";

function Admin({ children }) {
    return (
        <>
            <Navbar />
            <ProtectedRoute adminOnly>{children}</ProtectedRoute>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<Navigate to="/books" replace />} />
                <Route path="/books" element={<Books kind="all" />} />
                <Route path="/books/ebooks" element={<Books kind="ebook" />} />
                <Route path="/books/paper-books" element={<PaperSoon redirect="/books/ebooks" />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/shop/:slug" element={<ProductDetail />} />
                <Route path="/basket" element={<Basket />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<PostDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/orders/track/:token" element={<OrderTrack />} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

                <Route path="/admin" element={<Admin><Dashboard /></Admin>} />
                <Route path="/admin/posts" element={<Admin><AdminPosts /></Admin>} />
                <Route path="/admin/products" element={<Admin><AdminProducts /></Admin>} />
                <Route path="/admin/categories" element={<Admin><AdminCategories /></Admin>} />
                <Route path="/admin/pages" element={<Admin><AdminPages /></Admin>} />
                <Route path="/admin/menus" element={<Admin><AdminMenus /></Admin>} />
                <Route path="/admin/media" element={<Admin><AdminMedia /></Admin>} />
                <Route path="/admin/rail" element={<Admin><AdminRail /></Admin>} />
                <Route path="/admin/post-rail" element={<Admin><AdminPostRail /></Admin>} />
                <Route path="/admin/settings" element={<Admin><AdminSettings /></Admin>} />
                <Route path="/admin/bot" element={<Admin><AdminBot /></Admin>} />
                <Route path="/admin/books-upload" element={<Admin><AdminBookUpload /></Admin>} />
                <Route path="/admin/messenger" element={<Admin><AdminMessenger /></Admin>} />
                <Route path="/admin/tickets" element={<Admin><AdminTickets /></Admin>} />
                <Route path="/admin/orders" element={<Admin><AdminOrders /></Admin>} />
                <Route path="/admin/backup" element={<Admin><AdminBackup /></Admin>} />

                <Route path="*" element={<Page />} />
                </Routes>
                <CartDrawer />
                <PaperSoon />
            </ToastProvider>
        </BrowserRouter>
    );
}

export default App;
