'use client';

import React from 'react';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';

export default function LoginPageContent() {
    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Enter your credentials to access your global trade intelligence."
        >
            <LoginForm />
        </AuthLayout>
    );
}
