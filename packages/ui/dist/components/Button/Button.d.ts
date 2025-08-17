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
export declare const Button: React.FC<ButtonProps>;
