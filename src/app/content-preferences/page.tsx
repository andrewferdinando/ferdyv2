'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

interface FormatOption {
  label: string;
  value: string;
  aspectRatio: string;
  description: string;
  recommended?: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    label: "Square (1:1)",
    value: "square",
    aspectRatio: "1 / 1",
    description: "Recommended for most channels",
    recommended: true,
  },
  {
    label: "Portrait (4:5)",
    value: "portrait",
    aspectRatio: "4 / 5",
    description: "Taller format, great for feeds",
  },
  {
    label: "Wide (1.91:1)",
    value: "wide",
    aspectRatio: "1.91 / 1",
    description: "Landscape for link previews/banners",
  },
];

export default function ContentPreferencesPage() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<string>('square');
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    // Load preferences from localStorage
    const savedFormat = localStorage.getItem('preferredImageFormat');
    if (savedFormat) {
      setSelectedFormat(savedFormat);
    }
  }, []);

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    localStorage.setItem('preferredImageFormat', format);
    setSaveMessage('Preferences saved');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleOpenContentLibrary = () => {
    router.push('/content-library');
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Content Preferences</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Images in Ferdy use three formats: Square (1:1), Portrait (4:5), and Wide (1.91:1). 
              When you upload, we&apos;ll adapt your image to fit these frames as needed.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Default Format Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Default image format</h2>
                {saveMessage && (
                  <div className="flex items-center space-x-2 text-green-600 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{saveMessage}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFormatChange(option.value)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                      selectedFormat === option.value
                        ? 'border-[#6366F1] bg-[#EEF2FF]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{option.label}</span>
                          {option.recommended && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedFormat === option.value
                          ? 'border-[#6366F1] bg-[#6366F1]'
                          : 'border-gray-300'
                      }`}>
                        {selectedFormat === option.value && (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                You can change the format per post or per image later.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
              <p className="text-gray-600 text-sm mb-4">
                If your upload doesn&apos;t match a format, we&apos;ll fit it into the frame. 
                You can reposition and crop later without affecting the original.
              </p>
              
              {/* Visual examples */}
              <div className="grid grid-cols-3 gap-4">
                {/* Square */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-sm"></div>
                  </div>
                  <p className="text-xs text-gray-600">Square (1:1)</p>
                </div>
                
                {/* Portrait */}
                <div className="text-center">
                  <div className="w-12 h-16 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200">
                    <div className="w-8 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-sm"></div>
                  </div>
                  <p className="text-xs text-gray-600">Portrait (4:5)</p>
                </div>
                
                {/* Wide */}
                <div className="text-center">
                  <div className="w-20 h-12 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200">
                    <div className="w-16 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-sm"></div>
                  </div>
                  <p className="text-xs text-gray-600">Wide (1.91:1)</p>
                </div>
              </div>
            </div>

            {/* Editing later callout */}
            <div className="bg-[#EEF2FF] rounded-xl border border-[#C7D2FE] p-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">Need a different crop for a specific post?</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Edit the image anytime in the Content Library.
                  </p>
                  <button
                    onClick={handleOpenContentLibrary}
                    className="px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
                  >
                    Open Content Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}