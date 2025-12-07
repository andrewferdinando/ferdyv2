import { redirect } from 'next/navigation';

export default function ProfileRedirectPage({ params }: { params: { brandId: string } }) {
  redirect(`/brands/${params.brandId}/account/profile`);
}
