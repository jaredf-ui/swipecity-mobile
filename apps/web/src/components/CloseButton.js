import React from 'react';

// Standardized Close Button Component for iOS compatibility
// Extracted from App.js (no behavior change).
const CloseButton = ({ onClick, color = 'white', backgroundColor = 'rgba(255,255,255,0.2)', size = '44px' }) => {
  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling but allow button click
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClose}
      style={{
        background: backgroundColor,
        border: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        color: color,
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 99999,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        outline: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      ×
    </button>
  );
};

export default CloseButton;
