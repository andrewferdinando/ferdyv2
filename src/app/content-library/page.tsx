'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

// Icons
const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UploadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const TagIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const InfoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface Tag {
  label: string;
  color: string;
}

interface ContentItem {
  id: number;
  title: string;
  image: string;
  tags: Tag[];
  uploadedDate: string;
  file?: File;
  status?: string;
  cropSettings?: CropSettings;
}

interface CropSettings {
  aspectRatio: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CROP_FORMATS = [
  { label: "1.91:1 Landscape", ratio: "1.91:1", value: "landscape" },
  { label: "4:5 Portrait", ratio: "4:5", value: "portrait" },
  { label: "1:1 Square", ratio: "1:1", value: "square" },
  { label: "Original No Crop", ratio: "original", value: "original" }
];

// Available tags from categories
const AVAILABLE_TAGS = [
  // Deals
  { label: "Happy Hour Special", color: "bg-blue-100 text-blue-800", category: "deals" },
  { label: "Student Discount", color: "bg-blue-100 text-blue-800", category: "deals" },
  { label: "Weekend Deal", color: "bg-blue-100 text-blue-800", category: "deals" },
  { label: "Group Discount", color: "bg-blue-100 text-blue-800", category: "deals" },
  
  // Offerings
  { label: "VR Experience Packages", color: "bg-green-100 text-green-800", category: "offerings" },
  { label: "Corporate Team Building", color: "bg-green-100 text-green-800", category: "offerings" },
  { label: "Arcade Gaming", color: "bg-green-100 text-green-800", category: "offerings" },
  { label: "Laser Tag Arena", color: "bg-green-100 text-green-800", category: "offerings" },
  
  // Seasonal Events
  { label: "Summer Gaming Tournament", color: "bg-purple-100 text-purple-800", category: "seasonal" },
  { label: "Holiday Special", color: "bg-purple-100 text-purple-800", category: "seasonal" },
  { label: "Birthday Parties", color: "bg-purple-100 text-purple-800", category: "seasonal" },
  { label: "New Year Event", color: "bg-purple-100 text-purple-800", category: "seasonal" }
];

// Crop Info Component
const CropInfo = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowPopup(true)}
        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
        aria-label="About crop sizes"
      >
        <InfoIcon className="w-4 h-4" />
      </button>

      {/* Tooltip */}
      {showTooltip && !showPopup && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-10 animate-in fade-in duration-150">
          About crop sizes
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* Popup */}
      {showPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setShowPopup(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-lg max-w-md mx-4 p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">About crop sizes</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-gray-700 text-sm leading-relaxed space-y-3 mb-6">
              <p>You can crop in three formats only: Square (1:1), Portrait (5:4), and Wide (1.91:1).</p>
              <p>If your uploaded image doesn&apos;t fit one of these, it&apos;s automatically adjusted within these frames.</p>
              <p>You can reposition and zoom to get the composition you want — your original file remains unchanged.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors duration-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Toast Notification Component
const Toast = ({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-2">
        <span className="text-green-500 text-sm">✅</span>
        <span className="text-gray-900 text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// Image Cropping Component
const ImageCropper = ({ 
  src, 
  onCropChange, 
  cropSettings,
  onSave,
  itemId
}: { 
  src: string; 
  onCropChange: (settings: CropSettings) => void; 
  cropSettings?: CropSettings;
  onSave: (itemId: number) => void;
  itemId: number;
}) => {
  const [selectedFormat, setSelectedFormat] = useState("square");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    // Reset position for new format
    setImagePosition({ x: 0, y: 0 });
    
    // Calculate crop settings based on format
    const settings: CropSettings = {
      aspectRatio: format,
      x: 0,
      y: 0,
      width: 100,
      height: format === "square" ? 100 : format === "portrait" ? 125 : format === "landscape" ? 80 : 100
    };
    onCropChange(settings);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedFormat !== "original") {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedFormat !== "original") {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setImagePosition(newPosition);
      
      const settings: CropSettings = {
        aspectRatio: selectedFormat,
        x: newPosition.x,
        y: newPosition.y,
        width: 100,
        height: selectedFormat === "square" ? 100 : selectedFormat === "portrait" ? 125 : selectedFormat === "landscape" ? 80 : 100
      };
      onCropChange(settings);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTagToggle = (tagLabel: string) => {
    setSelectedTags(prev => 
      prev.includes(tagLabel) 
        ? prev.filter(tag => tag !== tagLabel)
        : [...prev, tagLabel]
    );
  };

  const addCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()]);
      setNewTag("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Image and Cropping */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Image Cropping</h3>
              <CropInfo />
            </div>
            
            {/* Format Selection */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              {CROP_FORMATS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => handleFormatChange(format.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                    selectedFormat === format.value
                      ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1]'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>

            {/* Image Preview */}
            <div 
              className="relative bg-gray-100 rounded-lg overflow-hidden cursor-move select-none" 
              style={{ aspectRatio: selectedFormat === "square" ? "1/1" : selectedFormat === "portrait" ? "4/5" : selectedFormat === "landscape" ? "1.91/1" : "auto" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={src}
                  alt="Crop preview"
                  className="absolute inset-0 transition-transform duration-100"
                  style={{
                    width: '120%',
                    height: '120%',
                    left: '-10%',
                    top: '-10%',
                    objectFit: 'cover',
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Aspect ratio: {CROP_FORMATS.find(f => f.value === selectedFormat)?.ratio}
              </div>
              {selectedFormat !== "original" && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  Click and drag to reposition
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="w-full lg:w-80">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
          
          {/* Available Tags */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Tags</h4>
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {AVAILABLE_TAGS.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagToggle(tag.label)}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                    selectedTags.includes(tag.label)
                      ? `bg-[#6366F1] text-white border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-50 shadow-lg transform scale-110`
                      : `bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:scale-105`
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tags */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Tags</h4>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add custom tag"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
              />
              <button
                onClick={addCustomTag}
                className="px-3 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customTags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => onSave(itemId)}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Save & Move to Ready
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Video Content Component
const VideoContent = ({ 
  src, 
  title,
  onSave,
  itemId
}: { 
  src: string; 
  title: string;
  onSave: (itemId: number) => void;
  itemId: number;
}) => {
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagToggle = (tagLabel: string) => {
    setSelectedTags(prev => 
      prev.includes(tagLabel) 
        ? prev.filter(tag => tag !== tagLabel)
        : [...prev, tagLabel]
    );
  };

  const addCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()]);
      setNewTag("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Video Preview */}
        <div className="flex-1">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Video Content</h3>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
              <video
                src={src}
                className="w-full h-full object-cover"
                controls
              />
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="w-full lg:w-80">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
          
          {/* Available Tags */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Tags</h4>
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {AVAILABLE_TAGS.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagToggle(tag.label)}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                    selectedTags.includes(tag.label)
                      ? `bg-[#6366F1] text-white border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-50 shadow-lg transform scale-110`
                      : `bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:scale-105`
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tags */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Tags</h4>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add custom tag"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
              />
              <button
                onClick={addCustomTag}
                className="px-3 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customTags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => onSave(itemId)}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Save & Move to Ready
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ContentLibraryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('ready-to-use');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsAttentionContent, setNeedsAttentionContent] = useState<ContentItem[]>([]);
  const [readyContent, setReadyContent] = useState<ContentItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const tabs = [
    { id: 'ready-to-use', label: 'Ready to Use', count: readyContent.length },
    { id: 'needs-attention', label: 'Needs Attention', count: needsAttentionContent.length },
  ];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newContent = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        file: file,
        image: URL.createObjectURL(file),
        tags: [],
        uploadedDate: `Uploaded ${new Date().toLocaleDateString()}`,
        status: 'needs-attention'
      }));
      
      setNeedsAttentionContent(prev => [...prev, ...newContent]);
      setActiveTab('needs-attention'); // Switch to needs attention tab
    }
  };

  const handleSave = (itemId: number) => {
    // Find the item to move
    const itemToMove = needsAttentionContent.find(item => item.id === itemId);
    if (itemToMove) {
      // Add to ready content
      setReadyContent(prev => [...prev, { ...itemToMove, status: 'ready' }]);
      // Remove from needs attention
      setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
      setToastMessage('✅ Image saved — moved to Ready tab');
      setShowToast(true);
    }
  };

  const handleToastClose = () => {
    setShowToast(false);
  };

  const contentItems: ContentItem[] = [
    {
      id: 1,
      title: "Arcade Gaming",
      image: "/placeholders/cropped_gameover_may_142.png",
      tags: [
        { label: "Student Discount", color: "bg-blue-100 text-blue-800" },
        { label: "Happy Hour Special", color: "bg-blue-100 text-blue-800" },
        { label: "custom-1", color: "bg-blue-100 text-blue-800" }
      ],
      uploadedDate: "Uploaded 1/15/2024"
    },
    {
      id: 2,
      title: "Laser Tag Arena",
      image: "/placeholders/cropped_gameover_may_143.png",
      tags: [
        { label: "Corporate Team Building", color: "bg-green-100 text-green-800" },
        { label: "Student Discount", color: "bg-green-100 text-green-800" }
      ],
      uploadedDate: "Uploaded 1/14/2024"
    },
    {
      id: 3,
      title: "VR Experience",
      image: "/placeholders/cropped_gameover_may_140.png",
      tags: [
        { label: "custom-2", color: "bg-purple-100 text-purple-800" },
        { label: "seasonal-1", color: "bg-purple-100 text-purple-800" }
      ],
      uploadedDate: "Uploaded 1/13/2024"
    },
    {
      id: 4,
      title: "Sports Zone",
      image: "/placeholders/cropped_gameover_may_124.png",
      tags: [
        { label: "custom-3", color: "bg-orange-100 text-orange-800" },
        { label: "offering-1", color: "bg-orange-100 text-orange-800" }
      ],
      uploadedDate: "Uploaded 1/12/2024"
    },
    {
      id: 5,
      title: "Party Room",
      image: "/placeholders/cropped_gameover_may_107 (1).png",
      tags: [
        { label: "custom-4", color: "bg-pink-100 text-pink-800" },
        { label: "deal-1", color: "bg-pink-100 text-pink-800" }
      ],
      uploadedDate: "Uploaded 1/11/2024"
    },
    {
      id: 6,
      title: "Gaming Lounge",
      image: "/placeholders/cropped_gameover_may_119 - Copy.png",
      tags: [
        { label: "deal-2", color: "bg-indigo-100 text-indigo-800" },
        { label: "custom-1", color: "bg-indigo-100 text-indigo-800" }
      ],
      uploadedDate: "Uploaded 1/10/2024"
    }
  ];

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Content Library</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage your media assets, templates, and reusable content</p>
            </div>
            <button 
              onClick={() => router.back()}
              className="bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 px-4 py-2 w-full sm:w-auto"
            >
              ← Back to Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Search and Upload Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search images by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] transition-all duration-200"
              />
            </div>

            {/* Upload Button */}
            <button 
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center space-x-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm w-full sm:w-auto"
            >
              <UploadIcon className="w-4 h-4" />
              <span>Upload Content</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-4 sm:gap-8 mb-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 border-b-2 font-medium transition-all duration-200 text-sm ${
                  activeTab === tab.id
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {tab.count}
              </button>
            ))}
          </div>

          {/* Content Display */}
          {activeTab === 'ready-to-use' ? (
            /* Grid Layout for Ready to Use */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {readyContent.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <UploadIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No ready content yet</h3>
                  <p className="text-gray-600">Upload and tag some images to see them here.</p>
                </div>
              ) : (
                readyContent.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  {/* Image/Video */}
                  <div className="aspect-video bg-gray-200 overflow-hidden">
                    {item.file?.type.startsWith('video/') ? (
                      <video
                        src={item.image}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 text-lg mb-4">{item.title}</h3>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {item.tags.map((tag, index) => (
                        <span key={index} className={`px-2 py-1 text-xs font-medium rounded-full ${tag.color}`}>
                          {tag.label}
                        </span>
                      ))}
                    </div>

                    {/* Actions and Metadata */}
                    <div className="flex items-center justify-between text-sm">
                      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200">
                        <TagIcon className="w-4 h-4" />
                        <span>Manage Tags</span>
                      </button>
                      <span className="text-gray-500">{item.uploadedDate}</span>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          ) : (
            /* List Layout for Needs Attention */
            <div className="space-y-6">
              {needsAttentionContent.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <UploadIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content needs attention</h3>
                  <p className="text-gray-600">Upload some images or videos to get started with tagging and cropping.</p>
                </div>
              ) : needsAttentionContent.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-green-500 mb-4">
                    <UploadIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All images are tagged — great job!</h3>
                  <p className="text-gray-600">You&apos;ve successfully tagged all your content. Ready for the next batch!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {needsAttentionContent.map((item) => (
                    <div key={item.id} className="animate-in fade-in duration-300">
                      {item.file?.type.startsWith('video/') ? (
                        <VideoContent 
                          src={item.image} 
                          title={item.title}
                          onSave={handleSave}
                          itemId={item.id}
                        />
                      ) : (
                        <ImageCropper 
                          src={item.image} 
                          onCropChange={(settings) => {
                            setNeedsAttentionContent(prev => 
                              prev.map(content => 
                                content.id === item.id 
                                  ? { ...content, cropSettings: settings }
                                  : content
                              )
                            );
                          }}
                          cropSettings={item.cropSettings}
                          onSave={handleSave}
                          itemId={item.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onClose={handleToastClose} 
      />
    </AppLayout>
  );
}
