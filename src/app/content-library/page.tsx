'use client';

import { useState, useRef } from 'react';
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

// Image Cropping Component
const ImageCropper = ({ 
  src, 
  onCropChange, 
  cropSettings 
}: { 
  src: string; 
  onCropChange: (settings: CropSettings) => void; 
  cropSettings?: CropSettings;
}) => {
  const [selectedFormat, setSelectedFormat] = useState("square");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
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
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Image Cropping</h3>
            
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
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: selectedFormat === "square" ? "1/1" : selectedFormat === "portrait" ? "4/5" : selectedFormat === "landscape" ? "1.91/1" : "auto" }}>
              <img
                src={src}
                alt="Crop preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Aspect ratio: {CROP_FORMATS.find(f => f.value === selectedFormat)?.ratio}
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
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {AVAILABLE_TAGS.map((tag, index) => (
                <button
                  key={index}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${tag.color} hover:opacity-80`}
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
            <button className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors">
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
  title 
}: { 
  src: string; 
  title: string; 
}) => {
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

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
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {AVAILABLE_TAGS.map((tag, index) => (
                <button
                  key={index}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${tag.color} hover:opacity-80`}
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
            <button className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:bg-[#4F46E5] transition-colors">
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

  const tabs = [
    { id: 'ready-to-use', label: 'Ready to Use', count: 6 },
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
              {contentItems.map((item) => (
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
              ))}
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
              ) : (
                needsAttentionContent.map((item) => (
                  <div key={item.id}>
                    {item.file?.type.startsWith('video/') ? (
                      <VideoContent 
                        src={item.image} 
                        title={item.title}
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
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
