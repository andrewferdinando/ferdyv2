import { redirect } from 'next/navigation';

export default function BillingRedirectPage({ params }: { params: { brandId: string } }) {
  redirect(`/brands/${params.brandId}/account/billing`);
}
