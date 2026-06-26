import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeDashboard — Employee-facing dashboard for the Spectra dark-slate theme.
// Props: { user, activeTab, token }
// Tabs: dashboard | attendance | leaves | salaries
// ─────────────────────────────────────────────────────────────────────────────

export default function EmployeeDashboard({ user, activeTab, token }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState(null);          // all dashboard data from API
  const [loading, setLoading] = useState(true);     // initial load spinner
  const [error, setError] = useState('');           // global error banner

  // Leave-request form fields
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveMsg, setLeaveMsg] = useState({ type: '', text: '' });

  // Live session-duration timer
  const [timerText, setTimerText] = useState('00:00:00');
  const timerRef = useRef(null); // holds the setInterval id

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/employees/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load dashboard.');
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch once on mount
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Live timer logic ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!data?.activeStatus) return;

    const { checkedIn, onBreak, checkInTime, breakStartTime } = data.activeStatus;

    // Clear any previous interval
    if (timerRef.current) clearInterval(timerRef.current);

    if (checkedIn) {
      // Reference time: break-start if on break, else check-in
      const origin = new Date(onBreak ? breakStartTime : checkInTime).getTime();

      const tick = () => {
        const elapsed = Date.now() - origin;
        const hrs  = Math.floor(elapsed / 3600000);
        const mins = Math.floor((elapsed % 3600000) / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        const pad  = (n) => String(n).padStart(2, '0');
        setTimerText(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      };

      tick();                                      // render immediately
      timerRef.current = setInterval(tick, 1000);  // then every second
    } else {
      setTimerText('00:00:00');
    }

    // Cleanup on unmount or when data changes
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data]);

  // ── Attendance actions (check-in / out, break start / end) ────────────────
  const handleAction = async (endpoint) => {
    setError('');
    try {
      const res = await fetch(`/api/attendance/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Action failed.');
      await fetchDashboard(); // refresh everything
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Leave request submission ──────────────────────────────────────────────
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveMsg({ type: '', text: '' });

    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      return setLeaveMsg({ type: 'danger', text: 'Please fill in all fields.' });
    }

    try {
      const res = await fetch('/api/leaves/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Leave request failed.');

      setLeaveMsg({ type: 'success', text: json.message });
      setLeaveForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      fetchDashboard(); // refresh leave list
    } catch (err) {
      setLeaveMsg({ type: 'danger', text: err.message });
    }
  };

  // ── Loading & fatal-error states ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Loading Dashboard…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <div className="alert alert-danger mt-3">{error}</div>
      </div>
    );
  }

  // ── Destructure API data ──────────────────────────────────────────────────
  const { employee, attendance, leaves, salaries, activeStatus } = data;

  // Quick computed stats for metric cards
  const totalHours   = attendance.reduce((s, d) => s + parseFloat(d.totalWorkHours || 0), 0).toFixed(2);
  const presentDays  = attendance.filter((d) => d.status === 'present').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>

      {/* ──────────── Page Header ──────────── */}
      <div className="page-header">
        <div>
          {/* Greeting with employee name */}
          <h1 className="page-title">Welcome, {employee.name}</h1>
          <p className="page-subtitle">
            {employee.department} &middot; Employee #{employee.id}
          </p>
        </div>

        {/* Live status badge (checked-in / on-break / off-duty) */}
        <div className="status-pill">
          <span className={`status-dot ${activeStatus.onBreak ? 'break' : activeStatus.checkedIn ? 'active' : 'inactive'}`} />
          <span style={{ color: 'var(--text-primary)' }}>
            {activeStatus.onBreak ? 'On Break' : activeStatus.checkedIn ? 'Checked In' : 'Off-Duty'}
          </span>
        </div>
      </div>

      {/* Global error banner (non-fatal) */}
      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* ================================================================== */}
      {/*  TAB: Dashboard Overview                                           */}
      {/* ================================================================== */}
      {activeTab === 'dashboard' && (
        <>
          {/* ── Metrics row ── */}
          <div className="metrics-grid">
            {/* Leave Balance */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--info-bg)' }}>✉️</div>
              <p className="metric-label">Leave Balance</p>
              <p className="metric-value">{employee.leave_balance} Days</p>
              <p className="metric-desc">Remaining annual leave</p>
            </div>

            {/* Monthly Work Hours */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--success-bg)' }}>⏰</div>
              <p className="metric-label">Monthly Work Hours</p>
              <p className="metric-value">{totalHours} hrs</p>
              <p className="metric-desc">Across {presentDays} present days</p>
            </div>

            {/* Base Salary */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--warning-bg)' }}>💰</div>
              <p className="metric-label">Base Salary</p>
              <p className="metric-value">₹{employee.salary}</p>
              <p className="metric-desc">Current monthly rate</p>
            </div>
          </div>

          {/* ── Two-column: Duty Controls + Profile ── */}
          <div className="overview-top-grid">
            {/* Left — Duty Controls */}
            <div className="card duty-card">
              <div className="card-header" style={{ justifyContent: 'center' }}>
                <h2 className="card-title">Duty Controls</h2>
              </div>

              <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
                Log your work sessions and break intervals.
              </p>

              {/* Large gradient timer */}
              <div className="timer-display">{timerText}</div>

              {/* Action buttons */}
              <div className="duty-actions">
                {!activeStatus.checkedIn ? (
                  <button className="btn btn-primary" onClick={() => handleAction('check-in')}>
                    ⏱️ Check In
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={() => handleAction('check-out')}>
                    ⏱️ Check Out
                  </button>
                )}

                {activeStatus.checkedIn && (
                  !activeStatus.onBreak ? (
                    <button className="btn btn-secondary" onClick={() => handleAction('break-start')}>
                      ☕ Start Break
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={() => handleAction('break-end')} style={{ background: 'var(--accent-orange)', color: 'var(--text-dark)' }}>
                      ☕ End Break
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Right — My Profile */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">My Profile</h2>
              </div>

              <div className="profile-list">
                {/* Each row: label → value */}
                <div className="profile-item">
                  <span className="profile-label">Full Name</span>
                  <span className="profile-value">{employee.name}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Email</span>
                  <span className="profile-value">{employee.email}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Contact</span>
                  <span className="profile-value">{employee.contact_info || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Department</span>
                  <span className="profile-value">{employee.department}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Hire Date</span>
                  <span className="profile-value">{new Date(employee.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/*  TAB: Attendance History                                           */}
      {/* ================================================================== */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Attendance History</h2>
            <span className="card-subtitle">Current month records</span>
          </div>

          <div className="table-container">
            {attendance.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                No attendance records for this month.
              </p>
            ) : (
              <table className="data-table attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Work Hours</th>
                    <th>Break Hours</th>
                    <th>Session Details</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((day) => (
                    <tr key={day.id}>
                      {/* Formatted date */}
                      <td data-label="Date">
                        {new Date(day.date).toLocaleDateString(undefined, {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>

                      {/* Status badge using design-system badge-<status> classes */}
                      <td data-label="Status">
                        <span className={`badge badge-${day.status}`}>{day.status}</span>
                      </td>

                      <td data-label="Work Hours">{parseFloat(day.totalWorkHours || 0).toFixed(2)} hrs</td>
                      <td data-label="Break Hours">{parseFloat(day.totalBreakHours || 0).toFixed(2)} hrs</td>

                      {/* Session check-in / check-out details */}
                      <td data-label="Session Details" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {day.sessions && day.sessions.length > 0
                          ? day.sessions.map((s, i) => (
                              <div key={i} style={{ marginBottom: '2px' }}>
                                🟢 In: {s.checkIn ? s.checkIn.split(' ')[1] : '--'} | 🔴 Out: {s.checkOut ? s.checkOut.split(' ')[1] : '--'} ({s.hours || 0} hrs)
                              </div>
                            ))
                          : day.status === 'on_leave'
                            ? <span>On Authorized Leave</span>
                            : <span>No sessions logged</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/*  TAB: Leave Requests                                               */}
      {/* ================================================================== */}
      {activeTab === 'leaves' && (
        <div className="overview-top-grid">
          {/* Left — Request Time Off form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Request Time Off</h2>
            </div>

            {/* Feedback alert */}
            {leaveMsg.text && (
              <div className={`alert alert-${leaveMsg.type} mb-3`}>{leaveMsg.text}</div>
            )}

            <form onSubmit={handleLeaveSubmit}>
              {/* Leave type selector */}
              <div className="form-group">
                <label>Leave Type</label>
                <select
                  className="glass-input glass-select"
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                </select>
              </div>

              {/* Start date */}
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  required
                />
              </div>

              {/* End date */}
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  required
                />
              </div>

              {/* Reason */}
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  className="glass-input"
                  rows="3"
                  placeholder="Describe your reason…"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ resize: 'none' }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100">
                Submit Request
              </button>
            </form>
          </div>

          {/* Right — Leave History table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Leave History</h2>
            </div>

            <div className="table-container">
              {leaves.length === 0 ? (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                  No leave requests yet.
                </p>
              ) : (
                <table className="data-table leaves-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id}>
                        <td data-label="Type" style={{ textTransform: 'uppercase', fontSize: '0.82rem', fontWeight: 600 }}>
                          {l.leaveType}
                        </td>
                        <td data-label="Dates">{l.startDate} → {l.endDate}</td>
                        <td data-label="Reason" style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.reason}
                        </td>
                        <td data-label="Status">
                          <span className={`badge badge-${l.status}`}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/*  TAB: Salary / Payslip History                                     */}
      {/* ================================================================== */}
      {activeTab === 'salaries' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Payslip History</h2>
          </div>

          <div className="table-container">
            {salaries.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                No salary records found.
              </p>
            ) : (
              <table className="data-table payslip-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Date">
                        {new Date(s.paymentDate).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </td>
                      <td data-label="Basic">₹{parseFloat(s.basicSalary).toFixed(2)}</td>

                      {/* Green for additions */}
                      <td data-label="Allowances" className="text-success">+₹{parseFloat(s.allowances).toFixed(2)}</td>

                      {/* Red for deductions */}
                      <td data-label="Deductions" className="text-danger">-₹{parseFloat(s.deductions).toFixed(2)}</td>

                      {/* Accent-colored net payout */}
                      <td data-label="Net Payout" style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>
                        ₹{parseFloat(s.netSalary).toFixed(2)}
                      </td>

                      <td data-label="Status">
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ──────────── Component-specific styles ──────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Gradient monospace timer */
        .timer-display {
          font-size: 2.5rem;
          font-weight: 800;
          font-family: monospace;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        /* Center-aligned duty card layout */
        .duty-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }

        /* Button row beneath timer */
        .duty-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Profile key-value list */
        .profile-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .profile-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .profile-item:last-child {
          border-bottom: none;
        }

        .profile-label {
          color: var(--text-secondary);
        }

        .profile-value {
          color: var(--text-white);
          font-weight: 600;
        }

        /* Responsive Table-to-Card transform for mobile screens */
        @media (max-width: 768px) {
          .payslip-table, .payslip-table thead, .payslip-table tbody, .payslip-table th, .payslip-table td, .payslip-table tr,
          .attendance-table, .attendance-table thead, .attendance-table tbody, .attendance-table th, .attendance-table td, .attendance-table tr,
          .leaves-table, .leaves-table thead, .leaves-table tbody, .leaves-table th, .leaves-table td, .leaves-table tr {
            display: block;
          }
          
          .payslip-table thead,
          .attendance-table thead,
          .leaves-table thead {
            display: none;
          }
          
          .payslip-table tr,
          .attendance-table tr,
          .leaves-table tr {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
            box-shadow: var(--shadow-card);
          }
          
          .payslip-table td,
          .attendance-table td,
          .leaves-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            padding: 0.65rem 0;
            white-space: normal;
            text-align: right;
          }
          
          .payslip-table td:last-child,
          .attendance-table td:last-child,
          .leaves-table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          
          .payslip-table td::before,
          .attendance-table td::before,
          .leaves-table td::before {
            content: attr(data-label);
            font-weight: 500;
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-align: left;
            padding-right: 0.5rem;
          }
        }
      `}} />
    </>
  );
}
