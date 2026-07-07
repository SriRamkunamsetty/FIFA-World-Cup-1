/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevents the browser from guessing content types (stops MIME-sniffing attacks).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Blocks the app from being embedded in a foreign iframe (clickjacking protection).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Limits how much referrer information is leaked to other origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disables browser APIs this app never uses.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    // Same-origin by default; no inline scripts, no third-party script hosts.
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework in response headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
