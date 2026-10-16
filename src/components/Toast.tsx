import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div id="toast" className={message ? 'show' : ''} role="status" aria-live="polite">
      <span className="t-dot" />
      <span id="toast-msg">{message || ''}</span>
    </div>
  );
};
