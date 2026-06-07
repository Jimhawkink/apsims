/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'enlqpifpxuecxxozyiak.supabase.co',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
            // YouTube thumbnails
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i3.ytimg.com',
                pathname: '/**',
            },
        ],
    },
    async headers() {
        // Build a permissive but secure CSP that allows YouTube embeds + thumbnails
        const csp = [
            "default-src 'self'",
            // Scripts: self + inline (Next.js needs unsafe-inline for hydration)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.google.com https://www.gstatic.com",
            // Styles: self + inline + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Fonts
            "font-src 'self' https://fonts.gstatic.com",
            // Images: self + data URIs + Supabase + YouTube thumbnails + Unsplash + all HTTPS
            "img-src 'self' data: blob: https://enlqpifpxuecxxozyiak.supabase.co https://img.youtube.com https://i.ytimg.com https://i1.ytimg.com https://i2.ytimg.com https://i3.ytimg.com https://images.unsplash.com https://www.google.com https://lh3.googleusercontent.com",
            // Frames: allow YouTube embeds (both www and nocookie privacy-enhanced mode)
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
            // Connections: Supabase, APIs
            "connect-src 'self' https://enlqpifpxuecxxozyiak.supabase.co wss://enlqpifpxuecxxozyiak.supabase.co https://api.africastalking.com https://api.sandbox.africastalking.com",
            // Media: allow YouTube media streams
            "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com blob:",
            // Workers
            "worker-src 'self' blob:",
        ].join('; ');

        return [
            {
                source: '/(.*)',
                headers: [
                    // CSP — replaces the need for X-Frame-Options (we control framing via frame-src)
                    { key: 'Content-Security-Policy', value: csp },
                    // Don't use DENY here — it would block our own dashboard iframes
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;

