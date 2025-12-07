import { redirect } from 'next/navigation';

export default function AccountSettingsRedirectPage({ params }: { params: { brandId: string } }) {
  redirect(`/brands/${params.brandId}/account`);
}
