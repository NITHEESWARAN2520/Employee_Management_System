import React, { useState } from 'react';

export default function LeaveModal({ request, onClose, onAction }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

  const handleAction = async (status) => {
    setError('');
    setSubmitting(true);
    try {
      await onAction(request.id, status);
    } catch (err) {
      setError(err.message || `Failed to ${status} leave request.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop container-fluid ">
      <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Review Leave Request</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <div className="leave-details-container mb-3">
          <div className="detail-row">
            <span className="detail-label">Employee:</span>
            <span className="detail-value">{request.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Department:</span>
            <span className="detail-value">{request.department}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Leave Type:</span>
            <span className="detail-value badge-val badge-info">{request.leaveType}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">{duration} Day(s)</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date Range:</span>
            <span className="detail-value">{request.startDate} to {request.endDate}</span>
          </div>
          <div className="detail-row reason-row">
            <span className="detail-label">Reason:</span>
            <div className="detail-value reason-box">{request.reason}</div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose} 
            disabled={submitting}
            style={{ marginRight: 'auto' }}
          >
            Close
          </button>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={() => handleAction('rejected')} 
            disabled={submitting}
          >
            Reject Request
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleAction('approved')} 
            disabled={submitting}
          >
            Approve Request
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leave-details-container {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-light);
          padding: 1.25rem;
          border-radius: var(--border-radius-md);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .detail-label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .detail-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .badge-val {
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .reason-row {
          flex-direction: column;
          gap: 0.35rem;
        }

        .reason-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: var(--border-radius-sm);
          font-style: italic;
          font-weight: normal;
          color: var(--text-secondary);
          font-size: 0.9rem;
          word-break: break-word;
        }

        .alert-danger {
          background: rgba(239, 68, 68, 0.15);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 0.75rem;
          border-radius: 6px;
        }
      `}} />
    </div>
  );
}
