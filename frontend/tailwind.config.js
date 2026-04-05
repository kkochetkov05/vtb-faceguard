/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vtb: {
          // Основная палитра ВТБ
          primary: "#0066FF",    // Ярко-синий ВТБ (кнопки, ссылки)
          dark: "#002882",       // Тёмно-синий (шапка, акценты)
          navy: "#001A4D",       // Самый тёмный (текст заголовков)
          light: "#EBF2FF",      // Светло-голубой фон (secondary button, hover)
          bg: "#F6F7F9",         // Фон страницы
          card: "#FFFFFF",       // Фон карточек
          border: "#E8ECF0",     // Бордеры
          // Текст
          text: "#1C1C1E",       // Основной текст
          secondary: "#8B8E99",  // Вторичный текст
          // Статусы
          success: "#0DC268",    // Зелёный
          warning: "#FF9500",    // Жёлтый/оранжевый
          danger: "#FF3B30",     // Красный
          info: "#0066FF",       // Инфо = primary
        },
      },
      fontFamily: {
        sans: ['"VTB Group UI"', '"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "vtb": "16px",
        "vtb-sm": "12px",
        "vtb-xs": "8px",
      },
      boxShadow: {
        "vtb": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        "vtb-md": "0 4px 12px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
