import api from "./api";

export const getMyNotifications = () => api.get("/user/notifications");
export const getUnreadNotificationCount = () => api.get("/user/notifications/unread-count");
export const markNotificationAsRead = (id) => api.put(`/user/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.put("/user/notifications/read-all");
