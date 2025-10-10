'use client';

import React, { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';

// Icons

const UploadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
}

// Available tags from categories
const AVAILABLE_TAGS = [
  { label: "Student Discount", color: "bg-blue-100 text-blue-800" },
  { label: "Happy Hour Special", color: "bg-green-100 text-green-800" },
  { label: "Corporate Team Building", color: "bg-purple-100 text-purple-800" },
  { label: "Weekend Special", color: "bg-orange-100 text-orange-800" },
  { label: "Family Package", color: "bg-pink-100 text-pink-800" },
  { label: "Birthday Party", color: "bg-indigo-100 text-indigo-800" },
  { label: "Holiday Special", color: "bg-red-100 text-red-800" },
  { label: "Summer Promotion", color: "bg-yellow-100 text-yellow-800" }
];

// Crop formats
const CROP_FORMATS = [
  { label: "1.91:1 Landscape", ratio: "1.91:1", value: "landscape" },
  { label: "4:5 Portrait", ratio: "4:5", value: "portrait" },
  { label: "1:1 Square", ratio: "1:1", value: "square" }
];

// Image Cropping Component
const ImageCropper = ({ 
  src, 
  onSave,
  onDelete,
  itemId,
  onNext,
  isEditing = false,
  initialTags = [],
  currentImageIndex = 0,
  totalImages = 1
}: { 
  src: string; 
  onSave: (itemId: number, tags?: Tag[]) => void;
  onDelete: (itemId: number) => void;
  onNext: () => void;
  itemId: number;
  isEditing?: boolean;
  initialTags?: Tag[];
  currentImageIndex?: number;
  totalImages?: number;
}) => {
  const [selectedFormat, setSelectedFormat] = useState("square");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags.map(tag => tag.label));
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  // Reset component state when itemId changes
  React.useEffect(() => {
    setSelectedFormat("square");
    setCustomTags([]);
    setSelectedTags(initialTags.map(tag => tag.label));
    setImagePosition({ x: 0, y: 0 });
    setShowTagInput(false);
    setNewTagValue('');
  }, [itemId, initialTags]);

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setImagePosition(newPosition);
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


  const handleAddCustomTag = () => {
    if (newTagValue.trim() && !selectedTags.includes(newTagValue.trim()) && !customTags.includes(newTagValue.trim())) {
      const tagToAdd = newTagValue.trim();
      setCustomTags(prev => [...prev, tagToAdd]);
      setSelectedTags(prev => [...prev, tagToAdd]);
      setNewTagValue('');
      setShowTagInput(false);
    }
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTagValue('');
    }
  };

  const handleNext = () => {
    if (selectedTags.length === 0) {
      alert('Please add at least one tag before continuing.');
      return;
    }
    const tags = [...selectedTags.map(tag => ({ label: tag, color: "bg-gray-100 text-gray-800" }))];
    onSave(itemId, tags);
    onNext();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Image and Cropping */}
        <div className="flex-1">
          <div className="mb-4">
            
            {/* Format Selection - only show if not editing or if editing */}
            {(isEditing || !isEditing) && (
              <div className="grid grid-cols-3 gap-2 mb-4">
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
            )}

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
              {!isEditing && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} of {totalImages}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="w-full lg:w-80">
          
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
              
              {/* Custom Tags */}
              {customTags.map((tag, index) => (
                <button
                  key={`custom-${index}`}
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
              
              {/* Inline Add Tag Button */}
              {!showTagInput ? (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="px-1.5 py-0.5 text-xs font-medium rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all duration-200"
                >
                  + Tag
                </button>
              ) : (
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  onBlur={() => {
                    setShowTagInput(false);
                    setNewTagValue('');
                  }}
                  placeholder="Tag name"
                  className="px-1.5 py-0.5 text-xs border border-gray-300 rounded-full focus:ring-1 focus:ring-[#6366F1] focus:border-transparent outline-none min-w-[60px]"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              {isEditing ? 'Save' : 'Next Image'}
            </button>
            <button 
              onClick={() => onDelete(itemId)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
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
  onSave,
  onDelete,
  itemId,
  onNext,
  isEditing = false,
  initialTags = [],
  currentImageIndex = 0,
  totalImages = 1
}: { 
  src: string; 
  onSave: (itemId: number, tags?: Tag[]) => void;
  onDelete: (itemId: number) => void;
  onNext: () => void;
  itemId: number;
  isEditing?: boolean;
  initialTags?: Tag[];
  currentImageIndex?: number;
  totalImages?: number;
}) => {
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags.map(tag => tag.label));
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  // Reset component state when itemId changes
  React.useEffect(() => {
    setCustomTags([]);
    setSelectedTags(initialTags.map(tag => tag.label));
    setShowTagInput(false);
    setNewTagValue('');
  }, [itemId, initialTags]);

  const handleTagToggle = (tagLabel: string) => {
    setSelectedTags(prev => 
      prev.includes(tagLabel) 
        ? prev.filter(tag => tag !== tagLabel)
        : [...prev, tagLabel]
    );
  };

  const handleAddCustomTag = () => {
    if (newTagValue.trim() && !selectedTags.includes(newTagValue.trim()) && !customTags.includes(newTagValue.trim())) {
      const tagToAdd = newTagValue.trim();
      setCustomTags(prev => [...prev, tagToAdd]);
      setSelectedTags(prev => [...prev, tagToAdd]);
      setNewTagValue('');
      setShowTagInput(false);
    }
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTagValue('');
    }
  };

  const handleNext = () => {
    if (selectedTags.length === 0) {
      alert('Please add at least one tag before continuing.');
      return;
    }
    const tags = [...selectedTags.map(tag => ({ label: tag, color: "bg-gray-100 text-gray-800" }))];
    onSave(itemId, tags);
    onNext();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Video Preview */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
              <video
                src={src}
                className="w-full h-full object-cover"
                controls
              />
              {!isEditing && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {currentImageIndex + 1} of {totalImages}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="w-full lg:w-80">
          
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
              
              {/* Custom Tags */}
              {customTags.map((tag, index) => (
                <button
                  key={`custom-${index}`}
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
              
              {/* Inline Add Tag Button */}
              {!showTagInput ? (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="px-1.5 py-0.5 text-xs font-medium rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all duration-200"
                >
                  + Tag
                </button>
              ) : (
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  onBlur={() => {
                    setShowTagInput(false);
                    setNewTagValue('');
                  }}
                  placeholder="Tag name"
                  className="px-1.5 py-0.5 text-xs border border-gray-300 rounded-full focus:ring-1 focus:ring-[#6366F1] focus:border-transparent outline-none min-w-[60px]"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              {isEditing ? 'Save' : 'Next Image'}
            </button>
            <button 
              onClick={() => onDelete(itemId)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
);
};

export default function ContentLibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('ready-to-use');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsAttentionContent, setNeedsAttentionContent] = useState<ContentItem[]>([]);
  const [readyContent, setReadyContent] = useState<ContentItem[]>([
    {
      id: 1,
      title: "Arcade Gaming",
      image: "/placeholders/cropped_gameover_may_142.png",
      tags: [
        { label: "Student Discount", color: "bg-blue-100 text-blue-800" },
        { label: "Happy Hour Special", color: "bg-green-100 text-green-800" }
      ],
      uploadedDate: "Uploaded 1/15/2024"
    },
    {
      id: 2,
      title: "Laser Tag Arena",
      image: "/placeholders/cropped_gameover_may_143.png",
      tags: [
        { label: "Corporate Team Building", color: "bg-purple-100 text-purple-800" },
        { label: "Student Discount", color: "bg-green-100 text-green-800" }
      ],
      uploadedDate: "Uploaded 1/14/2024"
    }
  ]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const tabs = [
    { id: 'ready-to-use', label: 'Ready to Use', count: readyContent.length },
    { id: 'needs-attention', label: 'Needs Attention', count: needsAttentionContent.length }
  ];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newContent: ContentItem[] = Array.from(files).map((file, index) => ({
        id: Date.now() + index,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file: file,
        image: URL.createObjectURL(file),
        tags: [],
        uploadedDate: `Uploaded ${new Date().toLocaleDateString()}`
      }));

      setNeedsAttentionContent(prev => [...prev, ...newContent]);
      setActiveTab('needs-attention');
    }
  };

  const handleSave = (itemId: number, tags?: Tag[]) => {
    const itemToMove = needsAttentionContent.find(item => item.id === itemId);
    if (itemToMove) {
      const updatedItem = { 
        ...itemToMove, 
        status: 'ready',
        tags: tags || itemToMove.tags
      };
      setReadyContent(prev => [...prev, updatedItem]);
      setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
      
      // If we're in single-image view and there are more images, stay on the same index
      // If this was the last image, go back to the previous one
      if (currentImageIndex >= needsAttentionContent.length - 1) {
        setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
      }
    }
  };

  const handleDelete = (itemId: number) => {
    setNeedsAttentionContent(prev => prev.filter(item => item.id !== itemId));
    
    // Adjust current index if needed
    if (currentImageIndex >= needsAttentionContent.length - 1) {
      setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
    }
  };

  const handleEdit = (itemId: number) => {
    const itemToEdit = readyContent.find(item => item.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setActiveTab('needs-attention');
    }
  };

  const handleSaveEdit = (itemId: number, tags?: Tag[]) => {
    if (editingItem) {
      const updatedItem = { 
        ...editingItem, 
        tags: tags || editingItem.tags
      };
      setReadyContent(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
      setEditingItem(null);
      setActiveTab('ready-to-use');
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < needsAttentionContent.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // Reset current image index when needsAttentionContent changes
  React.useEffect(() => {
    if (currentImageIndex >= needsAttentionContent.length && needsAttentionContent.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [needsAttentionContent.length, currentImageIndex]);

  const filteredReadyContent = readyContent.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(tag => tag.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
              <p className="text-gray-600 mt-1">Manage your images and videos</p>
            </div>
            <button 
              onClick={handleUploadClick}
              className="flex items-center space-x-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              <UploadIcon />
              <span>Upload Content</span>
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
              <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

          {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          {/* Search */}
          {activeTab === 'ready-to-use' && (
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'ready-to-use' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredReadyContent.length > 0 ? (
                filteredReadyContent.map((item) => (
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
                  {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag, index) => (
                      <span key={index} className={`px-2 py-1 text-xs font-medium rounded-full ${tag.color}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>

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
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <UploadIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
                  <p className="text-gray-600 mb-4">Upload some images or videos to get started</p>
                  <button
                    onClick={handleUploadClick}
                    className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                  >
                    Upload Content
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {editingItem ? (
                /* Editing Mode - Show Ready item with crop options */
                <div>
                  <div className="mb-4 text-center">
                    <span className="text-sm text-gray-600">
                      Editing: {editingItem.title}
                    </span>
                  </div>
                  {editingItem.file?.type.startsWith('video/') ? (
                        <VideoContent 
                          src={editingItem.image} 
                          onSave={handleSaveEdit}
                          onDelete={() => setEditingItem(null)}
                          onNext={() => setEditingItem(null)}
                          itemId={editingItem.id}
                          isEditing={true}
                          initialTags={editingItem.tags}
                          currentImageIndex={0}
                          totalImages={1}
                        />
                  ) : (
                        <ImageCropper 
                          src={editingItem.image} 
                          onSave={handleSaveEdit}
                          onDelete={() => setEditingItem(null)}
                          onNext={() => setEditingItem(null)}
                          itemId={editingItem.id}
                          isEditing={true}
                          initialTags={editingItem.tags}
                          currentImageIndex={0}
                          totalImages={1}
                        />
                  )}
                </div>
              ) : needsAttentionContent.length > 0 ? (
                /* Normal Mode - Show Needs Attention items one by one */
                <div>
                  
                  {/* Current Image */}
                  {needsAttentionContent[currentImageIndex] && (
                    <div>
                      {needsAttentionContent[currentImageIndex].file?.type.startsWith('video/') ? (
                        <VideoContent 
                          src={needsAttentionContent[currentImageIndex].image} 
                          onSave={handleSave}
                          onDelete={handleDelete}
                          onNext={handleNextImage}
                          itemId={needsAttentionContent[currentImageIndex].id}
                          isEditing={false}
                          initialTags={needsAttentionContent[currentImageIndex].tags}
                          currentImageIndex={currentImageIndex}
                          totalImages={needsAttentionContent.length}
                        />
                      ) : (
                        <ImageCropper 
                          src={needsAttentionContent[currentImageIndex].image} 
                          onSave={handleSave}
                          onDelete={handleDelete}
                          onNext={handleNextImage}
                          itemId={needsAttentionContent[currentImageIndex].id}
                          isEditing={false}
                          initialTags={needsAttentionContent[currentImageIndex].tags}
                          currentImageIndex={currentImageIndex}
                          totalImages={needsAttentionContent.length}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <UploadIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-600 mb-4">No content needs attention right now</p>
                  <button
                    onClick={handleUploadClick}
                    className="px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#4F46E5] transition-colors"
                  >
                    Upload Content
                  </button>
                </div>
              )}
          </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}