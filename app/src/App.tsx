import './App.css'
import { ThemeProvider } from './components/providers/themeProvider'
import { BrowserRouter, Outlet, Route, Routes, useRouteError } from 'react-router-dom'
import React from 'react';
import Login from './routes/login/Login';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/controls/ProtectedRoutes';
import { Toaster } from 'sonner'
import HomeView from './routes/dashboard/Home';
import { Layout } from './routes/dashboard/Layout';
import AnalyticsView from './routes/dashboard/Analytics';
import ConfigView from './routes/dashboard/Config';


function ErrorBoundary() {
  const error: Error = useRouteError() as Error;
  return (
    <p> Error: {error.message} </p>
  );
}

function App() {

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Toaster richColors />
      <AuthProvider>
        <React.StrictMode>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={<Login />}
                errorElement={<ErrorBoundary />}
              />
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Outlet />
                    </Layout>
                  </ProtectedRoute>
                }
                errorElement={<ErrorBoundary />}
              >
                <Route index element={<HomeView />} />
                <Route path="config" element={<ConfigView />} />
                <Route path="analytics" element={<AnalyticsView />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </React.StrictMode>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
