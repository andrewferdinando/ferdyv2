'use client';

import React from 'react';

interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface FormActionsProps {
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  className?: string;
}

export const Form: React.FC<FormProps> = ({ onSubmit, children, className = '' }) => {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
    </form>
  );
};

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  required = false, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
};

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`flex space-x-3 pt-4 ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
      >
        {cancelText}
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : submitText}
      </button>
    </div>
  );
};
