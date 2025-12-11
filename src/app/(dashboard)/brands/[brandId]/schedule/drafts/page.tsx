import { redirect } from 'next/navigation';

interface DraftsPageProps {
  params: Promise<{
    brandId: string;
  }>;
}

export default async function DraftsPage({ params }: DraftsPageProps) {
  const { brandId } = await params;
  // Redirect to main schedule page with drafts tab
  redirect(`/brands/${brandId}/schedule?tab=drafts`);
}
