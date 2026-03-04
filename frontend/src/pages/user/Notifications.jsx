import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";
import "../../styles/Notifications.css";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getMyNotifications();
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
          prev.map((item) =>
              item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item
          )
      );
    } catch (error) {
      console.error("Failed to mark notification", error);
    }
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
          prev.map((item) => ({ ...item, read: true, readAt: item.readAt || new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications", error);
    }
  };

  const onCompleteKyc = (notificationId) => {
    if (notificationId) {
      onMarkRead(notificationId);
    }
    navigate("/profile/update-kyc");
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN");
  };

  const formatNotificationType = (type) =>
    String(type || "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const filtered = useMemo(() => {
    if (!typeFilter) return notifications;
    return notifications.filter((item) => item.type === typeFilter);
  }, [notifications, typeFilter]);

  const types = useMemo(
      () => Array.from(new Set(notifications.map((item) => item.type).filter(Boolean))).sort(),
      [notifications]
  );

  return (
      <>
        <Navbar noSpacer />
        <div className="noti-page">
          <div className="noti-head">
            <h1>Notifications</h1>
            <div className="noti-actions">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                {types.map((type) => (
                    <option key={type} value={type}>{formatNotificationType(type)}</option>
                ))}
              </select>
              <button onClick={onMarkAllRead}>Mark all as read</button>
            </div>
          </div>

          {loading ? (
              <div className="noti-card">Loading notifications...</div>
          ) : filtered.length === 0 ? (
              <div className="noti-card">No notifications available.</div>
          ) : (
              <div className="noti-list">
                {filtered.map((item) => (
                    <div key={item.id} className={`noti-card ${item.read ? "read" : "unread"}`}>
                      <div className="noti-row">
                        <h3>{item.title || "Notification"}</h3>
                        <div className="noti-inline-actions">
                          {item.type === "KYC_REQUIRED" && (
                            <button
                              className="kyc-btn"
                              onClick={() => onCompleteKyc(item.id)}
                            >
                              Complete KYC
                            </button>
                          )}
                          {!item.read && (
                              <button className="read-btn" onClick={() => onMarkRead(item.id)}>
                                Mark read
                              </button>
                          )}
                        </div>
                      </div>
                      <p>{item.message || "-"}</p>
                      <div className="noti-meta">
                        <span>{formatNotificationType(item.type) || "-"}</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>
      </>
  );
}

export default Notifications;
