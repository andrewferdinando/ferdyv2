'use client';

import React, { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { normalizeHashtag, normalizeHashtags } from '@/lib/utils/hashtags';

interface HashtagInputProps {
  value?: string[]; // Array of hashtag strings
  onChange?: (hashtags: string[]) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const HashtagInput: React.FC<HashtagInputProps> = ({
  value = [],
  onChange,
  placeholder = "Type hashtag and press Enter",
  helperText = "Press Enter to add a hashtag",
  error,
  className = '',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value prop
  useEffect(() => {
    setHashtags(value);
  }, [value]);

  const addHashtag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    // Normalize the hashtag (auto-prepends # if missing)
    const normalized = normalizeHashtag(trimmed);
    if (!normalized || normalized === '#') return;

    // Check for duplicates (case-insensitive)
    const isDuplicate = hashtags.some(
      existingTag => existingTag.toLowerCase() === normalized.toLowerCase()
    );
    
    if (!isDuplicate) {
      const newHashtags = [...hashtags, normalized];
      setHashtags(newHashtags);
      onChange?.(newHashtags);
    }
    
    setInputValue('');
  };

  const removeHashtag = (tagToRemove: string) => {
    const newHashtags = hashtags.filter(tag => tag !== tagToRemove);
    setHashtags(newHashtags);
    onChange?.(newHashtags);
    // Focus input after removing a tag
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add tag on Enter or comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue);
      }
    }
    
    // Delete last tag on Backspace when input is empty
    if (e.key === 'Backspace' && !inputValue && hashtags.length > 0) {
      e.preventDefault();
      const lastTag = hashtags[hashtags.length - 1];
      removeHashtag(lastTag);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Allow paste, but handle comma-separated pastes
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const tags = pastedText.split(/[,\s]+/).filter(tag => tag.trim());
    
    if (tags.length > 1) {
      // Multiple tags pasted - add all of them
      const newHashtags = [...hashtags];
      tags.forEach(tag => {
        const normalized = normalizeHashtag(tag.trim());
        if (normalized && normalized !== '#') {
          const isDuplicate = newHashtags.some(
            existingTag => existingTag.toLowerCase() === normalized.toLowerCase()
          );
          if (!isDuplicate) {
            newHashtags.push(normalized);
          }
        }
      });
      setHashtags(newHashtags);
      onChange?.(newHashtags);
      setInputValue('');
    } else {
      // Single tag or just text - set as input value
      setInputValue(pastedText.trim());
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Container with chips and input */}
      <div className={`
        w-full px-3 py-2 border rounded-lg 
        ${error ? 'border-red-300' : 'border-gray-300'} 
        focus-within:ring-2 focus-within:ring-[#6366F1] focus-within:border-transparent
        transition-all duration-150
        min-h-[42px]
        flex flex-wrap gap-2 items-center
        ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
      `}>
        {/* Hashtag chips */}
        {hashtags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 text-sm rounded-md font-medium"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeHashtag(tag)}
                className="ml-0.5 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded transition-colors"
                aria-label={`Remove ${tag}`}
                tabIndex={-1}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            )}
          </span>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={hashtags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className={`
            flex-1 min-w-[120px] outline-none bg-transparent
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
          aria-label="Hashtag input"
        />
      </div>
      
      {/* Helper text or error */}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

// Helper function to convert comma-separated string to array for initial value
export function parseHashtagsFromString(input: string | string[] | null | undefined): string[] {
  if (Array.isArray(input)) {
    return normalizeHashtags(input);
  }
  if (typeof input === 'string') {
    const parts = input.split(/[,\s]+/).filter(part => part.trim());
    return normalizeHashtags(parts);
  }
  return [];
}

