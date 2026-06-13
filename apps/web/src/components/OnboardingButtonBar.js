import React from 'react';

// Onboarding Button Bar Component - Fixed position for consistency
// Extracted from App.js (no behavior change).
const OnboardingButtonBar = ({
  onBack, onNext, onSkip,
  showBack = true, showSkip = false,
  nextText = "Continue →", backText = "← Back", skipText = "Skip"
}) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(40px, env(safe-area-inset-bottom) + 10px)', // Lower positioning
      left: 'max(20px, env(safe-area-inset-left))',
      right: 'max(20px, env(safe-area-inset-right))',
      display: 'flex',
      gap: '15px',
      justifyContent: 'space-between',
      zIndex: 1000,
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      backdropFilter: 'blur(15px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.2)',
      border: '1px solid rgba(255,255,255,0.3)'
    }}>
      {/* Left side - Back/Skip */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {showBack && (
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.8)',
              color: '#666',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '16px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
          >
            {backText}
          </button>
        )}
        {showSkip && (
          <button
            onClick={onSkip}
            style={{
              background: 'rgba(255,255,255,0.6)',
              color: '#888',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '16px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            {skipText}
          </button>
        )}
      </div>

      {/* Right side - Next/Continue */}
      {onNext && (
        <button
          onClick={onNext}
          style={{
            background: 'linear-gradient(135deg, #4CAF50, #45a049)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(76, 175, 80, 0.25)',
            minWidth: '120px',
            transition: 'all 0.2s ease'
          }}
        >
          {nextText}
        </button>
      )}
    </div>
  );
};

export default OnboardingButtonBar;
