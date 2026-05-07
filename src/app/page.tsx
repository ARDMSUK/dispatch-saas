import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default function RootPage() {
    const headersList = headers();
    const host = headersList.get('host') || '';
    
    if (host.startsWith('app.')) {
        redirect('/login');
    }

    // Default to the corporate landing page
    redirect('/corporate');
}
