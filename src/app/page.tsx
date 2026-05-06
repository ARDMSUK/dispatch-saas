import { redirect } from 'next/navigation';

export default function RootPage() {
    // If middleware didn't intercept and rewrite, default to the consumer landing page
    redirect('/consumer-landing');
}
