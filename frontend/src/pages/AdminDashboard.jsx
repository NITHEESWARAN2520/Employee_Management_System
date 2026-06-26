import React, { useState, useEffect } from 'react';
import CustomLineChart from '../components/CustomLineChart';
import CustomBarChart from '../components/CustomBarChart';
import EmployeeModal from '../components/EmployeeModal';
import LeaveModal from '../components/LeaveModal';

// ---------------------------------------------------------------------------
// Avatar color classes – cycle through these for table rows
// ---------------------------------------------------------------------------
const AVATAR_COLORS = ['avatar-purple', 'avatar-orange', 'avatar-blue', 'avatar-green'];

// Helper: return initials from a full name (e.g. "Jane Doe" → "JD")
function getInitials(name = '') {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdminDashboard({ user, activeTab, token }) {
  // ---- Data state ----------------------------------------------------------
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leavesHistory, setLeavesHistory] = useState([]);
  const [salaries, setSalaries] = useState([]);

  // ---- UI state ------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal visibility & selected items
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState(null);

  // Employee tab – search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Salary tab – payroll form
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    basicSalary: '',
    allowances: '',
    deductions: '',
    paymentDate: '',
    status: 'paid',
  });
  const [salaryMsg, setSalaryMsg] = useState({ type: '', text: '' });

  // =========================================================================
  //  API helpers (all need Bearer token)
  // =========================================================================
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch the overview aggregation for the dashboard tab
  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch('/api/employees/admin-dashboard', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard data');
      setMetrics(data.metrics);
      setCharts(data.charts);
      setPendingLeaves(data.pendingLeaveRequests || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch the full employees list
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch employees');
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch all leave requests (history)
  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leaves', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch leaves');
      setLeavesHistory(data.requests || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch salary / payroll records
  const fetchSalaries = async () => {
    try {
      const res = await fetch('/api/salaries', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch salaries');
      setSalaries(data.salaries || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Load the right data whenever the active tab changes -----------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      await fetchDashboardMetrics();

      if (activeTab === 'employees') await fetchEmployees();
      if (activeTab === 'leaves') await fetchLeaves();
      if (activeTab === 'salaries') {
        await fetchSalaries();
        await fetchEmployees(); // needed for the employee dropdown
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // =========================================================================
  //  Action handlers
  // =========================================================================

  // ---- Employee CRUD -------------------------------------------------------
  const handleSaveEmployee = async (formData) => {
    const isEdit = !!editingEmp;
    const url = isEdit ? `/api/employees/${editingEmp.id}` : '/api/employees';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(formData),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to save employee');

    // Refresh data and close the modal
    await fetchEmployees();
    await fetchDashboardMetrics();
    setShowEmpModal(false);
    setEditingEmp(null);
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee? All their data will be removed.')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE', headers: authHeaders });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Delete failed');
      await fetchEmployees();
      await fetchDashboardMetrics();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Leave review --------------------------------------------------------
  const handleLeaveAction = async (id, status) => {
    const res = await fetch(`/api/leaves/approve/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to update leave');

    await fetchDashboardMetrics();
    if (activeTab === 'leaves') await fetchLeaves();
    setShowLeaveModal(false);
    setReviewingLeave(null);
  };

  // ---- Salary payroll form -------------------------------------------------
  const handleCreateSalary = async (e) => {
    e.preventDefault();
    setSalaryMsg({ type: '', text: '' });

    if (!salaryForm.employeeId || !salaryForm.basicSalary) {
      return setSalaryMsg({ type: 'danger', text: 'Please select an employee and enter the basic salary.' });
    }

    try {
      const res = await fetch('/api/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(salaryForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to record payroll');

      setSalaryMsg({ type: 'success', text: result.message });
      setSalaryForm({ employeeId: '', basicSalary: '', allowances: '', deductions: '', paymentDate: '', status: 'paid' });
      await fetchSalaries();
    } catch (err) {
      setSalaryMsg({ type: 'danger', text: err.message });
    }
  };

  // Toggle salary paid ↔ pending
  const handleToggleSalaryStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch(`/api/salaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to update salary status');
      await fetchSalaries();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Employee sorting & filtering ----------------------------------------
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Build a sort-indicator arrow for column headers
  const sortArrow = (field) => (sortField === field ? (sortAsc ? ' ▲' : ' ▼') : '');

  // Filtered + sorted employee list
  const sortedEmployees = [...employees]
    .filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const numericFields = ['salary', 'leaveBalance', 'leaveTaken', 'id'];
      let valA = a[sortField];
      let valB = b[sortField];
      if (numericFields.includes(sortField)) {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  // =========================================================================
  //  Loading guard
  // =========================================================================
  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
        Loading dashboard…
      </div>
    );
  }

  // =========================================================================
  //  Render
  // =========================================================================
  return (
    <>
      {/* ================================================================
          TAB: Dashboard Overview
          ================================================================ */}
      {activeTab === 'dashboard' && metrics && (
        <>
          {/* ---------- Page header ---------- */}
          <div className="page-header">
            <h1 className="page-title">Overview</h1>
            <div className="header-search">
              <span className="search-icon">🔍</span>
              <input type="text" placeholder="Search anything…" />
            </div>
          </div>

          {/* ---------- Error banner ---------- */}
          {error && <div className="alert alert-danger mb-3">{error}</div>}

          {/* ---------- Small metric cards ---------- */}
          <div className="metrics-grid">
            {/* Card 1 – Total Employees */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>👥</div>
              <div className="metric-label">Total Employees</div>
              <div className="metric-value">{metrics.totalEmployees}</div>
              <div className="metric-desc">Registered personnel</div>
            </div>

            {/* Card 2 – Checked-in Today */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>⏰</div>
              <div className="metric-label">Checked-In Today</div>
              <div className="metric-value">{metrics.checkedInToday}</div>
              <div className="metric-desc">{metrics.onBreakCount} on break</div>
            </div>

            {/* Card 3 – Attendance Rate */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'rgba(181,183,255,0.12)', color: 'var(--accent-purple)' }}>📈</div>
              <div className="metric-label">Attendance Rate</div>
              <div className="metric-value">{metrics.attendanceRate}%</div>
              <div className="metric-desc">Today's performance</div>
            </div>

            {/* Card 4 – Pending Leaves */}
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>✉️</div>
              <div className="metric-label">Pending Leaves</div>
              <div className="metric-value">{metrics.pendingLeaves}</div>
              <div className="metric-desc">Awaiting review</div>
            </div>
          </div>

          {/* ---------- Top 2-column grid ---------- */}
          <div className="overview-top-grid">
            {/* Left – highlight accent card */}
            <div className="highlight-card card">
              <div>
                <div className="card-title">Total Employees</div>
                <div className="highlight-value">{metrics.totalEmployees}</div>
                <div className="highlight-change">Active workforce count</div>
              </div>
              <span className="highlight-graphic">👥</span>
            </div>

            {/* Right – Weekly Attendance line chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Weekly Attendance Trend</div>
                  <div className="card-subtitle">Last 7 days active count</div>
                </div>
              </div>
              <CustomLineChart data={charts?.attendanceTrend || []} />
            </div>
          </div>

          {/* ---------- Hourly Check-in Distribution ---------- */}
          <div className="card mb-3">
            <div className="card-header">
              <div>
                <div className="card-title">Hourly Check-in Distribution</div>
                <div className="card-subtitle">Total check-ins by hour of day</div>
              </div>
            </div>
            <CustomBarChart data={charts?.hourlyPattern || []} />
          </div>

          {/* ---------- Pending leave requests table ---------- */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pending Leave Requests</div>
              <span className="badge badge-pending">{pendingLeaves.length} pending</span>
            </div>

            {pendingLeaves.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                No pending leave requests to review.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table admin-leaves-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.map((req, idx) => (
                      <tr key={req.id}>
                        {/* User avatar + name */}
                        <td data-label="Employee">
                          <div className="table-user">
                            <div className={`table-avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {getInitials(req.name)}
                            </div>
                            <span className="table-user-name">{req.name}</span>
                          </div>
                        </td>
                        <td data-label="Department">{req.department}</td>
                        <td data-label="Type"><span className="badge badge-on_leave">{req.leaveType}</span></td>
                        <td data-label="Dates">{req.startDate} → {req.endDate}</td>
                        <td data-label="Reason" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.reason}
                        </td>
                        <td data-label="Action" className="text-right">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setReviewingLeave(req); setShowLeaveModal(true); }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================
          TAB: Employees Directory
          ================================================================ */}
      {activeTab === 'employees' && (
        <>
          {/* ---------- Page header with Add button ---------- */}
          <div className="page-header">
            <h1 className="page-title">Employees</h1>
            <div className="header-actions">
              <button
                className="btn btn-primary"
                onClick={() => { setEditingEmp(null); setShowEmpModal(true); }}
              >
                + Add Employee
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          {/* ---------- Search input ---------- */}
          <div className="header-search mb-3" style={{ width: '100%', maxWidth: 400 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or department…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* ---------- Employee table ---------- */}
          <div className="card">
            {sortedEmployees.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                No employees found.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table admin-employees-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')}>Name{sortArrow('name')}</th>
                      <th onClick={() => handleSort('department')}>Department{sortArrow('department')}</th>
                      <th onClick={() => handleSort('salary')}>Salary{sortArrow('salary')}</th>
                      <th onClick={() => handleSort('leaveBalance')}>Leave Bal.{sortArrow('leaveBalance')}</th>
                      <th onClick={() => handleSort('leaveTaken')}>Leave Taken{sortArrow('leaveTaken')}</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.map((emp, idx) => (
                      <tr key={emp.id}>
                        {/* Avatar + name */}
                        <td data-label="Name">
                          <div className="table-user">
                            <div className={`table-avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {getInitials(emp.name)}
                            </div>
                            <span className="table-user-name">{emp.name}</span>
                          </div>
                        </td>
                        <td data-label="Department">{emp.department}</td>
                        <td data-label="Salary">₹{parseFloat(emp.salary).toFixed(2)}</td>
                        <td data-label="Leave Bal.">{emp.leaveBalance} days</td>
                        <td data-label="Leave Taken">{emp.leaveTaken} days</td>
                        <td data-label="Actions" className="text-right">
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setEditingEmp(emp); setShowEmpModal(true); }}
                            >
                              Edit
                            </button>
                            {user.role === 'admin' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteEmployee(emp.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================
          TAB: Leaves History
          ================================================================ */}
      {activeTab === 'leaves' && (
        <>
          <div className="page-header">
            <h1 className="page-title">Leave Requests</h1>
          </div>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <div className="card">
            <div className="card-header">
              <div className="card-title">All Leave History</div>
              <div className="card-subtitle">{leavesHistory.length} total requests</div>
            </div>

            {leavesHistory.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                No leave requests found.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leavesHistory.map((leave, idx) => (
                      <tr key={leave.id}>
                        <td>
                          <div className="table-user">
                            <div className={`table-avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                              {getInitials(leave.name)}
                            </div>
                            <span className="table-user-name">{leave.name}</span>
                          </div>
                        </td>
                        <td>{leave.department}</td>
                        <td><span className="bad→ge badge-on_leave">{leave.leaveType}</span></td>
                        <td>{leave.startDate}  {leave.endDate}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {leave.reason}
                        </td>
                        <td>
                          <span className={`badge badge-${leave.status}`}>{leave.status}</span>
                        </td>
                        <td className="text-right">
                          {leave.status === 'pending' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => { setReviewingLeave(leave); setShowLeaveModal(true); }}
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                              by @{leave.approvedByUsername || 'system'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================
          TAB: Salaries & Payroll
          ================================================================ */}
      {activeTab === 'salaries' && (
        <>
          <div className="page-header">
            <h1 className="page-title">Salaries & Payroll</h1>
          </div>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <div className="overview-top-grid payroll-grid ">
            {/* ---- Left column: Record Payroll form ---- */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Record Payroll</div>
              </div>

              {/* Feedback message */}
              {salaryMsg.text && (
                <div className={`alert alert-${salaryMsg.type} mb-3`}>{salaryMsg.text}</div>
              )}

              <form onSubmit={handleCreateSalary}>
                {/* Employee select */}
                <div className="form-group">
                  <label htmlFor="sal-emp">Employee *</label>
                  <select
                    id="sal-emp"
                    className="glass-input glass-select"
                    value={salaryForm.employeeId}
                    onChange={(e) => setSalaryForm({ ...salaryForm, employeeId: e.target.value })}
                    required
                  >
                    <option value="">— Choose employee —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        #{emp.id} – {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Basic salary */}
                <div className="form-group">
                  <label htmlFor="sal-basic">Basic Salary (₹) *</label>
                  <input
                    id="sal-basic"
                    type="number"
                    className="glass-input"
                    placeholder="e.g. 5000"
                    min="0"
                    step="0.01"
                    value={salaryForm.basicSalary}
                    onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })}
                    required
                  />
                </div>

                {/* Allowances & deductions side-by-side */}
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="sal-allow">Allowances (₹)</label>
                    <input
                      id="sal-allow"
                      type="number"
                      className="glass-input"
                      placeholder="Bonus / Travel"
                      min="0"
                      step="0.01"
                      value={salaryForm.allowances}
                      onChange={(e) => setSalaryForm({ ...salaryForm, allowances: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sal-deduct">Deductions (₹)</label>
                    <input
                      id="sal-deduct"
                      type="number"
                      className="glass-input"
                      placeholder="Tax / Insurance"
                      min="0"
                      step="0.01"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                    />
                  </div>
                </div>

                {/* Payment date */}
                <div className="form-group">
                  <label htmlFor="sal-date">Payment Date</label>
                  <input
                    id="sal-date"
                    type="date"
                    className="glass-input"
                    value={salaryForm.paymentDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })}
                  />
                </div>

                {/* Status select */}
                <div className="form-group">
                  <label htmlFor="sal-status">Status</label>
                  <select
                    id="sal-status"
                    className="glass-input glass-select"
                    value={salaryForm.status}
                    onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value })}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary w-100 mt-2">
                  Record Payroll
                </button>
              </form>
            </div>

            {/* ---- Right column: Payroll history table ---- */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Payroll History</div>
                <div className="card-subtitle">{salaries.length} records</div>
              </div>

              {salaries.length === 0 ? (
                <p className="text-center text-muted" style={{ padding: '2rem 0' }}>
                  No payroll records yet.
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table admin-payroll-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Net Salary</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((s, idx) => (
                        <tr key={s.id}>
                          <td data-label="Employee">
                            <div className="table-user">
                              <div className={`table-avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <span className="table-user-name">{s.name}</span>
                                <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.department}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Net Salary" style={{ fontWeight: 700 }}>₹{parseFloat(s.netSalary).toFixed(2)}</td>
                          <td data-label="Date">{s.paymentDate}</td>
                          <td data-label="Status">
                            <span className={`badge badge-${s.status}`}>{s.status}</span>
                          </td>
                          <td data-label="Action" className="text-right">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggleSalaryStatus(s.id, s.status)}
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          MODALS (rendered at root level so they overlay everything)
          ================================================================ */}
      {showEmpModal && (
        <EmployeeModal
          employee={editingEmp}
          onClose={() => { setShowEmpModal(false); setEditingEmp(null); }}
          onSave={handleSaveEmployee}
        />
      )}

      {showLeaveModal && reviewingLeave && (
        <LeaveModal
          request={reviewingLeave}
          onClose={() => { setShowLeaveModal(false); setReviewingLeave(null); }}
          onAction={handleLeaveAction}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .payroll-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 1.25rem;
          align-items: start;
        }

        /* Responsive Table-to-Card transform for Admin mobile screens */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .btn {
            flex: 1 1 100%;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .admin-leaves-table, .admin-leaves-table thead, .admin-leaves-table tbody, .admin-leaves-table th, .admin-leaves-table td, .admin-leaves-table tr,
          .admin-employees-table, .admin-employees-table thead, .admin-employees-table tbody, .admin-employees-table th, .admin-employees-table td, .admin-employees-table tr,
          .admin-payroll-table, .admin-payroll-table thead, .admin-payroll-table tbody, .admin-payroll-table th, .admin-payroll-table td, .admin-payroll-table tr {
            display: block;
          }
          
          .admin-leaves-table thead,
          .admin-employees-table thead,
          .admin-payroll-table thead {
            display: none;
          }
          
          .admin-leaves-table tr,
          .admin-employees-table tr,
          .admin-payroll-table tr {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
            box-shadow: var(--shadow-card);
          }
          
          .admin-leaves-table td,
          .admin-employees-table td,
          .admin-payroll-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            padding: 0.65rem 0;
            white-space: normal;
            text-align: right;
          }
          
          .admin-leaves-table td:last-child,
          .admin-employees-table td:last-child,
          .admin-payroll-table td:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          
          .admin-leaves-table td::before,
          .admin-employees-table td::before,
          .admin-payroll-table td::before {
            content: attr(data-label);
            font-weight: 500;
            color: var(--text-secondary);
            font-size: 0.85rem;
            text-align: left;
            padding-right: 0.5rem;
          }
        }

        /* Stack salaries form and table vertically on tablet screens */
        @media (max-width: 1200px) {
          .payroll-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </>
  );
}
