import { redirect } from 'next/navigation';

export default function IntegrationsRedirectPage({ params }: { params: { brandId: string } }) {
  redirect(`/brands/${params.brandId}/engine-room/integrations`);
}
