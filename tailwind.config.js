/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./components/**/*.{js,jsx,ts,tsx,vue}",
        "./layouts/**/*.{js,jsx,ts,tsx,vue}",
        "./pages/**/*.{js,jsx,ts,tsx,vue}",
        "./plugins/**/*.{js,ts}",
        "./composables/**/*.{js,ts}",
        "./utils/**/*.{js,ts}",
        "./app.{js,jsx,ts,tsx,vue}",
        "./App.{js,jsx,ts,tsx,vue}",
        "./error.{js,jsx,ts,tsx,vue}",
        "./Error.{js,jsx,ts,tsx,vue}",
        "./app.config.{js,ts}",
        "./app/spa-loading-template.html"
    ],
    theme: {
        extend: {
            fontFamily: {
                montserrat: ['Montserrat Alternates', 'sans-serif'],
                nunito: ['Nunito', 'sans-serif'],
            },
            colors: {
                'gray-light': '#F5F7FA',
                'yellow-tlb': '#FDE047',
                'primary': '#343C6A',
                'default': '#222222',
                'green-tlb': '#2EA279',
                'gray-blue' : '#F8FAFC',
                'blue-link': '#718EBF',
                'input-stroke': '#DDDDDD',
                'placeholder': '#6A6A6A',
                'gray-tlb': '#A2A1A8'
            },
            borderRadius: {
                '10': '10px',
                '40': '40px',
            },
            height: {
                '26': '101px',
            }
        }
    },
    plugins: [],
}

