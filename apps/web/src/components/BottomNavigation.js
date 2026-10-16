import React from 'react';

// Bottom Navigation Component
// Extracted from App.js (no behavior change).
const Badge = ({ count }) => (count > 0 ? (
  <span style={{
    position: 'absolute',
    top: '-4px',
    right: '-10px',
    background: '#ff3b30',
    color: 'white',
    borderRadius: '9px',
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    fontSize: '11px',
    fontWeight: 'bold',
    lineHeight: '18px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }}>
    {count > 9 ? '9+' : count}
  </span>
) : null);

const BottomNavigation = ({ currentView, currentMode, onViewChange, onModeChange, onShowTutorial, chatBadge = 0, sellBadge = 0 }) => {
  // Detect if we're on Android (Capacitor provides this info)
  const isAndroid = /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android';

  // Android needs extra padding for system navigation bar
  const bottomPadding = isAndroid
    ? 'max(48px, env(safe-area-inset-bottom))' // 48px for Android nav bar
    : 'max(8px, env(safe-area-inset-bottom))';  // iOS uses safe area

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      paddingBottom: bottomPadding,
      paddingTop: '4px',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* Mode Toggle (Buy/Sell) */}
      <div style={{
        flex: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 5px'
      }}>
        <div style={{
          display: 'flex',
          background: '#f0f0f0',
          borderRadius: '20px',
          padding: '4px'
        }}>
          <button
            onClick={() => onModeChange('buyer')}
            style={{
              background: currentMode === 'buyer' ? '#667eea' : 'transparent',
              color: currentMode === 'buyer' ? 'white' : '#666',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛒 Buy
          </button>
          <button
            onClick={() => onModeChange('seller')}
            style={{
              background: currentMode === 'seller' ? '#667eea' : 'transparent',
              color: currentMode === 'seller' ? 'white' : '#666',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            💰 Sell
            {currentMode !== 'seller' && <Badge count={sellBadge} />}
          </button>
        </div>
      </div>

      {/* View Navigation - Only Chats and Profile */}
      <div style={{
        flex: 2,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        <button
          onClick={() => onViewChange('chats')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px',
            color: currentView === 'chats' ? '#667eea' : '#999',
            minWidth: '60px'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px', position: 'relative' }}>
            💬
            <Badge count={chatBadge} />
          </div>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Chats</span>
        </button>

        {/* Help button only shown in buyer mode */}
        {currentMode === 'buyer' && (
          <button
            onClick={onShowTutorial}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '4px',
              color: '#999',
              minWidth: '60px'
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '2px' }}>❓</div>
            <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Help</span>
          </button>
        )}

        <button
          onClick={() => onViewChange('profile')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px',
            color: currentView === 'profile' ? '#667eea' : '#999',
            minWidth: '60px'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>👤</div>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Profile</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;
