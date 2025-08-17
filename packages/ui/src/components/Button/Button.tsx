import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'transparent';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style = {},
  className = '',
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: loading || disabled ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
        };
      case 'secondary':
        return {
          background: loading || disabled ? '#f5f5f5' : '#667eea',
          color: 'white',
          border: 'none',
        };
      case 'danger':
        return {
          background: loading || disabled ? '#ffcccb' : '#ff4444',
          color: 'white',
          border: 'none',
        };
      case 'transparent':
        return {
          background: 'transparent',
          color: disabled ? '#999' : 'inherit',
          border: '1px solid rgba(255,255,255,0.3)',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'small':
        return {
          padding: '8px 12px',
          fontSize: '14px',
        };
      case 'medium':
        return {
          padding: '12px 18px',
          fontSize: '16px',
        };
      case 'large':
        return {
          padding: '18px 24px',
          fontSize: '18px',
        };
      default:
        return {};
    }
  };

  const baseStyles: React.CSSProperties = {
    borderRadius: '15px',
    fontWeight: 'bold',
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={baseStyles}
      className={className}
      {...props}
    >
      {loading && '⏳ '}
      {children}
    </button>
  );
};