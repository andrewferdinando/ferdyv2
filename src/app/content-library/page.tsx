'use client';

import React, { useState, useRef, useCallback } from 'react';
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

const FolderIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
  subCategory?: string;
  needsAttention?: boolean;
  attentionReason?: string;
}

interface CropSettings {
  aspectRatio: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CROP_FORMATS = [
  { label: "1.91:1 Wide", ratio: "1.91:1", value: "landscape" },
  { label: "4:5 Portrait", ratio: "4:5", value: "portrait" },
  { label: "1:1 Square", ratio: "1:1", value: "square" }
];

// Available sub-categories from categories page
const SUB_CATEGORIES = [
  // Deals
  "Happy Hour Special",
  "Student Discount", 
  "Weekend Deal",
  "Group Discount",
  
  // Offerings
  "VR Experience Packages",
  "Corporate Team Building",
  "Arcade Gaming",
  "Laser Tag Arena",
  "GoKarts",
  "Sports Zone",
  "Party Room",
  
  // Seasonal Events
  "Summer Gaming Tournament",
  "Holiday Special",
  "Birthday Parties",
  "New Year Event"
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
              <p>You can crop in three formats: Square (1:1), Portrait (4:5), and Landscape (1.91:1).</p>
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
    <div className="fixed top-32 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-2">
        <span className="text-green-500 text-sm">✓</span>
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
  onDelete,
  itemId,
  movingItemId,
  showSuccessAnimation,
  slidingOutItemId
}: { 
  src: string; 
  onCropChange: (settings: CropSettings) => void; 
  cropSettings?: CropSettings;
  onSave: (itemId: number, tags?: Tag[]) => void;
  onDelete: (itemId: number) => void;
  itemId: number;
  movingItemId: number | null;
  showSuccessAnimation: boolean;
  slidingOutItemId: number | null;
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
      const tagToAdd = newTag.trim();
      setCustomTags([...customTags, tagToAdd]);
      setSelectedTags(prev => [...prev, tagToAdd]); // Auto-highlight the new tag
      setNewTag("");
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 relative ${
      slidingOutItemId === itemId 
        ? 'transform -translate-x-full opacity-0 scale-95' 
        : movingItemId === itemId 
          ? 'transform translate-y-1 scale-[0.98]' 
          : 'transform translate-x-0 opacity-100 scale-100'
    }`}>
      {showSuccessAnimation && movingItemId === itemId && !slidingOutItemId && (
        <div className="absolute inset-0 bg-green-50 bg-opacity-95 rounded-xl flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="text-center">
            <div className="text-2xl mb-1 animate-in zoom-in duration-200">✅</div>
            <div className="text-sm font-medium text-green-700">Moved to Ready</div>
          </div>
        </div>
      )}
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
                  className="absolute transition-transform duration-100"
                  style={{
                    minWidth: '100%',
                    minHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '200%',
                    maxHeight: '200%',
                    left: '50%',
                    top: '50%',
                    objectFit: 'cover',
                    transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Aspect ratio: {CROP_FORMATS.find(f => f.value === selectedFormat)?.ratio}
              </div>
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Click and drag to reposition
              </div>
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
            <div className="flex flex-wrap gap-1 mb-2">
              {customTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? `bg-[#6366F1] text-white border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-50 shadow-lg transform scale-110`
                      : `bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:scale-105`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
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
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // Create tags array from selected tags
                const tags = [...selectedTags.map(tag => ({ label: tag, color: "bg-gray-100 text-gray-800" }))];
                onSave(itemId, tags);
              }}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Save & Move to Ready
            </button>
            <button 
              onClick={() => onDelete(itemId)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Needs Attention Item Component
const NeedsAttentionItem = ({ 
  item, 
  onAssignSubCategory, 
  onDelete 
}: { 
  item: ContentItem; 
  onAssignSubCategory: (itemId: number, subCategory: string) => void;
  onDelete: (itemId: number) => void;
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex gap-6">
        {/* Image */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h3>
          
          {item.attentionReason && (
            <p className="text-sm text-red-600 mb-3">{item.attentionReason}</p>
          )}

          {/* Quick Assign Actions */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to sub-category:</label>
              <div className="flex flex-wrap gap-2">
                {SUB_CATEGORIES.slice(0, 8).map((subCategory) => (
                  <button
                    key={subCategory}
                    onClick={() => onAssignSubCategory(item.id, subCategory)}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {subCategory}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 mt-4">
            <button 
              onClick={() => onDelete(item.id)}
              className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
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
  onDelete,
  itemId,
  movingItemId,
  showSuccessAnimation,
  slidingOutItemId
}: { 
  src: string; 
  title: string;
  onSave: (itemId: number, tags?: Tag[]) => void;
  onDelete: (itemId: number) => void;
  itemId: number;
  movingItemId: number | null;
  showSuccessAnimation: boolean;
  slidingOutItemId: number | null;
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
      const tagToAdd = newTag.trim();
      setCustomTags([...customTags, tagToAdd]);
      setSelectedTags(prev => [...prev, tagToAdd]); // Auto-highlight the new tag
      setNewTag("");
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 relative ${
      slidingOutItemId === itemId 
        ? 'transform -translate-x-full opacity-0 scale-95' 
        : movingItemId === itemId 
          ? 'transform translate-y-1 scale-[0.98]' 
          : 'transform translate-x-0 opacity-100 scale-100'
    }`}>
      {showSuccessAnimation && movingItemId === itemId && !slidingOutItemId && (
        <div className="absolute inset-0 bg-green-50 bg-opacity-95 rounded-xl flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="text-center">
            <div className="text-2xl mb-1 animate-in zoom-in duration-200">✅</div>
            <div className="text-sm font-medium text-green-700">Moved to Ready</div>
          </div>
        </div>
      )}
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
            <div className="flex flex-wrap gap-1 mb-2">
              {customTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                    selectedTags.includes(tag)
                      ? `bg-[#6366F1] text-white border-[#6366F1] ring-2 ring-[#6366F1] ring-opacity-50 shadow-lg transform scale-110`
                      : `bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:scale-105`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
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
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // Create tags array from selected tags
                const tags = [...selectedTags.map(tag => ({ label: tag, color: "bg-gray-100 text-gray-800" }))];
                onSave(itemId, tags);
              }}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Save & Move to Ready
            </button>
            <button 
              onClick={() => onDelete(itemId)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
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
  const [movingItemId, setMovingItemId] = useState<number | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [slidingOutItemId, setSlidingOutItemId] = useState<number | null>(null);
  const [preferredFormat, setPreferredFormat] = useState("square");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string[]>([]);

  const tabs = [
    { id: 'ready-to-use', label: 'Ready to Use', count: readyContent.length },
    { id: 'needs-attention', label: 'Needs Attention', count: needsAttentionContent.length },
  ];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Helper function to match folder name to sub-category
  const matchFolderToSubCategory = (folderName: string): string | null => {
    const normalizedFolderName = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return SUB_CATEGORIES.find(subCat => 
      subCat.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedFolderName
    ) || null;
  };

  // Process folder upload
  const processFolderUpload = useCallback((files: FileList) => {
    const feedback: string[] = [];
    const categorizedContent: ContentItem[] = [];
    const needsAttentionContent: ContentItem[] = [];
    
    // Group files by their directory path
    const filesByDirectory = new Map<string, File[]>();
    
    Array.from(files).forEach(file => {
      const path = (file as any).webkitRelativePath || '';
      const directory = path.split('/')[0] || 'root';
      
      if (!filesByDirectory.has(directory)) {
        filesByDirectory.set(directory, []);
      }
      filesByDirectory.get(directory)!.push(file);
    });

    // Process each directory
    filesByDirectory.forEach((files, directoryName) => {
      const subCategory = matchFolderToSubCategory(directoryName);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) return;

      const newContent = imageFiles.map((file, index) => ({
        id: Date.now() + Math.random() + index,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file: file,
        image: URL.createObjectURL(file),
        tags: [],
        uploadedDate: `Uploaded ${new Date().toLocaleDateString()}`,
        status: 'ready',
        subCategory: subCategory || undefined,
        needsAttention: !subCategory,
        attentionReason: !subCategory ? 'No matching sub-category found' : undefined
      }));

      if (subCategory) {
        categorizedContent.push(...newContent);
        feedback.push(`Imported ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} into ${subCategory}`);
      } else {
        needsAttentionContent.push(...newContent);
        feedback.push(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} from "${directoryName}" moved to Needs Attention`);
      }
    });

    // Update state
    if (categorizedContent.length > 0) {
      setReadyContent(prev => [...prev, ...categorizedContent]);
    }
    if (needsAttentionContent.length > 0) {
      setNeedsAttentionContent(prev => [...prev, ...needsAttentionContent]);
      setActiveTab('needs-attention');
    }

    // Show feedback
    setUploadFeedback(feedback);
    setTimeout(() => setUploadFeedback([]), 5000);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFolderUpload(files);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFolderUpload(files);
    }
  };

  const handleSave = (itemId: number, tags?: Tag[]) => {
    // Find the item to move
    const itemToMove = needsAttentionContent.find(item => item.id === itemId);
    if (itemToMove) {
      // Start micro transition sequence
      setMovingItemId(itemId);
      
      // Show success overlay
      setTimeout(() => {
        setShowSuccessAnimation(true);
        
        // Start slide out animation
        setTimeout(() => {
          setSlidingOutItemId(itemId);
          
          // Complete the transition
          setTimeout(() => {
            // Move the item to ready content with updated tags
            const updatedItem = { 
              ...itemToMove, 
              status: 'ready',
              tags: tags || itemToMove.tags
            };
            setReadyContent(prev => [...prev, updatedItem]);
            setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
            
            // Reset all animations
            setMovingItemId(null);
            setShowSuccessAnimation(false);
            setSlidingOutItemId(null);
          }, 400); // Slide out duration
        }, 600); // Success overlay duration
      }, 200); // Initial delay
    }
  };

  const handleDelete = (itemId: number) => {
    // Remove from needs attention with slide out animation
    setSlidingOutItemId(itemId);
    setTimeout(() => {
      setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
      setSlidingOutItemId(null);
    }, 400);
  };

  const handleEdit = (itemId: number) => {
    // Find the item to edit
    const itemToEdit = readyContent.find(item => item.id === itemId);
    if (itemToEdit) {
      // Move back to needs attention
      setNeedsAttentionContent(prev => [...prev, { ...itemToEdit, status: 'needs-attention' }]);
      // Remove from ready content
      setReadyContent(prev => prev.filter(item => item.id !== itemId));
      // Switch to needs attention tab
      setActiveTab('needs-attention');
    }
  };

  const handleAssignSubCategory = (itemId: number, subCategory: string) => {
    // Find the item in needs attention
    const itemToMove = needsAttentionContent.find(item => item.id === itemId);
    if (itemToMove) {
      // Move to ready content with assigned sub-category
      const updatedItem = {
        ...itemToMove,
        status: 'ready',
        subCategory: subCategory,
        needsAttention: false,
        attentionReason: undefined
      };
      setReadyContent(prev => [...prev, updatedItem]);
      setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
      
      // Show feedback
      setUploadFeedback([`Assigned to ${subCategory}`]);
      setTimeout(() => setUploadFeedback([]), 3000);
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
            accept="image/*"
            multiple
            webkitdirectory=""
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Preferred Format Selector */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-medium text-blue-900">Preferred Image Format</h3>
                <p className="text-xs text-blue-700 mt-1">Images may be resized or cropped to this format during post creation</p>
              </div>
              <div className="flex gap-2">
                {CROP_FORMATS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setPreferredFormat(format.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                      preferredFormat === format.value
                        ? 'border-[#6366F1] bg-[#6366F1] text-white'
                        : 'border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-100'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Feedback */}
          {uploadFeedback.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <div className="text-green-500 text-sm">✓</div>
                <div className="space-y-1">
                  {uploadFeedback.map((message, index) => (
                    <p key={index} className="text-sm text-green-800">{message}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search and Upload Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search images by name or sub-category..."
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
              <FolderIcon className="w-4 h-4" />
              <span>Upload Folder</span>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center mb-8 transition-colors duration-200 ${
              isDragOver 
                ? 'border-[#6366F1] bg-[#EEF2FF]' 
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-3">
              <FolderIcon className="w-12 h-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Drag and drop sub-category folders</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Drop folders like "GoKarts", "VR Experience Packages", etc. Images will be automatically organized.
                </p>
              </div>
              <button 
                onClick={handleUploadClick}
                className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-sm"
              >
                Or click to browse folders
              </button>
            </div>
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
                  <div className="aspect-square bg-gray-200 overflow-hidden">
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
                  <div className="p-4">
                    {/* Sub-category */}
                    {item.subCategory && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.subCategory}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.tags.map((tag, index) => (
                          <span key={index} className={`px-2 py-1 text-xs font-medium rounded-full ${tag.color}`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end text-sm">
                      <button 
                        onClick={() => handleEdit(item.id)}
                        className="flex items-center space-x-2 text-[#6366F1] hover:text-[#4F46E5] transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>
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
                    <div key={item.id} className={`transition-all duration-300 ${
                      slidingOutItemId === item.id 
                        ? 'animate-out fade-out slide-out-to-left duration-300' 
                        : 'animate-in fade-in slide-in-from-bottom duration-300'
                    }`}>
                      <NeedsAttentionItem 
                        item={item}
                        onAssignSubCategory={handleAssignSubCategory}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
    </AppLayout>
  );
}
