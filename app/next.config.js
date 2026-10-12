const path = require('path');
// Custom (self-hosted / vanity) Supabase domain must be NetworkOnly too
const CUSTOM_SUPABASE_RULES = [];
try {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname;
  if (host && !/(^|\.)supabase\.(co|in)$/i.test(host)) {
    CUSTOM_SUPABASE_RULES.push({
      urlPattern: new RegExp('^https://' + host.replace(/\./g, '\\.') + '(/|$)', 'i'),
      handler: 'NetworkOnly'
    });
  }
} catch (e) {
  // no/invalid Supabase URL at build time: nothing extra to add
}

const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // registered by src/components/shell/ServiceWorkerRegister.tsx (next-pwa's injection doesn't run for the App Router)
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  // Do not pre-download the whole build (137 files) when the worker installs: on slow or flaky connections that
  // made the install fail ('redundant') and kept the worker, push and offline mode from ever starting. Hashed
  // assets are cached on first use by the runtime rules below instead.
  buildExcludes: [/.*/],
  publicExcludes: ['!**/*'],
  runtimeCaching: [
    {
      // Supabase REST / auth / storage / realtime: user data and tokens must
      // never be served from (or written to) a cache. (urlPattern values are
      // serialized into the service worker, so they must be self-contained.)
      urlPattern: /^https:\/\/([^/]*\.)?supabase\.(co|in)(\/|$)/i,
      handler: 'NetworkOnly'
    },
    ...CUSTOM_SUPABASE_RULES,
    {
      // Our own API routes are always live, same-origin only
      urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly'
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      urlPattern: /\.(?:js|css|woff2?)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    {
      // Page navigations: always try the network first so a new deploy is never
      // shadowed by stale HTML; the cache is only an offline fallback.
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        networkTimeoutSeconds: 5,
        cacheName: 'pages',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    }
  ]
});

const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

module.exports = withPWA(nextConfig);
