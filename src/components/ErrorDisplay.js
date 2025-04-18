// src/components/ErrorDisplay.js
import React from 'react';

const ErrorDisplay = ({ title, message, onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-title">{title || '오류가 발생했습니다'}</div>
      <div className="error-message">{message}</div>
      {onRetry && (
        <div className="error-action">
          <button className="retry-button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;