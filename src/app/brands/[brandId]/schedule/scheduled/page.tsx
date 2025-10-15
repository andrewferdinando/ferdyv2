import { redirect } from 'next/navigation';

export default function ScheduledPage() {
  // Redirect to main schedule page with scheduled tab
  redirect('/brands/[brandId]/schedule?tab=scheduled');
}
