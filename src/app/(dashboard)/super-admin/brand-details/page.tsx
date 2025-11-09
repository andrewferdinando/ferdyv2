'use client';

import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { useState } from 'react';

export default function BrandDetailsPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const [brandData, setBrandData] = useState({
    businessName: 'Game Over Arcade',
    industry: 'Entertainment & Recreation',
    foundedYear: '2018',
    location: 'Downtown Entertainment District',
    description: 'Premier arcade and gaming center offering classic and modern arcade games, VR experiences, and competitive gaming tournaments.',
    mission: 'To provide an inclusive, fun, and exciting gaming environment that brings people together through the joy of arcade gaming.',
    values: 'Community, Fun, Innovation, Accessibility, Competition',
    targetAudience: 'Gamers of all ages, families, competitive players, and entertainment seekers',
    uniqueSellingPoints: 'Largest arcade in the region, VR gaming pods, tournament hosting, birthday party packages',
    products: 'Arcade games, VR experiences, gaming tournaments, party packages, merchandise',
    services: 'Gaming events, birthday parties, corporate team building, game rentals, tournament hosting',
    history: 'Founded in 2018 by gaming enthusiasts who wanted to create a community hub for arcade gaming. Started with 20 classic arcade machines and has grown to over 100 games including the latest VR technology.',
    socialMediaPresence: 'Active on Instagram, Facebook, and TikTok with gaming highlights, tournament results, and community events',
    competition: 'Local gaming cafes and family entertainment centers, but we differentiate through our extensive arcade collection and tournament focus',
    futureGoals: 'Expand to include esports training facilities, develop our own gaming tournaments, and create a mobile app for game reservations and leaderboards'
  });

  const industryOptions = [
    { value: 'Entertainment & Recreation', label: 'Entertainment & Recreation' },
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Education', label: 'Education' },
    { value: 'Professional Services', label: 'Professional Services' },
    { value: 'Other', label: 'Other' }
  ];

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // Save logic would go here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };


  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Brand Details</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage Business Information</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Details</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Business Name" required>
                      <Input
                        type="text"
                        value={brandData.businessName}
                        onChange={(e) => setBrandData({ ...brandData, businessName: e.target.value })}
                      />
                    </FormField>

                    <FormField label="Industry">
                      <Select
                        value={brandData.industry}
                        onChange={(e) => setBrandData({ ...brandData, industry: e.target.value })}
                        options={industryOptions}
                      />
                    </FormField>

                    <FormField label="Founded Year">
                      <Input
                        type="text"
                        value={brandData.foundedYear}
                        onChange={(e) => setBrandData({ ...brandData, foundedYear: e.target.value })}
                      />
                    </FormField>

                    <FormField label="Location">
                      <Input
                        type="text"
                        value={brandData.location}
                        onChange={(e) => setBrandData({ ...brandData, location: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <FormField label="Business Description">
                    <Textarea
                      value={brandData.description}
                      onChange={(e) => setBrandData({ ...brandData, description: e.target.value })}
                      rows={3}
                    />
                  </FormField>

                  <FormField label="Mission Statement">
                    <Textarea
                      value={brandData.mission}
                      onChange={(e) => setBrandData({ ...brandData, mission: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Core Values">
                    <Input
                      type="text"
                      value={brandData.values}
                      onChange={(e) => setBrandData({ ...brandData, values: e.target.value })}
                      placeholder="Separate values with commas"
                    />
                  </FormField>

                  <FormField label="Target Audience">
                    <Textarea
                      value={brandData.targetAudience}
                      onChange={(e) => setBrandData({ ...brandData, targetAudience: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Unique Selling Points">
                    <Textarea
                      value={brandData.uniqueSellingPoints}
                      onChange={(e) => setBrandData({ ...brandData, uniqueSellingPoints: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Products">
                    <Textarea
                      value={brandData.products}
                      onChange={(e) => setBrandData({ ...brandData, products: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Services">
                    <Textarea
                      value={brandData.services}
                      onChange={(e) => setBrandData({ ...brandData, services: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Company History">
                    <Textarea
                      value={brandData.history}
                      onChange={(e) => setBrandData({ ...brandData, history: e.target.value })}
                      rows={3}
                    />
                  </FormField>

                  <FormField label="Social Media Presence">
                    <Textarea
                      value={brandData.socialMediaPresence}
                      onChange={(e) => setBrandData({ ...brandData, socialMediaPresence: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Competition Analysis">
                    <Textarea
                      value={brandData.competition}
                      onChange={(e) => setBrandData({ ...brandData, competition: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormField label="Future Goals">
                    <Textarea
                      value={brandData.futureGoals}
                      onChange={(e) => setBrandData({ ...brandData, futureGoals: e.target.value })}
                      rows={2}
                    />
                  </FormField>

                  <FormActions
                    onCancel={handleCancel}
                    submitText="Save Changes"
                  />
                </Form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Business Name</h3>
                      <p className="text-gray-900">{brandData.businessName}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Industry</h3>
                      <p className="text-gray-900">{brandData.industry}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Founded Year</h3>
                      <p className="text-gray-900">{brandData.foundedYear}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Location</h3>
                      <p className="text-gray-900">{brandData.location}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Business Description</h3>
                    <p className="text-gray-900">{brandData.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Mission Statement</h3>
                    <p className="text-gray-900">{brandData.mission}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Core Values</h3>
                    <p className="text-gray-900">{brandData.values}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Target Audience</h3>
                    <p className="text-gray-900">{brandData.targetAudience}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Unique Selling Points</h3>
                    <p className="text-gray-900">{brandData.uniqueSellingPoints}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Products</h3>
                    <p className="text-gray-900">{brandData.products}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Services</h3>
                    <p className="text-gray-900">{brandData.services}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Company History</h3>
                    <p className="text-gray-900">{brandData.history}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Social Media Presence</h3>
                    <p className="text-gray-900">{brandData.socialMediaPresence}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Competition Analysis</h3>
                    <p className="text-gray-900">{brandData.competition}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Future Goals</h3>
                    <p className="text-gray-900">{brandData.futureGoals}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
