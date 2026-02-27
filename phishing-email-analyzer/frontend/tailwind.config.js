/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#0066cc',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
      },
      backgroundColor: {
        'blue-50': '#f5f7fa',
        'blue-100': 'rgba(0, 102, 204, 0.1)',
        'red-100': 'rgba(220, 53, 69, 0.1)',
        'green-100': 'rgba(40, 167, 69, 0.1)',
      },
      spacing: {
        0.5: '0.125rem',
      },
    },
  },
  plugins: [],
};
