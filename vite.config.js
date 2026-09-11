import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* ─── Per-route static meta ────────────────────────────────────────────────
   At build time, for every entry below this plugin copies dist/index.html
   into dist/{route}/index.html and replaces <title>, <meta description>,
   <link canonical>, og:title, og:description, og:url, and Twitter tags so
   Googlebot sees the correct meta on the first HTML response without waiting
   for React to hydrate.  No Puppeteer / Chrome needed — works on Cloudflare.
─────────────────────────────────────────────────────────────────────────── */
const SITE = 'https://webaurix.com'

const ROUTES = [
  // ── Core pages ──────────────────────────────────────────────────────────
  {
    path: '/about',
    title: 'About Webaurix | Digital Agency in Lahore, Pakistan',
    desc: 'Meet Webaurix — a Lahore-based digital agency with 100+ products shipped for clients in Pakistan, South Korea, the US, and the UK.',
  },
  {
    path: '/contact',
    title: 'Contact Webaurix | Get a Free Project Quote',
    desc: 'Reach Webaurix for web development, AI solutions, mobile apps, or digital marketing. Free quotes for Pakistan, US, UK, and South Korea clients.',
  },
  {
    path: '/book-consultation',
    title: 'Book a Free Consultation | Webaurix',
    desc: 'Book a free 30-minute strategy call with Webaurix. We scope your project, recommend the right tech stack, and give you a clear delivery timeline.',
  },
  {
    path: '/careers',
    title: 'Careers at Webaurix | Join Our Engineering Team',
    desc: 'Build real products at Webaurix. We hire engineers, designers, and marketers who want ownership, fast learning, and meaningful work from Lahore, Pakistan.',
  },
  {
    path: '/case-studies',
    title: 'Case Studies | Webaurix Client Results',
    desc: 'Explore Webaurix case studies: faster websites, higher conversions, AI automations, and mobile apps shipped for brands in Pakistan, the US, and the UK.',
  },
  {
    path: '/resources/webaurix-faqs',
    title: 'FAQs | Webaurix Web & AI Services Explained',
    desc: 'Answers to common questions about Webaurix services — pricing, timelines, tech stacks, support, and working with a digital agency in Lahore, Pakistan.',
  },
  {
    path: '/blogs',
    title: 'Blog | Web Dev, AI & Digital Marketing Insights',
    desc: 'Practical articles from the Webaurix team on React, AI chatbots, SEO, mobile apps, and digital marketing — written by engineers who ship products.',
  },

  // ── Core service pages ───────────────────────────────────────────────────
  {
    path: '/services/web-development',
    title: 'Custom Web Development Services | React & Next.js – Webaurix',
    desc: 'React and Next.js websites that load in under 2 s and score 90+ on Core Web Vitals. Webaurix has shipped 100+ products for clients in Pakistan, the US, and the UK.',
  },
  {
    path: '/services/app-development',
    title: 'iOS & Android App Development Services | Webaurix',
    desc: 'React Native and Flutter apps that share 70% code, run at 60 fps, and reach both app stores fast. Webaurix has shipped 50+ mobile products globally.',
  },
  {
    path: '/services/ui-ux-design',
    title: 'UI/UX Design Services | Figma & Usability Testing – Webaurix',
    desc: 'Figma-first UI/UX design backed by heatmaps, moderated usability sessions, and A/B testing. Webaurix turns research insights into interfaces that retain users.',
  },
  {
    path: '/services/custom-software-development',
    title: 'Custom Software Development | SaaS & API – Webaurix',
    desc: 'Bespoke SaaS platforms, workflow automations, and system integrations built on proven architectures. Webaurix engineers have modernised legacy stacks for 50+ businesses.',
  },
  {
    path: '/services/digital-marketing',
    title: 'Digital Marketing Services | SEO, PPC & Growth – Webaurix',
    desc: 'GA4, GTM, Hotjar, and Klaviyo-driven digital marketing that grows organic traffic, lowers CPA, and lifts revenue. Webaurix serves brands in Pakistan, the US, and the UK.',
  },

  // ── Web Development sub-services ────────────────────────────────────────
  {
    path: '/services/ecommerce-development',
    title: 'E-Commerce Development | Shopify & WooCommerce – Webaurix',
    desc: 'Shopify, WooCommerce, and headless e-commerce stores engineered for fast checkout and high conversion. Webaurix has launched 30+ online stores for brands in Pakistan and the UK.',
  },
  {
    path: '/services/cms-development',
    title: 'CMS Development | Sanity, Contentful & WordPress – Webaurix',
    desc: 'Headless CMS builds on Sanity, Contentful, and WordPress with custom content models, editorial workflows, and GraphQL APIs. Webaurix makes content teams self-sufficient.',
  },
  {
    path: '/services/progressive-web-apps',
    title: 'Progressive Web App Development | PWA – Webaurix',
    desc: 'Offline-ready, installable PWAs with sub-second loads and push notifications — built with Workbox and Vite. Webaurix has shipped PWAs used across Pakistan, the US, and South Korea.',
  },

  // ── App Development sub-services ────────────────────────────────────────
  {
    path: '/services/cross-platform-app-development',
    title: 'Cross-Platform App Development | React Native & Flutter – Webaurix',
    desc: 'Single codebase, two app stores. Webaurix builds React Native and Flutter apps that share 70% of code and deliver native 60 fps performance on iOS and Android.',
  },
  {
    path: '/services/enterprise-app-development',
    title: 'Enterprise App Development | SSO & ERP Integration – Webaurix',
    desc: 'Secure enterprise mobile apps with SSO, SAP/Salesforce integration, audit logging, and RBAC. Webaurix has delivered enterprise apps for clients in the US, UK, and South Korea.',
  },
  {
    path: '/services/ar-vr-game-apps',
    title: 'AR, VR & Game App Development | Unity – Webaurix',
    desc: 'ARKit, ARCore, and Unity-powered AR/VR experiences and mobile games built for iOS and Android. Webaurix ships immersive apps for brands in Pakistan, the US, and South Korea.',
  },

  // ── UI/UX sub-services ───────────────────────────────────────────────────
  {
    path: '/services/branding',
    title: 'Brand Identity & Logo Design Services | Webaurix',
    desc: 'Strategic brand identity — logo, typography, colour system, and brand guidelines — built in Figma and delivered print-ready. Webaurix has branded 40+ companies globally.',
  },
  {
    path: '/services/wireframing-prototyping',
    title: 'Wireframing & Prototyping Services | Figma – Webaurix',
    desc: 'Clickable Figma prototypes validated with real users before a single line of code is written. Webaurix reduces expensive mid-build revisions for startups and enterprises alike.',
  },
  {
    path: '/services/product-research',
    title: 'Product Research & UX Strategy | Webaurix',
    desc: 'User interviews, competitive analysis, and heatmap-backed UX strategy that gives your product a measurable edge. Webaurix has researched 30+ digital products across four markets.',
  },

  // ── Custom Software sub-services ─────────────────────────────────────────
  {
    path: '/services/saas-solutions',
    title: 'SaaS Application Development | Multi-Tenant – Webaurix',
    desc: 'Multi-tenant SaaS platforms with Stripe billing, RBAC, and API-first architecture. Webaurix has launched SaaS products now used by thousands of users in the US, UK, and Pakistan.',
  },
  {
    path: '/services/api-integration',
    title: 'API Integration & Third-Party Connectivity | Webaurix',
    desc: 'REST and GraphQL API integrations with Stripe, Salesforce, HubSpot, SAP, and 50+ other platforms. Webaurix connects your stack so your team stops doing manual data entry.',
  },
  {
    path: '/services/legacy-system-modernization',
    title: 'Legacy System Modernisation | Cloud Migration – Webaurix',
    desc: 'Strangler-fig migrations from monoliths and on-premise stacks to cloud-native microservices — with parallel-run rollouts and zero business downtime. Webaurix has modernised 20+ systems.',
  },

  // ── Digital Marketing sub-services ──────────────────────────────────────
  {
    path: '/services/seo-optimization',
    title: 'SEO Optimisation Services | Technical & Content – Webaurix',
    desc: 'Technical SEO audits, Core Web Vitals fixes, schema markup, and content strategy that lift organic rankings. Webaurix clients see measurable traffic gains within 90 days.',
  },
  {
    path: '/services/ppc-advertising',
    title: 'PPC Advertising | Google Ads & Meta Ads – Webaurix',
    desc: 'ROI-positive Google Ads and Meta Ads campaigns managed with GA4 and GTM. Webaurix optimises bids, creatives, and landing pages to lower your CPA and grow revenue.',
  },
  {
    path: '/services/social-media-marketing',
    title: 'Social Media Marketing Services | Webaurix',
    desc: 'Content strategy, paid social, and community management across LinkedIn, Instagram, and TikTok. Webaurix grows follower counts and pipeline for B2B and B2C brands globally.',
  },
  {
    path: '/services/email-content-marketing',
    title: 'Email & Content Marketing Services | Webaurix',
    desc: 'Mailchimp and Klaviyo email flows, blog content, and lead nurture sequences that convert subscribers into customers. Webaurix has run campaigns for brands in Pakistan, the US, and the UK.',
  },

  // ── AI service pages ─────────────────────────────────────────────────────
  {
    path: '/services/ai/gen-ai',
    title: 'Custom Generative AI Development Services | Webaurix',
    desc: 'GPT-4o, Claude 3.5, and Gemini 1.5 generative AI solutions — chatbots, image tools, and document automation. Webaurix has shipped 20+ gen-AI products for clients in Pakistan, the US, and South Korea.',
  },
  {
    path: '/services/ai/web',
    title: 'AI-Powered Web & App Development | Webaurix',
    desc: 'React, TypeScript, and Node.js web and app products enhanced with AI recommendation engines, smart search, and NLP layers. Webaurix ships AI-native products that convert 20-40% better.',
  },
  {
    path: '/services/ai/chatbot',
    title: 'Custom AI Chatbot Development Services | Webaurix',
    desc: 'RAG-powered AI chatbots built on GPT-4o and Claude 3.5 — resolving 70%+ of queries without human agents. Webaurix integrates with Intercom, Zendesk, and Freshdesk for Pakistan, US, and UK clients.',
  },
  {
    path: '/services/ai-data-consulting',
    title: 'AI & Data Consulting for Business Growth | Webaurix',
    desc: 'scikit-learn, TensorFlow, dbt, and Airflow-powered AI and data consulting that delivers 90%+ model accuracy and 20-35% churn reduction. Webaurix serves businesses in Pakistan, the US, and South Korea.',
  },

  // ── Consultancy pages ────────────────────────────────────────────────────
  {
    path: '/consultancy/it-strategy',
    title: 'IT Strategy Consulting for Business Growth | Webaurix',
    desc: 'TOGAF and ITIL-aligned IT strategy roadmaps that cut infrastructure costs 20-35% and align technology with revenue goals. Webaurix advises companies in Pakistan, the US, the UK, and South Korea.',
  },
  {
    path: '/consultancy/digital-transformation',
    title: 'Digital Transformation Consulting | Webaurix',
    desc: 'RPA, dbt, and cloud-native transformation delivered in 4-6 week sprints with parallel-run rollouts. Webaurix has led digital transformation programmes for mid-market companies across Pakistan and the UK.',
  },
  {
    path: '/consultancy/cybersecurity',
    title: 'Cybersecurity Consulting & Risk Assessment | Webaurix',
    desc: 'OWASP Top 10 audits, ISO 27001 gap analysis, SIEM deployment, and quarterly pen tests with under-2h incident containment. Webaurix secures platforms for clients in Pakistan, the US, and South Korea.',
  },
  {
    path: '/consultancy/cloud',
    title: 'Cloud Consulting, Migration & DevOps | Webaurix',
    desc: 'AWS Well-Architected and Azure Landing Zone cloud migrations with GitHub Actions CI/CD and 30-45% cost savings. Webaurix has migrated 30+ companies to cloud-native infrastructure.',
  },
  {
    path: '/consultancy/startup-it',
    title: 'Startup IT Consulting & MVP Strategy | Webaurix',
    desc: 'From idea to deployed MVP in 6-10 weeks on under $50/month infrastructure. Webaurix has advised 100+ startups across Pakistan, the US, and South Korea on tech stack and fundraising readiness.',
  },
]

