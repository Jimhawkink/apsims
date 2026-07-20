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
                hostname: 'zkamuhvrmazozhudbtuw.supabase.co',
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
        // NOTE: CSP is defined ONLY in vercel.json (applied at Vercel edge).
        // Defining CSP here too would cause double-enforcement where browsers
        // apply the INTERSECTION (most restrictive) of both policies — blocking YouTube.
        return [
            {
                source: '/(.*)',
                headers: [
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

