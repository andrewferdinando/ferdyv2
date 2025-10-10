'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

// Icons
const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ImageIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface ImageFormat {
  id: string;
  name: string;
  ratio: string;
  description: string;
  icon: string;
}

const IMAGE_FORMATS: ImageFormat[] = [
  {
    id: 'square',
    name: 'Square (1:1)',
    ratio: '1:1',
    description: 'Perfect for Instagram posts and profile pictures',
    icon: '⬜'
  },
  {
    id: 'portrait',
    name: 'Portrait (4:5)',
    ratio: '4:5',
    description: 'Ideal for Instagram stories and mobile-first content',
    icon: '📱'
  },
  {
    id: 'landscape',
    name: 'Landscape (16:9)',
    ratio: '16:9',
    description: 'Great for YouTube thumbnails and Facebook covers',
    icon: '🖥️'
  },
  {
    id: 'wide',
    name: 'Wide (1.91:1)',
    ratio: '1.91:1',
    description: 'Perfect for Facebook and LinkedIn posts',
    icon: '📊'
  }
];

export default function ContentPreferencesPage() {
  const [preferredFormats, setPreferredFormats] = useState<string[]>(['square', 'portrait']);
  const [defaultFormat, setDefaultFormat] = useState<string>('square');
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('');

  const handleFormatToggle = (formatId: string) => {
    setPreferredFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const handleSave = () => {
    // Here you would typically save to localStorage or send to an API
    const preferences = {
      preferredFormats,
      defaultFormat,
      autoCrop,
      watermarkEnabled,
      watermarkText
    };
    
    localStorage.setItem('contentPreferences', JSON.stringify(preferences));
    
    // Show success message (you could add a toast here)
    alert('Preferences saved successfully!');
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center space-x-3">
            <ImageIcon className="w-8 h-8 text-[#6366F1]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Preferences</h1>
              <p className="text-gray-600 mt-1">Configure your default image formats and settings</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10 max-w-4xl">
          {/* Preferred Image Formats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Image Formats</h2>
            <p className="text-gray-600 mb-6">
              Select which image formats you want to use when uploading content. 
              These will be available as cropping options in the Content Library.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {IMAGE_FORMATS.map((format) => (
                <div
                  key={format.id}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    preferredFormats.includes(format.id)
                      ? 'border-[#6366F1] bg-[#EEF2FF]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFormatToggle(format.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{format.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{format.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {format.ratio}
                        </span>
                      </div>
                    </div>
                    {preferredFormats.includes(format.id) && (
                      <div className="absolute top-3 right-3">
                        <CheckIcon className="w-5 h-5 text-[#6366F1]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Default Format */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Default Format</h2>
            <p className="text-gray-600 mb-4">
              Choose the default format that will be pre-selected when cropping images.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {IMAGE_FORMATS.filter(format => preferredFormats.includes(format.id)).map((format) => (
                <button
                  key={format.id}
                  onClick={() => setDefaultFormat(format.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    defaultFormat === format.id
                      ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">{format.icon}</div>
                    <div className="text-sm font-medium">{format.ratio}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Settings</h2>
            
            <div className="space-y-6">
              {/* Auto Crop */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Auto Crop</h3>
                  <p className="text-sm text-gray-600">Automatically suggest the best crop for uploaded images</p>
                </div>
                <button
                  onClick={() => setAutoCrop(!autoCrop)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCrop ? 'bg-[#6366F1]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoCrop ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Watermark */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Watermark</h3>
                  <p className="text-sm text-gray-600">Add a watermark to your images</p>
                </div>
                <button
                  onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    watermarkEnabled ? 'bg-[#6366F1]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      watermarkEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Watermark Text */}
              {watermarkEnabled && (
                <div>
                  <label htmlFor="watermark-text" className="block text-sm font-medium text-gray-700 mb-2">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    id="watermark-text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors font-medium"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
