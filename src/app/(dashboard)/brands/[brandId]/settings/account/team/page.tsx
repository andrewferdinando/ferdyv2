import { redirect } from 'next/navigation';

export default async function TeamRedirectPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  redirect(`/brands/${brandId}/account/team`);
}
