import React from 'react';

/**
 * Sidebar — main navigation panel for the Employee Management System.
 *
 * Props
 * -----
 * user        – currently logged-in user object (must have a .role field)
 * activeTab   – string id of the currently selected tab
 * setActiveTab – callback to change the active tab
 * onLogout    – callback fired when the user clicks "Sign Out"
 *
 * All styling comes from CSS classes defined in index.css (Spectra dark-slate theme).
 */
export default function Sidebar({ user, activeTab, setActiveTab, onLogout }) {

  // ── Build the list of nav tabs based on the user's role ──────────────
  const getNavTabs = () => {
    // Admin and HR users see the management-oriented menu
    if (user.role === 'admin' || user.role === 'hr') {
      return [
        { id: 'dashboard',  label: 'Dashboard',        icon: '📊' },
        { id: 'employees',  label: 'Employees',        icon: '👥' },
        { id: 'leaves',     label: 'Leave Approvals',  icon: '✉️' },
        { id: 'salaries',   label: 'Payroll',          icon: '💳' },
      ];
    }

    // Regular employees see their personal menu
    return [
      { id: 'dashboard',  label: 'My Dashboard',    icon: '🏠' },
      { id: 'attendance', label: 'Attendance',       icon: '⏰' },
      { id: 'leaves',     label: 'Leave Requests',  icon: '✉️' },
      { id: 'salaries',   label: 'Payslips',        icon: '💰' },
    ];
  };

  const tabs = getNavTabs();

  return (
    <aside className="sidebar">

      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div className="sidebar-brand">
        {/* Small square icon with a hexagon symbol */}
        <div className="brand-icon">⬡</div>
        {/* App name */}
        <span className="brand-name">SPECTRA</span>
      </div>

      {/* ── Navigation links ─────────────────────────────────────────── */}
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            // Add the 'active' modifier when this tab is selected
            className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {/* Icon on the left */}
            <span className="nav-icon">{tab.icon}</span>
            {/* Label text */}
            <span className="nav-text">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer with logout button (pinned to bottom via CSS) ──── */}
      <div className="sidebar-footer">
        <button className="nav-link logout-btn" onClick={onLogout}>
          <span className="nav-icon">🚪</span>
          <span className="nav-text">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
