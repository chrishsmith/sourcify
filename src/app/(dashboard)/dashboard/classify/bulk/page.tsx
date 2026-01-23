import { redirect } from 'next/navigation';

// Redirect to consolidated classify page with bulk tab
export default function BulkClassifyRedirect() {
    redirect('/dashboard/classifications?tab=bulk');
}
