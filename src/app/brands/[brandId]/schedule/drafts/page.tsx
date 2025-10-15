import { redirect } from 'next/navigation';

export default function DraftsPage() {
  // Redirect to main schedule page with drafts tab
  redirect('/brands/[brandId]/schedule?tab=drafts');
}
