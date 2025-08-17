import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '../services/pushNotifications';

const NotificationSettings = ({ user, onClose }) => {
  const { permission, requestPermission, isSupported, loading } = usePushNotifications();
  const [settings, setSettings] = useState({
    newMessages: true,
    newMatches: true,
    priceDrops: false,
    marketingUpdates: false
  });

  useEffect(() => {
    // Load user's notification preferences
    const savedSettings = localStorage.getItem(`notifications_${user?.id}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [user]);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    if (user) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(newSettings));
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleRequestPermission = async () => {
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to request permission:', error);
    }
  };

  const getPermissionText = () => {
    switch (permission) {
      case 'granted':
        return 'Notifications enabled ✅';
      case 'denied':
        return 'Notifications blocked ❌';
      case 'default':
        return 'Notifications not configured';
      case 'not-supported':
        return 'Notifications not supported';
      default:
        return 'Unknown status';
    }
  };

  const getPermissionColor = () => {
    switch (permission) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 10000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
            Notification Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>

        {/* Permission Status */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '25px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: getPermissionColor(),
            marginBottom: '10px'
          }}>
            {getPermissionText()}
          </div>
          
          {isSupported && permission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              disabled={loading || permission === 'denied'}
              style={{
                background: permission === 'denied' ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Requesting...' : 'Enable Notifications'}
            </button>
          )}

          {permission === 'denied' && (
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: '10px 0 0 0',
              lineHeight: '1.4'
            }}>
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          )}

          {!isSupported && (
            <p style={{
              fontSize: '12px',
              color: '#666',
              margin: '10px 0 0 0'
            }}>
              Your browser doesn't support push notifications.
            </p>
          )}
        </div>

        {/* Notification Preferences */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>
            What would you like to be notified about?
          </h3>

          {Object.entries({
            newMessages: {
              title: 'New Messages',
              description: 'When someone sends you a message'
            },
            newMatches: {
              title: 'New Matches',
              description: 'When you match with someone'
            },
            priceDrops: {
              title: 'Price Drops',
              description: 'When items in your wishlist drop in price'
            },
            marketingUpdates: {
              title: 'App Updates',
              description: 'New features and promotional content'
            }
          }).map(([key, { title, description }]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                  {title}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {description}
                </div>
              </div>
              
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => handleToggle(key)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: settings[key] ? '#667eea' : '#ccc',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: settings[key] ? '28px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                  }} />
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Test Notification Button */}
        {permission === 'granted' && (
          <button
            onClick={() => {
              new Notification('Test Notification', {
                body: 'This is a test notification from SwipeCity',
                icon: '/logo192.png',
                tag: 'test-notification'
              });
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Send Test Notification
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;