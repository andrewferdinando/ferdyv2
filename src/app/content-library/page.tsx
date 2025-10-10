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


export default function ContentLibraryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('ready-to-use');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsAttentionContent, setNeedsAttentionContent] = useState<ContentItem[]>([]);
  const [readyContent, setReadyContent] = useState<ContentItem[]>([]);
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
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
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
            {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
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
                  Drop folders like &quot;GoKarts&quot;, &quot;VR Experience Packages&quot;, etc. Images will be automatically organized.
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
                        onDelete={() => {
                          setSlidingOutItemId(item.id);
                          setTimeout(() => {
                            setNeedsAttentionContent(prev => prev.filter(contentItem => contentItem.id !== item.id));
                            setSlidingOutItemId(null);
                          }, 400);
                        }}
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
