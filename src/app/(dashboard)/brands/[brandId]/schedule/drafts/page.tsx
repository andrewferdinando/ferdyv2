import { redirect } from 'next/navigation';

interface DraftsPageProps {
  params: {
    brandId: string;
  };
}

export default function DraftsPage({ params }: DraftsPageProps) {
  // Redirect to main schedule page with drafts tab
  redirect(`/brands/${params.brandId}/schedule?tab=drafts`);
}
