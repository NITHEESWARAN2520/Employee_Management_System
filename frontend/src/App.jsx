import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Validate session token on startup
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Test token validity by querying /api/auth/me
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          
          if (response.ok) {
            setToken(storedToken);
            setUser(parsedUser);
          } else {
            // Token is invalid/expired, perform logout cleanups
            handleLogout();
          }
        } catch (err) {
          console.error('Session validation error:', err);
          handleLogout();
        }
      }
      setCheckingAuth(false);
    };

    verifySession();
  }, []);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken('');
    setUser(null);
    setActiveTab('dashboard');
  };

  if (checkingAuth) {
    return <div className="app-loading">Initializing EMS Session...</div>;
  }

  // If no token or user is present, render the Login page
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Pinned Left Sidebar */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <main className="main-content">
        {/* Main Board views, switching based on user access role */}
        {user.role === 'employee' ? (
          <EmployeeDashboard 
            user={user} 
            activeTab={activeTab} 
            token={token} 
          />
        ) : (
          <AdminDashboard 
            user={user} 
            activeTab={activeTab} 
            token={token} 
          />
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .app-loading {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: var(--text-secondary);
          background-color: var(--bg-primary);
        }
      `}} />
    </div>
  );
}
