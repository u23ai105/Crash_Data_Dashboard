import axios from 'axios';

// On Vercel multi-service, the backend is at /_/backend
// In local dev, it is at http://localhost:8000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
                (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
                 ? '/_/backend' 
                 : 'http://localhost:8000');

const api = axios.create({
  baseURL: API_URL,
});

export default api;
export { API_URL };
