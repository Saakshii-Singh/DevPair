import React from 'react';
import { Navigate } from 'react-router-dom';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const user = localStorage.getItem('vantage_user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}