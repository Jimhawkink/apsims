import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import UpdateBanner from '@/components/pwa/UpdateBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'APSIMS - School Management System',
    description: 'Advanced Pupil & Staff Information Management System - Powered by Hawkinsoft Solutions',
    icons: {
        icon: '/favicon.svg',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#4f46e5" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="APSIMS" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body className={inter.className}>
                <ServiceWorkerRegistration />
                <Toaster
                    position="bottom-right"
                    reverseOrder={false}
                    gutter={8}
                    containerStyle={{ bottom: 20, right: 16 }}
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            color: '#1e293b',
                            padding: '14px 20px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
                            maxWidth: '420px',
                            border: '1px solid rgba(255,255,255,0.8)',
                        },
                        success: {
                            duration: 2500,
                            style: {
                                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
                                color: '#065f46',
                                border: '1px solid #6ee7b7',
                            },
                            iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
                        },
                        error: {
                            duration: 3500,
                            style: {
                                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)',
                                color: '#991b1b',
                                border: '1px solid #fca5a5',
                            },
                            iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
                        },
                    }}
                />
                {children}
                <InstallPrompt />
                <UpdateBanner />
            </body>
        </html>
    );
}
