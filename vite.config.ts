import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Относительные пути: на GitHub Pages сайт живёт в подкаталоге с именем репо,
  // а локально — в корне. Маршрутизации нет, так что `./` годится и там, и там.
  base: './',
  plugins: [react()],
})
