'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import NewPostModal from '@/components/schedule/NewPostModal';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Open modal immediately when page loads
    setIsModalOpen(true);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    // Navigate back to schedule page
    router.push(`/brands/${brandId}/schedule`);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    // Navigate back to schedule page
    router.push(`/brands/${brandId}/schedule`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Post</h1>
          <p className="text-gray-600 mt-1">Schedule a manual post across your social channels</p>
        </div>

        {/* Modal will be rendered immediately */}
        <NewPostModal
          isOpen={isModalOpen}
          onClose={handleClose}
          brandId={brandId}
          onSuccess={handleSuccess}
        />
      </div>
    </AppLayout>
  );
}
