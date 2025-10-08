'use client';

import AppLayout from '@/components/layout/AppLayout';

// Icons from Lucide React
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function DesignSystemPage() {
  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-10 py-6">
          <div>
            <h1 className="text-[32px] font-bold text-gray-950 leading-[1.2]">Design System</h1>
            <p className="text-gray-600 mt-1 text-sm">Ferdy design system showcase and component library</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8">
          
          {/* Color Palette */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Color Palette</h2>
            
            {/* Primary Colors */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] rounded-xl p-6 text-white">
                  <div className="font-semibold">Primary</div>
                  <div className="text-sm opacity-90">#6366F1 to #4F46E5</div>
                </div>
                <div className="bg-[#EEF2FF] rounded-xl p-6">
                  <div className="font-semibold text-[#6366F1]">Primary Light</div>
                  <div className="text-sm text-gray-600">#EEF2FF</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="font-semibold text-gray-700">Neutral</div>
                  <div className="text-sm text-gray-500">Gray Scale</div>
                </div>
              </div>
            </div>

            {/* Semantic Colors */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Semantic Colors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#EF4444] rounded-xl p-6 text-white">
                  <div className="font-semibold">Error</div>
                  <div className="text-sm opacity-90">#EF4444</div>
                </div>
                <div className="bg-[#10B981] rounded-xl p-6 text-white">
                  <div className="font-semibold">Success</div>
                  <div className="text-sm opacity-90">#10B981</div>
                </div>
              </div>
            </div>

            {/* Social Platform Colors */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Social Platform Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1877F2] rounded-xl p-6 text-white">
                  <div className="font-semibold">Facebook</div>
                  <div className="text-sm opacity-90">#1877F2</div>
                </div>
                <div className="bg-[#E4405F] rounded-xl p-6 text-white">
                  <div className="font-semibold">Instagram</div>
                  <div className="text-sm opacity-90">#E4405F</div>
                </div>
                <div className="bg-[#0A66C2] rounded-xl p-6 text-white">
                  <div className="font-semibold">LinkedIn</div>
                  <div className="text-sm opacity-90">#0A66C2</div>
                </div>
                <div className="bg-[#000000] rounded-xl p-6 text-white">
                  <div className="font-semibold">Twitter</div>
                  <div className="text-sm opacity-90">#000000</div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Typography</h2>
            <div className="space-y-4">
              <div>
                <h1 className="text-[32px] font-bold text-gray-950 leading-[1.2] mb-2">Heading 1 - 32px Bold</h1>
                <code className="text-sm text-gray-500">text-[32px] font-bold text-gray-950</code>
              </div>
              <div>
                <h2 className="text-[24px] font-semibold text-gray-950 leading-[1.3] mb-2">Heading 2 - 24px Semibold</h2>
                <code className="text-sm text-gray-500">text-[24px] font-semibold text-gray-950</code>
              </div>
              <div>
                <h3 className="text-[20px] font-semibold text-gray-950 leading-[1.4] mb-2">Heading 3 - 20px Semibold</h3>
                <code className="text-sm text-gray-500">text-[20px] font-semibold text-gray-950</code>
              </div>
              <div>
                <p className="text-[16px] font-normal text-gray-700 leading-[1.5] mb-2">Body Large - 16px Normal</p>
                <code className="text-sm text-gray-500">text-[16px] font-normal text-gray-700</code>
              </div>
              <div>
                <p className="text-[14px] font-normal text-gray-700 leading-[1.5] mb-2">Body - 14px Normal</p>
                <code className="text-sm text-gray-500">text-[14px] font-normal text-gray-700</code>
              </div>
              <div>
                <p className="text-[12px] font-medium text-gray-500 leading-[1.4] mb-2">Caption - 12px Medium</p>
                <code className="text-sm text-gray-500">text-[12px] font-medium text-gray-500</code>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Buttons</h2>
            
            {/* Primary Buttons */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-6 py-3 rounded-[10px] flex items-center space-x-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm">
                  <PlusIcon />
                  <span>Large Primary</span>
                </button>
                <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-5 py-2.5 rounded-[10px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm">
                  Medium Primary
                </button>
                <button className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white px-3 py-2 rounded-[10px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm">
                  Small Primary
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Secondary Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-[10px] font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                  Large Secondary
                </button>
                <button className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-[10px] font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                  Medium Secondary
                </button>
                <button className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-[10px] font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                  Small Secondary
                </button>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ghost Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <button className="bg-transparent text-gray-700 px-6 py-3 font-medium text-sm hover:bg-gray-100 transition-all duration-200">
                  Large Ghost
                </button>
                <button className="bg-transparent text-gray-700 px-5 py-2.5 font-medium text-sm hover:bg-gray-100 transition-all duration-200">
                  Medium Ghost
                </button>
                <button className="bg-transparent text-gray-700 px-3 py-2 font-medium text-sm hover:bg-gray-100 transition-all duration-200">
                  Small Ghost
                </button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Icon Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-gray-700">
                  <EditIcon />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-red-600">
                  <TrashIcon />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200 text-gray-500 hover:text-gray-700">
                  <CalendarIcon />
                </button>
              </div>
            </div>
          </section>

          {/* Cards */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Cards</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <h3 className="font-semibold text-gray-900 mb-2">Standard Card</h3>
                <p className="text-gray-600 text-sm mb-4">
                  This is a standard card with hover effects. It demonstrates the card styling with proper spacing and transitions.
                </p>
                <button className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-sm flex items-center transition-colors duration-200">
                  Learn More →
                </button>
              </div>

              {/* Interactive Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#EEF2FF] rounded-lg flex items-center justify-center">
                    <CalendarIcon />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Interactive Card</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Cards can be interactive and contain various content types.
                    </p>
                    <button className="text-[#6366F1] hover:text-[#4F46E5] font-medium text-sm transition-colors duration-200">
                      Open →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Badges */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Badges</h2>
            
            <div className="flex flex-wrap gap-4">
              <span className="inline-flex items-center px-2.5 py-1 bg-[#EEF2FF] text-[#6366F1] text-xs font-semibold rounded-md">
                Primary Badge
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">
                Gray Badge
              </span>
              <span className="inline-flex items-center px-3 py-1.5 bg-[#EEF2FF] text-[#6366F1] text-xs font-semibold rounded-md">
                Large Badge
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-[#FEF2F2] text-[#EF4444] text-xs font-semibold rounded-md">
                Error Badge
              </span>
              <span className="inline-flex items-center px-2.5 py-1 bg-[#ECFDF5] text-[#10B981] text-xs font-semibold rounded-md">
                Success Badge
              </span>
            </div>
          </section>

          {/* Form Elements */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Form Elements</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Field */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Input Fields</h3>
                <div className="space-y-4">
                  <input 
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150"
                    placeholder="Standard input field"
                  />
                  <input 
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150"
                    placeholder="Focused input field"
                    defaultValue="This input is focused"
                  />
                </div>
              </div>

              {/* Dropdown */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dropdown</h3>
                <div className="relative">
                  <select className="w-full h-10 px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition-all duration-150 appearance-none">
                    <option>Select an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tabs</h2>
            
            <div className="flex space-x-8 border-b border-gray-200">
              <button className="pb-3 border-b-2 border-[#6366F1] text-[#6366F1] font-medium transition-all duration-200">
                Active Tab
              </button>
              <button className="pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium transition-all duration-200">
                Inactive Tab
              </button>
              <button className="pb-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium transition-all duration-200">
                Another Tab
              </button>
            </div>
          </section>

          {/* Shadows */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Shadows & Elevation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Small Shadow</h3>
                <code className="text-xs text-gray-500">shadow-sm</code>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">Medium Shadow</h3>
                <code className="text-xs text-gray-500">shadow-md</code>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Large Shadow</h3>
                <code className="text-xs text-gray-500">shadow-lg</code>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Extra Large Shadow</h3>
                <code className="text-xs text-gray-500">shadow-xl</code>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
