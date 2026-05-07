import { redirect } from 'next/navigation';

export default function RootPage() {
    // If middleware didn't intercept and rewrite, default to the corporate landing page
    redirect('/corporate');
}
