import axios, { AxiosInstance } from 'axios';
import { env } from './env';

/**
 * Axios instance pre-configured for the Python AI microservice.
 * Node.js → FastAPI communication gateway.
 */
const aiServiceClient: AxiosInstance = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 30000, // 30s for LLM calls
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': env.AI_SERVICE_API_KEY,
  },
});

aiServiceClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message;
    console.error(`[AI Service Error] ${status}: ${message}`);
    return Promise.reject(error);
  }
);

export default aiServiceClient;
