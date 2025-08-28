import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext-simple';

const AuthModal = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithGoogle, resetPassword, error: authError } = useAuth();
  const [mode, setMode] = useState('signup'); // Start with signup for new users
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    console.log('🔍 Validating form:', { mode, formData });
    
    if (!formData.email || !formData.email.includes('@')) {
      console.log('❌ Invalid email:', formData.email);
      setError('Please enter a valid email address');
      return false;
    }

    if (mode === 'signup') {
      if (!formData.displayName || formData.displayName.trim().length < 2) {
        console.log('❌ Invalid display name:', formData.displayName);
        setError('Please enter your name (at least 2 characters)');
        return false;
      }
      if (!formData.password || formData.password.length < 6) {
        console.log('❌ Invalid password length:', formData.password?.length);
        setError('Password must be at least 6 characters long');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        console.log('❌ Passwords do not match');
        setError('Passwords do not match');
        return false;
      }
    }

    if (mode === 'signin' && (!formData.password || formData.password.length < 6)) {
      console.log('❌ Invalid signin password:', formData.password?.length);
      setError('Please enter your password (at least 6 characters)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submitted:', { mode, email: formData.email });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    console.log('✅ Form validation passed, proceeding with auth...');
    setLoading(true);
    setError('');
    setSuccess('');

    // Add timeout to prevent infinite hanging
    const timeout = setTimeout(() => {
      console.log('⚠️ Auth operation timeout');
      setLoading(false);
      setError('Operation timed out. Please check your connection and try again.');
    }, 30000); // 30 second timeout

    try {
      let result;
      
      if (mode === 'signin') {
        console.log('🔐 Attempting sign in...');
        result = await signIn(formData.email, formData.password);
        console.log('🔐 Sign in completed:', result);
      } else if (mode === 'signup') {
        console.log('📝 Attempting sign up with email:', formData.email);
        console.log('📝 Display name:', formData.displayName);
        result = await signUp(formData.email, formData.password, formData.displayName);
        console.log('📝 Sign up completed:', result);
      } else if (mode === 'forgot') {
        console.log('🔄 Attempting password reset...');
        result = await resetPassword(formData.email);
        console.log('🔄 Password reset completed:', result);
        if (result.success) {
          setSuccess('Password reset email sent! Check your inbox AND spam folder. If found in spam, mark as "Not Spam" to ensure future delivery.');
          setTimeout(() => {
            setMode('signin');
            setSuccess('');
          }, 5000); // Give more time to read the message
        }
      }

      clearTimeout(timeout);
      console.log('🔍 Final auth result:', result);

      if (result && !result.success) {
        console.log('❌ Auth failed:', result.error);
        setError(result.error);
      } else if (result && result.success && mode !== 'forgot') {
        console.log('✅ Auth successful, closing modal');
        // Clear form data
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          displayName: ''
        });
        // Successfully authenticated, close modal
        onClose();
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error('💥 Auth error caught:', err);
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('🔍 Google sign-in attempt');
    setLoading(true);
    setError('');
    
    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.log('⚠️ Google sign-in timeout');
      setLoading(false);
      setError('Google sign-in timed out. Please try again or use email/password.');
    }, 15000); // 15 second timeout
    
    try {
      const result = await signInWithGoogle();
      console.log('🔍 Google sign-in result:', result);
      clearTimeout(timeout);
      
      if (result && result.success) {
        console.log('✅ Google sign-in successful, closing modal');
        onClose();
      } else {
        console.log('❌ Google sign-in failed:', result?.error);
        setError(result?.error || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      clearTimeout(timeout);
      setError('Google sign-in failed. Please try again.');
      console.error('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #f0f0f0',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '24px',
              top: '24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} color="#666" />
          </button>
          
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            color: '#333'
          }}>
            {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginTop: '8px'
          }}>
            {mode === 'signin' 
              ? 'Sign in to continue to SwipeCity' 
              : mode === 'signup' 
              ? 'Join SwipeCity marketplace today' 
              : 'Enter your email to reset your password'}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Error Message */}
          {(error || authError) && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {error || authError}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div style={{
              background: '#e6ffe6',
              color: '#008800',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}

          {/* Show Google Sign-In only on web, not mobile */}
          {mode !== 'forgot' && !window.Capacitor?.isNativePlatform?.() && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #dadce0',
                  background: 'white',
                  color: '#3c4043',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading ? 'default' : 'pointer',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing in...' : `Continue with Google`}
              </button>

              {/* Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '0 0 24px 0',
                color: '#666',
                fontSize: '14px'
              }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#e0e0e0'
                }}></div>
                <span style={{
                  padding: '0 16px',
                  backgroundColor: 'white'
                }}>
                  or continue with email
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#e0e0e0'
                }}></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name Field (Sign Up only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  Full Name
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <User size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999'
                  }} />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: '#333'
              }}>
                Email Address
              </label>
              <div style={{
                position: 'relative'
              }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== 'forgot' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  Password
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999'
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#999'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password Field (Sign Up only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#333'
                }}>
                  Confirm Password
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999'
                  }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#999'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {mode === 'signin' && (
              <div style={{
                textAlign: 'right',
                marginBottom: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007AFF',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? '#ccc' : '#007AFF',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'default' : 'pointer',
                marginBottom: '16px',
                transition: 'background 0.2s'
              }}
            >
              {loading 
                ? 'Please wait...' 
                : mode === 'signin' 
                ? 'Sign In' 
                : mode === 'signup' 
                ? 'Create Account' 
                : 'Send Reset Email'}
            </button>
          </form>


          {/* Switch Mode */}
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #f0f0f0'
          }}>
            {mode === 'signin' ? (
              <p style={{
                fontSize: '14px',
                color: '#666'
              }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007AFF',
                    cursor: 'pointer',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Sign Up
                </button>
              </p>
            ) : mode === 'signup' ? (
              <p style={{
                fontSize: '14px',
                color: '#666'
              }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007AFF',
                    cursor: 'pointer',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Sign In
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setSuccess('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007AFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;