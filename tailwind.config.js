/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                titan: {
                    bg: '#09090b', // zinc-950
                    card: 'rgba(24, 24, 27, 0.5)', // zinc-900/50
                    yellow: '#FACC15', // Banana Yellow
                    text: {
                        primary: '#F4F4F5', // zinc-100
                        secondary: '#A1A1AA', // zinc-400
                    }
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Assuming Inter is installed or added via CDN
            },
            backdropBlur: {
                'xl': '24px',
            }
        },
    },
    plugins: [],
}
