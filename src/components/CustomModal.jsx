import React, { useEffect } from 'react';

export default function CustomModal({
  type = 'info', // 'info' | 'warning' | 'danger' | 'success' | 'confirm'
  title = 'Information',
  message = '',
  confirmText = 'OK',
  cancelText = 'Annuler',
  onConfirm,
  onCancel
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) {
          onCancel();
        } else if (onConfirm) {
          onConfirm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  // Determine icon and theme classes based on type
  let icon = 'ℹ️';
  let iconClass = 'modal-icon-info';
  let isDangerAction = false;

  if (type === 'warning') {
    icon = '⚠️';
    iconClass = 'modal-icon-warning';
  } else if (type === 'danger' || type === 'confirm-delete') {
    icon = '🗑️';
    iconClass = 'modal-icon-danger';
    isDangerAction = true;
  } else if (type === 'success') {
    icon = '✅';
    iconClass = 'modal-icon-success';
  } else if (type === 'confirm') {
    icon = '❓';
    iconClass = 'modal-icon-info';
  }

  return (
    <div className="modal-overlay" onClick={onCancel || onConfirm}>
      <div className="modal-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Animated Circular Icon */}
        <div className={`modal-icon-container ${iconClass}`}>
          <span style={{ fontSize: '28px' }}>{icon}</span>
        </div>

        {/* Title & Message */}
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>

        {/* Action Buttons */}
        <div className="modal-actions">
          {/* Cancel button for confirmation dialogs */}
          {(type === 'confirm' || type === 'confirm-delete') && (
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          
          {/* Primary Confirm button */}
          <button
            type="button"
            className={`modal-btn ${isDangerAction ? 'modal-btn-danger' : 'modal-btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
