import React from 'react';

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: '', // uses the defaults from btn-primary/btn-secondary
  lg: 'px-8 py-3 text-lg',
};

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  text: 'px-4 py-2 font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300',
};

export default function Button({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  size = 'md',
}) {
  const base = variantClasses[variant] || variantClasses.primary;
  const sizeClass = sizeClasses[size] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
