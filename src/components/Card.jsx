import React from 'react';

export default function Card({ children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={`card-base p-4 ${onClick ? 'cursor-pointer text-left w-full' : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}
