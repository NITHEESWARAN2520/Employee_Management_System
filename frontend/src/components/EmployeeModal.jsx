import React, { useState, useEffect } from 'react';

export default function EmployeeModal({ employee, onClose, onSave }) {
  const isEditMode = !!employee;
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    department: '',
    salary: '',
    contactInfo: '',
    role: 'employee'
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync state if editing an existing profile
  useEffect(() => {
    if (isEditMode) {
      setFormData({
        username: employee.username || '',
        password: '', // Password is not editable in this screen for security
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || '',
        salary: employee.salary || '',
        contactInfo: employee.contactInfo || '',
        role: employee.role || 'employee'
      });
    }
  }, [employee, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name || !formData.email || !formData.department || !formData.salary) {
      return setError('Please fill in all required profile fields.');
    }
    if (!isEditMode && (!formData.username || !formData.password)) {
      return setError('Username and password are required for new accounts.');
    }
    if (isNaN(formData.salary) || parseFloat(formData.salary) <= 0) {
      return setError('Salary must be a positive number.');
    }

    setSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-content">
        <div className="modal-header">
          <h2>{isEditMode ? `Edit Profile: ${employee.name}` : 'Add New Employee'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Account Login Details (Only displayed during creation) */}
          {!isEditMode && (
            <>
              <h3 className="form-section-title">Login Credentials</h3>
              <div className="form-grid mb-3">
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g., johndoe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Section 2: Profile Details */}
          <h3 className="form-section-title">Personal & Employment Details</h3>
          
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="glass-input"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="glass-input"
                placeholder="john.doe@company.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactInfo">Contact Number</label>
              <input
                type="text"
                id="contactInfo"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleChange}
                className="glass-input"
                placeholder="e.g., +1234567890"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="department">Department *</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="glass-input"
                placeholder="e.g., Engineering, HR, Sales"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="salary">Basic Monthly Salary (₹) *</label>
              <input
                type="number"
                id="salary"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="glass-input"
                placeholder="e.g., 5000"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="role">System Role Access</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="glass-input glass-select"
                disabled={isEditMode} // Role shouldn't be changed randomly here
              >
                <option value="employee">Employee</option>
                <option value="hr">HR Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {isEditMode && (
              <div className="form-group">
                <label htmlFor="leaveBalance">Annual Leave Balance (Days)</label>
                <input
                  type="number"
                  id="leaveBalance"
                  name="leaveBalance"
                  value={formData.leaveBalance || employee.leaveBalance}
                  onChange={handleChange}
                  className="glass-input"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions mt-3">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Processing...' : isEditMode ? 'Save Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .form-section-title {
          font-size: 0.9rem;
          color: var(--secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
          margin-top: 1.5rem;
          border-left: 2px solid var(--secondary);
          padding-left: 0.5rem;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-md);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .alert-danger {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          border-top: 1px solid var(--border-light);
          padding-top: 1rem;
        }
      `}} />
    </div>
  );
}
