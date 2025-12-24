import { redirect } from 'next/navigation';

// Redirect /dashboard/classify to /dashboard/classifications
// All classification functionality is now consolidated there
export default function ClassifyRedirect() {
    redirect('/dashboard/classifications');
}
