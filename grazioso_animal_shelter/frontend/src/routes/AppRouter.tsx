import Container from "@mui/material/Container";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { NavBar } from "../components/NavBar";
import { AddAnimalPage } from "../pages/AddAnimalPage";
import { AdminPage } from "../pages/AdminPage";
import { AnimalDetailPage } from "../pages/AnimalDetailPage";
import { AnimalManagePage } from "../pages/AnimalManagePage";
import { DashboardPage } from "../pages/DashboardPage";
import { EditAnimalPage } from "../pages/EditAnimalPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";

export const AppRouter = () => (
  <>
    <NavBar />
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/animals/new"
          element={
            <RequireRole allowed={["staff", "admin"]}>
              <AddAnimalPage />
            </RequireRole>
          }
        />
        <Route
          path="/animals/manage"
          element={
            <RequireRole allowed={["staff", "admin"]}>
              <AnimalManagePage />
            </RequireRole>
          }
        />
        <Route
          path="/animals/:id"
          element={
            <RequireAuth>
              <AnimalDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/animals/:id/edit"
          element={
            <RequireRole allowed={["staff", "admin"]}>
              <EditAnimalPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole allowed={["admin"]}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Container>
  </>
);
