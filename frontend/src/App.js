import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PaperProvider } from "@/context/PaperContext";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import PaperHub from "@/pages/PaperHub";
import Saved from "@/pages/Saved";
import Timetable from "@/pages/Timetable";
import Exams from "@/pages/Exams";
import Planner from "@/pages/Planner";
import Progress from "@/pages/Progress";
import Admin from "@/pages/Admin";

const Splash = () => (
  <div className="min-h-screen grid place-items-center" data-testid="app-loading">
    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const Protected = ({ children, admin }) => {
  const { user } = useAuth();
  if (user === null) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

const LoginRoute = () => {
  const { user } = useAuth();
  if (user === null) return <Splash />;
  return user ? <Navigate to="/" replace /> : <AuthPage />;
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="App">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<Protected><PaperProvider><Layout /></PaperProvider></Protected>}>
                <Route path="/" element={<Home />} />
                <Route path="/papers" element={<PaperHub />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </div>
    </ThemeProvider>
  );
}

export default App;
