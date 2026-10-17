import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Portal runs on 5174 (marketing site uses 5173). The API's CORS allowlist
// includes this origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
})
