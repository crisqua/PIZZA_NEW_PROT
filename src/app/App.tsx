import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

const ClientApp = lazy(() => import('./pages/ClientApp'));
const RestaurantApp = lazy(() => import('./pages/RestaurantApp'));
const AdminApp = lazy(() => import('./pages/AdminApp'));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">Carregando...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/client" element={<ClientApp />} />
          <Route path="/restaurant" element={<RestaurantApp />} />
          <Route path="/admin" element={<AdminApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
