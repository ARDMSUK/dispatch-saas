import { redirect } from 'next/navigation';

export default async function TenantRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/booker/${slug}`);
}
