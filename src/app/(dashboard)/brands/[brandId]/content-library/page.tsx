import { redirect } from 'next/navigation';

export default function ContentLibraryRedirectPage({ params }: { params: { brandId: string } }) {
  redirect(`/brands/${params.brandId}/engine-room/content-library`);
}
