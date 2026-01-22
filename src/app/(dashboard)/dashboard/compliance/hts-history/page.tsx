import { Metadata } from 'next';
import { HTSHistoryLookup } from '@/features/compliance/components/HTSHistoryLookup';

export const metadata: Metadata = {
  title: 'HTS Code History | Sourcify',
  description: 'Track HTS code changes over time. Find what old codes map to now or see what current codes used to be.',
};

export default function HTSHistoryPage() {
  return <HTSHistoryLookup />;
}
