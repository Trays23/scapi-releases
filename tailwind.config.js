/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: 'hsl(215, 100%, 97%)',
                    100: 'hsl(215, 95%, 93%)',
                    200: 'hsl(215, 90%, 84%)',
                    300: 'hsl(215, 85%, 72%)',
                    400: 'hsl(215, 80%, 60%)',
                    500: 'hsl(215, 75%, 50%)',
                    600: 'hsl(215, 80%, 40%)',
                    700: 'hsl(215, 85%, 32%)',
                    800: 'hsl(215, 90%, 22%)',
                    900: 'hsl(215, 95%, 14%)',
                },
                surface: {
                    50: 'hsl(220, 20%, 97%)',
                    100: 'hsl(220, 20%, 93%)',
                    800: 'hsl(222, 20%, 13%)',
                    850: 'hsl(222, 22%, 10%)',
                    900: 'hsl(222, 25%, 8%)',
                    950: 'hsl(222, 28%, 5%)',
                },
                accent: {
                    400: 'hsl(160, 84%, 50%)',
                    500: 'hsl(160, 84%, 40%)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};
