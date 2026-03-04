import api from "./api";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notificationService";

jest.mock("./api", () => ({
  get: jest.fn(),
  put: jest.fn(),
}));

describe("notificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getMyNotifications calls user notifications endpoint", () => {
    getMyNotifications();
    expect(api.get).toHaveBeenCalledWith("/user/notifications");
  });

  test("getUnreadNotificationCount calls unread count endpoint", () => {
    getUnreadNotificationCount();
    expect(api.get).toHaveBeenCalledWith("/user/notifications/unread-count");
  });

  test("markNotificationAsRead calls read endpoint", () => {
    markNotificationAsRead("n-1");
    expect(api.put).toHaveBeenCalledWith("/user/notifications/n-1/read");
  });

  test("markAllNotificationsAsRead calls read-all endpoint", () => {
    markAllNotificationsAsRead();
    expect(api.put).toHaveBeenCalledWith("/user/notifications/read-all");
  });
});
