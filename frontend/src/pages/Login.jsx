import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  // Toggle between Sign In and Sign Up modes
  const [isSignup, setIsSignup] = useState(false);

  // Shared fields (used by both Sign In and Sign Up)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up–only fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset every field when the user switches modes
  const toggleMode = () => {
    setIsSignup((prev) => !prev);
    setUsername('');
    setPassword('');
    setName('');
    setEmail('');
    setDepartment('');
    setSalary('');
    setContactInfo('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    if (!username || !password) {
      return setError('Please enter both username and password.');
    }

    if (isSignup && (!name || !email)) {
      return setError('Name and email are required for sign up.');
    }

    setLoading(true);

    try {
      // Choose endpoint based on current mode
      const url = isSignup ? '/api/auth/register' : '/api/auth/login';

      // Build the request body
      const body = isSignup
        ? {
            username,
            password,
            name,
            email,
            department,
            salary: salary ? Number(salary) : undefined,
            contactInfo,
            role: 'employee', // New accounts always default to employee
          }
        : { username: username.trim(), password };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || (isSignup ? 'Registration failed.' : 'Login failed. Please check credentials.')
        );
      }

      // Hand the token and user object back to the parent App
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative background glow */}
      <div className="login-backdrop-glow"></div>

      <div className="login-card">
        {/* ---- Brand header ---- */}
        <div className="login-brand mb-3">
          <span className="login-logo">💼</span>
          <h1>Employee Management System</h1>
          <p className="login-subtitle">
            {isSignup ? 'Create a new employee account' : 'Sign in to your workplace account'}
          </p>
        </div>

        {/* ---- Error alert ---- */}
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {/* ---- Form ---- */}
        <form onSubmit={handleSubmit}>
          {/* Username — always visible */}
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input"
              placeholder="e.g., johndoe or john@company.com"
              required
            />
          </div>

          {/* Password — always visible */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* ---- Extra fields shown only in Sign Up mode ---- */}
          {isSignup && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., john@company.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="department">Department</label>
                <input
                  type="text"
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., Engineering"
                />
              </div>

              <div className="form-group">
                <label htmlFor="salary">Salary</label>
                <input
                  type="number"
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., 50000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactInfo">Contact Info</label>
                <input
                  type="text"
                  id="contactInfo"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="glass-input"
                  placeholder="e.g., +1 555-0123"
                />
              </div>
            </>
          )}

          {/* Submit button */}
          <button type="submit" className="btn btn-primary w-100 mt-2" disabled={loading}>
            {loading
              ? isSignup
                ? 'Creating Account...'
                : 'Authenticating...'
              : isSignup
                ? 'Sign Up'
                : 'Sign In'}
          </button>
        </form>

        {/* ---- Toggle link between Sign In / Sign Up ---- */}
        <div className="login-toggle mt-3">
          {isSignup ? (
            <span>
              Already have an account?{' '}
              <button type="button" className="toggle-link" onClick={toggleMode}>
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button type="button" className="toggle-link" onClick={toggleMode}>
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>

      {/* ---- Login-specific inline styles ---- */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Full-screen centered wrapper */
        .login-page {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: var(--bg-page);
          padding: 1.5rem;
          overflow: hidden;
        }

        /* Subtle purple radial glow behind the card */
        .login-backdrop-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 77, 255, 0.12) 0%, transparent 70%);
          filter: blur(40px);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
          pointer-events: none;
        }

        /* Card container */
        .login-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 2rem;
          z-index: 10;
          box-shadow: var(--shadow-card);
          animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Brand / header area */
        .login-brand {
          text-align: center;
        }

        .login-logo {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .login-brand h1 {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          color: var(--text-secondary);
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        /* Utility helpers */
        .w-100 { width: 100%; }
        .mb-3  { margin-bottom: 1rem; }
        .mt-2  { margin-top: 0.75rem; }
        .mt-3  { margin-top: 1rem; }

        /* Error banner */
        .alert-danger {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: center;
        }

        /* Toggle area at the bottom of the card */
        .login-toggle {
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .toggle-link {
          background: none;
          border: none;
          color: var(--accent-purple);
          font-weight: 600;
          font-size: 0.85rem;
          font-family: inherit;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s ease;
        }

        .toggle-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
      `}} />
    </div>
  );
}
