'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Divider, Tabs } from 'antd';
import { User, Lock, ArrowRight, Github } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export const LoginForm: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const router = useRouter();
    const [form] = Form.useForm();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            if (mode === 'signup') {
                const { data, error } = await authClient.signUp.email({
                    email: values.email,
                    password: values.password,
                    name: values.name || values.email.split('@')[0],
                });

                console.log('Sign-up response:', { data, error });

                if (error) {
                    console.error('Sign-up error details:', error);
                    message.error(error.message || 'Failed to create account');
                    return;
                }

                message.success('Account created! You are now signed in.');
                router.push('/dashboard');
            } else {
                const { data, error } = await authClient.signIn.email({
                    email: values.email,
                    password: values.password,
                });

                if (error) {
                    message.error(error.message || 'Invalid credentials');
                    return;
                }

                message.success('Welcome back to Sourcify');
                router.push('/dashboard');
            }
        } catch (err) {
            message.error('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <Tabs
                activeKey={mode}
                onChange={(key) => setMode(key as 'signin' | 'signup')}
                centered
                items={[
                    { key: 'signin', label: 'Sign In' },
                    { key: 'signup', label: 'Create Account' },
                ]}
                className="mb-6"
            />

            <Form
                form={form}
                name="auth_form"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                layout="vertical"
                size="large"
            >
                {mode === 'signup' && (
                    <Form.Item
                        name="name"
                        rules={[{ required: true, message: 'Please input your name!' }]}
                    >
                        <Input
                            prefix={<User size={18} className="text-slate-400" />}
                            placeholder="Full Name"
                            className="rounded-lg"
                        />
                    </Form.Item>
                )}

                <Form.Item
                    name="email"
                    rules={[
                        { required: true, message: 'Please input your email!' },
                        { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                >
                    <Input
                        prefix={<User size={18} className="text-slate-400" />}
                        placeholder="Email address"
                        className="rounded-lg"
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                >
                    <Input.Password
                        prefix={<Lock size={18} className="text-slate-400" />}
                        placeholder="Password"
                        className="rounded-lg"
                    />
                </Form.Item>

                {mode === 'signin' && (
                    <Form.Item>
                        <div className="flex justify-between items-center">
                            <Form.Item name="remember" valuePropName="checked" noStyle>
                                <Checkbox>Remember me</Checkbox>
                            </Form.Item>
                            <a href="#" className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                                Forgot password?
                            </a>
                        </div>
                    </Form.Item>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                        icon={<ArrowRight size={18} />}
                        className="h-12 bg-teal-600 hover:bg-teal-500 border-none shadow-lg shadow-teal-600/30 font-medium text-base"
                    >
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Button>
                </Form.Item>
            </Form>

            <Divider plain><span className="text-slate-400 text-xs uppercase font-medium">Or continue with</span></Divider>

            <div className="grid grid-cols-2 gap-4">
                <Button block icon={<Github size={16} />} className="h-10 mt-2">
                    Github
                </Button>
                <Button block className="h-10 mt-2 font-medium">
                    SSO
                </Button>
            </div>
        </div>
    );
};
