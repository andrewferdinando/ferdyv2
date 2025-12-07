import { redirect } from 'next/navigation';

export default async function ContentLibraryRedirectPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  redirect(`/brands/${brandId}/engine-room/content-library`);
}
