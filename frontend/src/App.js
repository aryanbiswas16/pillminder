import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResidentDashboard from './pages/ResidentDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import ResidentDetail from './pages/ResidentDetail';
import ResidentManagePage from './pages/ResidentManagePage';

function App() {
  const { user, loading, settings } = useAuth();
  const fontScale = settings?.fontScale ?? 1.0;
  const highContrast = settings?.highContrast ?? false;

  const renderRoutes = () => {
    if (!user) {
      return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      );
    }

    const getDashboard = () => {
      switch (user.role) {
        case 'resident':
          return <ResidentDashboard />;
        case 'caregiver':
        case 'nurse':   // nurse is now merged into the caregiver/staff flow
          return <CaregiverDashboard />;
        default:
          return <ResidentDashboard />;
      }
    };

    return (
      <Routes>
        <Route path="/" element={getDashboard()} />
        <Route path="/resident/:residentId" element={<ResidentDetail />} />
        <Route path="/manage/:residentId" element={<ResidentManagePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  if (loading) {
    return (
      <div className="app-shell-outer">
        <div className="app-shell app-shell-scroll flex items-center justify-center">
          <div className="text-2xl font-bold text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-outer">
      <div
        className={`app-shell${highContrast ? ' high-contrast' : ''}`}
        style={{ fontSize: `${fontScale}em` }}
      >
        <div className="app-shell-scroll">
          {renderRoutes()}
        </div>
      </div>
    </div>
  );
}

export default App;
