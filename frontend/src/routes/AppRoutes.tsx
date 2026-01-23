import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { ViewMode } from '@/types/viewMode';

function RedirectToLastViewMode() {
  const [lastViewMode] = useLocalStorage<ViewMode>('lastViewMode', 'grid');
  return <Navigate to={`/${lastViewMode}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RedirectToLastViewMode />} />
      <Route path="/day/:date?" element={<MainLayout viewMode="day" />} />
      <Route path="/grid/:date?" element={<MainLayout viewMode="grid" />} />
      <Route path="/user/:date?" element={<MainLayout viewMode="user" />} />
      <Route path="/hour/:date?" element={<MainLayout viewMode="hour" />} />
      <Route path="/tasks" element={<MainLayout />} />
      <Route path="*" element={<RedirectToLastViewMode />} />
    </Routes>
  );
}
