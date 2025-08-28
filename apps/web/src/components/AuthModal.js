import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext-simple';

const AuthModal = ({ isOpen, onClose }) => {
  const { signIn, signUp, resetPassword, error: authError } = useAuth();
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

    try {
      let result;
      
      if (mode === 'signin') {
        console.log('🔐 Attempting sign in...');
        result = await signIn(formData.email, formData.password);
      } else if (mode === 'signup') {
        console.log('📝 Attempting sign up...');
        result = await signUp(formData.email, formData.password, formData.displayName);
      } else if (mode === 'forgot') {
        console.log('🔄 Attempting password reset...');
        result = await resetPassword(formData.email);
        if (result.success) {
          setSuccess('Password reset email sent! Check your inbox.');
          setTimeout(() => {
            setMode('signin');
            setSuccess('');
          }, 3000);
        }
      }

      console.log('🔍 Auth result:', result);

      if (result && !result.success) {
        console.log('❌ Auth failed:', result.error);
        setError(result.error);
      } else if (result && result.success && mode !== 'forgot') {
        console.log('✅ Auth successful, closing modal');
        // Successfully authenticated, close modal
        onClose();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Removed Google sign-in - not configured

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
                      transition: 'border-color 0.2s'
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
                    transition: 'border-color 0.2s'
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
                      transition: 'border-color 0.2s'
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
                      transition: 'border-color 0.2s'
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

          {/* Divider */}
          {mode !== 'forgot' && (
            <>
              {/* Removed Google sign-in option - not configured */}
            </>
          )}

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