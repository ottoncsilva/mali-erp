import type { Config } from 'tailwindcss';

/*
 * Tailwind v4 usa configuração CSS-first (@theme em app/globals.css).
 * Este arquivo mantém apenas os caminhos de conteúdo para ferramentas/IDE.
 * As cores e o tema são definidos em app/globals.css.
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};

export default config;
