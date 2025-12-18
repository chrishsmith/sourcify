import React from 'react';
import { Metadata } from 'next';
import OnboardingPageContent from '@/features/onboarding/components/OnboardingPageContent';

export const metadata: Metadata = {
    title: 'Onboarding - Sourcify',
    description: 'Set up your trade profile',
};

export default function OnboardingPage() {
    return <OnboardingPageContent />;
}
