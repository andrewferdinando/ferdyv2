'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({ 
  error, 
  className = '', 
  ...props 
}) => {
  const baseClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all duration-150";
  const errorClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300";
  
  return (
    <div className="space-y-1">
      <input
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ 
  error, 
  className = '', 
  ...props 
}) => {
  const baseClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all duration-150 resize-none";
  const errorClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300";
  
  return (
    <div className="space-y-1">
      <textarea
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  className?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ 
  error, 
  className = '', 
  options,
  ...props 
}) => {
  const baseClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all duration-150";
  const errorClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300";
  
  return (
    <div className="space-y-1">
      <select
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
