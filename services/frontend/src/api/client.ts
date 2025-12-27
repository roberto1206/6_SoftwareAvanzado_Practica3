import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      const status = error.response.status;
      const message = error.response.data?.message || 'Error desconocido';
      
      // Mapeo de códigos HTTP a mensajes específicos
      switch (status) {
        case 400:
          console.error('[API Error 400] Validación fallida:', message);
          break;
        case 404:
          console.error('[API Error 404] Recurso no encontrado:', message);
          break;
        case 409:
          console.error('[API Error 409] Conflicto - operación inválida:', message);
          break;
        case 503:
        case 504:
          console.error('[API Error 503/504] Servicio no disponible:', message);
          break;
        case 500:
          console.error('[API Error 500] Error interno del servidor:', message);
          break;
        default:
          console.error(`[API Error ${status}]:`, message);
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('[Network Error] Gateway no disponible:', error.message);
      error.response = {
        data: {
          message: 'No se pudo conectar con el servidor. Verifica que el Gateway esté disponible.'
        }
      };
    } else {
      console.error('[Error] Error inesperado:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;