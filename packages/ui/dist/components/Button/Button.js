import { jsxs as _jsxs } from "react/jsx-runtime";
export const Button = ({ children, onClick, disabled = false, loading = false, variant = 'primary', size = 'medium', fullWidth = false, style = {}, className = '', ...props }) => {
    const getVariantStyles = () => {
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
    const getSizeStyles = () => {
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
    const baseStyles = {
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
    return (_jsxs("button", { onClick: onClick, disabled: disabled || loading, style: baseStyles, className: className, ...props, children: [loading && '⏳ ', children] }));
};
