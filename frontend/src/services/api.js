import axios from "axios";
import { trackEvent } from "./analyticsService";

const api = axios.create({
    baseURL: "http://localhost:8080",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        try {
            const url = error?.config?.url || "";
            if (!String(url).includes("/analytics/events")) {
                const currentPath = window.location.pathname || "/";
                if (!currentPath.startsWith("/admin")) {
                    await trackEvent("API_ERROR", currentPath, {
                        metadata: {
                            apiPath: url,
                            method: error?.config?.method || "GET",
                            status: error?.response?.status || 0,
                        },
                    });
                }
            }
        } catch (trackingError) {
            // intentionally ignore analytics issues
        }
        return Promise.reject(error);
    }
);

export default api;
