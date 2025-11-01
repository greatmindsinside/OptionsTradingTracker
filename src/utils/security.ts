/**
 * Security Headers Configuration
 * Content Security Policy and security best practices
 */

// Content Security Policy for production
export const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite in development
    "'unsafe-eval'", // Required for WASM modules
    'https://unpkg.com', // For CDN dependencies if needed
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS modules
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:', // For base64 encoded fonts
  ],
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'blob:', // For generated images
    'https:', // For external images if needed
  ],
  'connect-src': [
    "'self'",
    'ws:', // For WebSocket connections (HMR)
    'wss:', // For secure WebSocket connections
    'https://api.polygon.io', // If using external API
    'https://api.alpha-vantage.co', // If using external API
  ],
  'worker-src': [
    "'self'",
    'blob:', // For service worker
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

// Generate CSP string
export const generateCSP = (isDevelopment: boolean = false): string => {
  const directives = { ...cspDirectives };

  // Relax CSP for development
  if (isDevelopment) {
    directives['script-src'].push("'unsafe-eval'");
    directives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

// Security headers for different environments
export const securityHeaders = {
  // Production headers
  production: {
    'Content-Security-Policy': generateCSP(false),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  },

  // Development headers (more relaxed)
  development: {
    'Content-Security-Policy': generateCSP(true),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
};

// Express.js middleware types
interface ExpressRequest {
  [key: string]: unknown;
}

interface ExpressResponse {
  setHeader: (name: string, value: string) => void;
  [key: string]: unknown;
}

interface ExpressNext {
  (): void;
}

// Express.js middleware (if using Express server)
export const securityMiddleware = (isDevelopment: boolean = false) => {
  return (_req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => {
    const headers = isDevelopment ? securityHeaders.development : securityHeaders.production;

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
};

// Vite server types
interface ViteDevServer {
  middlewares: {
    use: (
      middleware: (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => void
    ) => void;
  };
  [key: string]: unknown;
}

// Vite plugin for security headers
export const viteSecurityPlugin = () => {
  return {
    name: 'security-headers',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(securityMiddleware(true));
    },
    configurePreviewServer(server: ViteDevServer) {
      server.middlewares.use(securityMiddleware(false));
    },
  };
};

// HTML meta tags for additional security
export const securityMetaTags = `
  <!-- Security Meta Tags -->
  <meta http-equiv="Content-Security-Policy" content="${generateCSP()}">
  <meta http-equiv="X-Frame-Options" content="DENY">
  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  
  <!-- Privacy and Permissions -->
  <meta name="robots" content="noindex, nofollow" /> <!-- Remove if you want indexing -->
  <meta http-equiv="Permissions-Policy" content="camera=(), geolocation=(), microphone=(), payment=()">
`;

// Netlify _headers file format
export const netlifyHeaders = `
/*
  Content-Security-Policy: ${generateCSP()}
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=()
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin

# Cache static assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache service worker with shorter expiry
/sw.js
  Cache-Control: public, max-age=86400

# Don't cache HTML files
/*.html
  Cache-Control: public, max-age=0, must-revalidate
`;

// Vercel headers configuration
export const vercelHeaders = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: generateCSP(),
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default {
  cspDirectives,
  generateCSP,
  securityHeaders,
  securityMiddleware,
  viteSecurityPlugin,
  securityMetaTags,
  netlifyHeaders,
  vercelHeaders,
};
