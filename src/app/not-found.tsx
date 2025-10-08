import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-gray-600 mt-1">The page you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
          <Link
            href="/schedule"
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go to Schedule
          </Link>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
