import React from 'react';
import { Metadata } from 'next';
import LoginPageContent from '@/features/auth/components/LoginPageContent';

export const metadata: Metadata = {
    title: 'Login - Sourcify',
    description: 'Login to your Sourcify account',
};

export default function LoginPage() {
    return <LoginPageContent />;
}
