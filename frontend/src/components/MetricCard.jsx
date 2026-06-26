import React from 'react';

/**
 * MetricCard - Displays a single stat in the dashboard metrics grid
 * Uses CSS classes from index.css: .metric-card, .metric-icon, .metric-label, .metric-value, .metric-desc
 */
export default function MetricCard({ title, value, icon, desc, iconBg }) {
  return (
    <div className="metric-card">
      {/* Icon badge */}
      <div
        className="metric-icon"
        style={{ background: iconBg || 'rgba(181, 183, 255, 0.12)' }}
      >
        {icon}
      </div>

      {/* Label */}
      <div className="metric-label">{title}</div>

      {/* Main Value */}
      <div className="metric-value">{value}</div>

      {/* Optional description */}
      {desc && <div className="metric-desc">{desc}</div>}
    </div>
  );
}
