import { redirect } from 'next/navigation';

export default function PublishedPage() {
  // Redirect to main schedule page with published tab
  redirect('/brands/[brandId]/schedule?tab=published');
}
