import { redirect } from 'next/navigation';

export default async function ProfileRedirectPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  redirect(`/brands/${brandId}/account/profile`);
}
