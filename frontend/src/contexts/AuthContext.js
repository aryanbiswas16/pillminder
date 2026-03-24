import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Demo users — auth is cosmetic, these map to seeded DB records
const DEMO_ACCOUNTS = {
  resident: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'resident@demo.com',
    firstName: 'Margaret',
    lastName: 'Thompson',
    role: 'resident',
    token: 'demo-resident'
  },
  caregiver: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'caregiver@demo.com',
    firstName: 'Sarah',
    lastName: 'Thompson',
    role: 'caregiver',
    token: 'demo-caregiver'
  },
  nurse: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'nurse@demo.com',
    firstName: 'James',
    lastName: 'Rodriguez',
    role: 'nurse',
    token: 'demo-nurse'
  }
};

const DEFAULT_SETTINGS = { fontScale: 1.0, highContrast: false };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('appSettings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const updateSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem('appSettings', JSON.stringify(next));

    // Persist to backend (best-effort, ignore errors)
    try {
      const fontPref = next.fontScale >= 1.25 ? 'extra-large' : next.fontScale >= 1.1 ? 'large' : 'normal';
      await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/users/me`, {
        fontSizePreference: fontPref,
        highContrastMode: next.highContrast,
      });
    } catch { /* cosmetic demo — ignore */ }
  };

  // Login is cosmetic — instantly succeeds with the chosen demo role
  const login = async (email, password, role = 'resident') => {
    // Simulate brief loading for realistic feel
    await new Promise(r => setTimeout(r, 400));

    const demo = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.resident;
    const { token, ...userData } = demo;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setUser(userData);
    return { success: true };
  };

  // Register is also cosmetic — picks the right demo account for the role
  const register = async (userData) => {
    await new Promise(r => setTimeout(r, 600));

    // nurse is merged into caregiver in the new UI
    const role = userData.role === 'nurse' ? 'caregiver' : (userData.role || 'resident');
    const demo = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.resident;
    const { token, ...demoUser } = demo;

    // Use the name they typed (feels real)
    const finalUser = {
      ...demoUser,
      firstName: userData.firstName || demoUser.firstName,
      lastName: userData.lastName || demoUser.lastName,
      email: userData.email || demoUser.email,
      // store the resident they linked (caregiver flow)
      linkedResidentEmail: userData.linkedResidentEmail || null,
    };

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(finalUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    setUser(finalUser);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    settings,
    updateSettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
