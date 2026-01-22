import { Metadata } from 'next';
import { ComplianceAlerts } from '@/features/compliance/components/ComplianceAlerts';

export const metadata: Metadata = {
  title: 'Compliance Alerts | Sourcify',
  description: 'Monitor tariff rate changes and get notified when duties change for your products.',
};

export default function AlertsPage() {
  return <ComplianceAlerts />;
}