/* Build-time plugin — creates dist/{route}/index.html with static meta tags.
   Runs after Rollup finishes (closeBundle). Pure Node.js fs — no browser. */
const injectRouteMeta = () => ({
  name: 'inject-route-meta',
  enforce: 'post',
  apply: 'build',
  async closeBundle() {
    const { default: fs } = await import('node:fs')
    const { default: path } = await import('node:path')
    const distDir = path.join(process.cwd(), 'dist')
    const baseHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')

    for (const route of ROUTES) {
      const safeTitle = route.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const safeDesc = route.desc.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const canonicalUrl = `${SITE}${route.path}`

      const html = baseHtml
        .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${safeDesc}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/,        `$1${canonicalUrl}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/,       `$1${safeTitle}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${safeDesc}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/,          `$1${canonicalUrl}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${safeTitle}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${safeDesc}$2`)

      // Write as `segment.html` (not `segment/index.html`) so Cloudflare
      // serves it directly for /segment without a trailing-slash redirect.
      const segments = route.path.replace(/^\//, '').split('/')
      const filename = segments.pop()
      const outDir = segments.length > 0
        ? path.join(distDir, ...segments)
        : distDir
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, `${filename}.html`), html, 'utf-8')
    }
  },
})

/* Make the app stylesheet non-render-blocking. The inline splash (in index.html)
   paints immediately; the full CSS loads asynchronously and is ready before
   React mounts, so there is no flash of unstyled content. Build-only. */
const asyncCss = () => ({
  name: 'async-css',
  enforce: 'post',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*?)\/?>/g,
      (_m, pre, href, post) =>
        `<link rel="stylesheet" media="print" onload="this.media='all'"${pre}href="${href}"${post}>` +
        `<noscript><link rel="stylesheet"${pre}href="${href}"${post}></noscript>`
    );
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    asyncCss(),
    injectRouteMeta(),
  ],
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      mangle: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('lucide-react')) return 'vendor-lucide';
        },
      },
    },
  },
})
