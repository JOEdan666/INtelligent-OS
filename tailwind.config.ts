// @ts-nocheck
type Config = any

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // 启用类策略的暗色模式
  theme: {
    extend: {
      colors: {
        primary: '#0A84FF',
        secondary: '#5E5CE6',
        accent: '#0A84FF',
        neutral: '#1E1E1E',
        'neutral-light': '#2C2C2E',
        background: 'var(--bg-main)',
        card: 'var(--bg-card)',
        glass: 'var(--bg-glass)',
        text: 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'apple-subtle': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'apple-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      },
      transitionTimingFunction: {
        'apple-ease': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      transitionDuration: {
        '200': '200ms',
        '150': '150ms',
      },
      typography: (theme: any) => ({
        DEFAULT: {
          css: {
            color: theme('colors.slate.800'),
            lineHeight: '1.75',
            fontSize: '1rem',
            maxWidth: 'none',
            p: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            a: {
              color: theme('colors.blue.600'),
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.15s ease',
            },
            'a:hover': {
              color: theme('colors.blue.700'),
              textDecoration: 'underline',
            },
            h1: {
              fontWeight: '700',
              letterSpacing: '-0.02em',
              marginTop: '1.8rem',
              marginBottom: '1rem',
              lineHeight: '1.3',
            },
            h2: {
              fontWeight: '700',
              letterSpacing: '-0.015em',
              marginTop: '1.6rem',
              marginBottom: '0.8rem',
              lineHeight: '1.35',
            },
            h3: {
              fontWeight: '600',
              marginTop: '1.4rem',
              marginBottom: '0.6rem',
              lineHeight: '1.4',
            },
            h4: {
              fontWeight: '600',
              marginTop: '1.2rem',
              marginBottom: '0.5rem',
            },
            blockquote: {
              fontStyle: 'normal',
              color: theme('colors.slate.700'),
              borderLeftWidth: '4px',
              borderLeftColor: theme('colors.blue.400'),
              backgroundColor: theme('colors.blue.50'),
              padding: '0.75rem 1rem',
              borderRadius: '0 0.5rem 0.5rem 0',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            'blockquote p': {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'blockquote p:first-of-type::before': { content: '""' },
            'blockquote p:last-of-type::after': { content: '""' },
            // 列表样式 - Notion 风格
            ul: {
              paddingLeft: '1.5rem',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              listStyleType: 'disc',
            },
            ol: {
              paddingLeft: '1.5rem',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            'ul > li': {
              paddingLeft: '0.375rem',
              marginTop: '0.375rem',
              marginBottom: '0.375rem',
              position: 'relative',
            },
            'ol > li': {
              paddingLeft: '0.375rem',
              marginTop: '0.375rem',
              marginBottom: '0.375rem',
            },
            'ul ul, ul ol, ol ul, ol ol': {
              marginTop: '0.375rem',
              marginBottom: '0.375rem',
            },
            'ul ul': {
              listStyleType: 'circle',
            },
            'ul ul ul': {
              listStyleType: 'square',
            },
            'li > p': {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'li::marker': {
              color: theme('colors.slate.500'),
              fontWeight: '500',
            },
            // 行内代码样式
            code: {
              backgroundColor: theme('colors.slate.100'),
              color: theme('colors.pink.600'),
              padding: '0.2rem 0.4rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.875em',
              border: `1px solid ${theme('colors.slate.200')}`,
            },
            pre: {
              backgroundColor: theme('colors.slate.900'),
              color: theme('colors.slate.50'),
              borderRadius: '0.75rem',
              padding: '1rem',
              marginTop: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: 'inherit',
              padding: '0',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '0.8rem',
              marginBottom: '0.8rem',
              fontSize: '0.95rem',
            },
            thead: {
              borderBottomColor: theme('colors.slate.200'),
            },
            'tbody tr': {
              borderBottomColor: theme('colors.slate.100'),
            },
            'tbody tr:hover': {
              backgroundColor: theme('colors.slate.50'),
            },
            th: {
              textAlign: 'left',
              fontWeight: '600',
              padding: '0.6rem 0.75rem',
              backgroundColor: theme('colors.slate.50'),
            },
            td: {
              padding: '0.6rem 0.75rem',
              verticalAlign: 'top',
            },
            hr: {
              borderColor: theme('colors.slate.200'),
              marginTop: '1.2rem',
              marginBottom: '1.2rem',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
        invert: {
          css: {
            color: theme('colors.slate.200'),
            a: {
              color: theme('colors.blue.400'),
            },
            'a:hover': {
              color: theme('colors.blue.300'),
            },
            h1: { color: theme('colors.slate.50') },
            h2: { color: theme('colors.slate.100') },
            h3: { color: theme('colors.slate.100') },
            h4: { color: theme('colors.slate.200') },
            strong: { color: theme('colors.slate.100') },
            blockquote: {
              color: theme('colors.slate.300'),
              borderLeftColor: theme('colors.blue.500'),
              backgroundColor: 'rgba(30,58,138,0.2)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            },
            // 暗黑模式行内代码
            code: {
              backgroundColor: theme('colors.slate.800'),
              color: theme('colors.pink.400'),
              borderColor: theme('colors.slate.700'),
            },
            pre: {
              backgroundColor: theme('colors.slate.950'),
              color: theme('colors.slate.100'),
            },
            // 暗黑模式列表
            'li::marker': {
              color: theme('colors.slate.400'),
            },
            th: {
              backgroundColor: 'rgba(15,23,42,0.6)',
              color: theme('colors.slate.200'),
            },
            td: {
              borderBottomColor: theme('colors.slate.700'),
            },
            'tbody tr': {
              borderBottomColor: theme('colors.slate.800'),
            },
            'tbody tr:hover': {
              backgroundColor: 'rgba(30,41,59,0.45)',
            },
            hr: {
              borderColor: theme('colors.slate.700'),
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
