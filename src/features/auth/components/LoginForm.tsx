'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Divider } from 'antd';
import { User, Lock, ArrowRight, Github } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const LoginForm: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        // Mock login delay
        console.log('Login values:', values);
        setTimeout(() => {
            setLoading(false);
            message.success('Welcome back to Sourcify');
            router.push('/onboarding'); // Redirect to isolated onboarding flow
        }, 1500);
    };

    return (
        <div className="w-full">
            <Form
                name="login"
                initialValues={{ remember: true }}
                onFinish={onFinish}
                layout="vertical"
                size="large"
            >
                <Form.Item
                    name="email"
                    rules={[{ required: true, message: 'Please input your email!' }]}
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

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                        icon={<ArrowRight size={18} />}
                        className="h-12 bg-teal-600 hover:bg-teal-500 border-none shadow-lg shadow-teal-600/30 font-medium text-base"
                    >
                        Sign In
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
