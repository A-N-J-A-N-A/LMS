import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../Components/admin/AdminLayout";
import "../../styles/admin/settings.css";

const SETTINGS_KEY = "adminSettings";

const defaultSettings = {
  displayName: "Administrator",
  contactEmail: "",
};

function AdminSettings() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState(defaultSettings);

  // ✅ TanStack Query for loading settings
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
      return defaultSettings;
    },
    enabled: role === "ADMIN",
  });

  // ✅ Update local state when data loads
  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  // ✅ Save Mutation
  const saveMutation = useMutation({
    mutationFn: (newSettings) => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-settings"]);
      alert("Settings saved");
    },
  });

  // ✅ Reset Mutation
  const resetMutation = useMutation({
    mutationFn: () => {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(defaultSettings)
      );
      return defaultSettings;
    },
    onSuccess: (data) => {
      setSettings(data);
      queryClient.invalidateQueries(["admin-settings"]);
      alert("Settings reset to default");
    },
  });

  // ✅ Role check (same as before)
  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
    }
  }, [role, navigate]);

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const handleLogoutAll = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  return (
    <AdminLayout>
      <div className="admin-settings-page">
        <h1>Admin Settings</h1>
        <p>Manage profile, notifications, and session preferences.</p>

        <div className="settings-card">
          <h3>Profile</h3>

          <label>Display Name</label>
          <input
            type="text"
            value={settings.displayName}
            onChange={(e) =>
              setSettings({
                ...settings,
                displayName: e.target.value,
              })
            }
          />

          <label>Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={(e) =>
              setSettings({
                ...settings,
                contactEmail: e.target.value,
              })
            }
          />
        </div>

        <div className="settings-actions">
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            Save Settings
          </button>

          <button
            className="btn-reset"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            Reset
          </button>

          <button
            className="btn-logout"
            onClick={handleLogoutAll}
          >
            Logout Now
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;


{/*}import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/admin/AdminLayout";
import "../../styles/admin/settings.css";

const SETTINGS_KEY = "adminSettings";

const defaultSettings = {
  displayName: "Administrator",
  contactEmail: "",
};

function AdminSettings() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }

    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, [role, navigate]);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    alert("Settings saved");
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    alert("Settings reset to default");
  };

  const handleLogoutAll = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  return (
    <AdminLayout>
      <div className="admin-settings-page">
        <h1>Admin Settings</h1>
        <p>Manage profile, notifications, and session preferences.</p>

        <div className="settings-card">
          <h3>Profile</h3>
          <label>Display Name</label>
          <input
            type="text"
            value={settings.displayName}
            onChange={(e) =>
              setSettings({ ...settings, displayName: e.target.value })
            }
          />

          <label>Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={(e) =>
              setSettings({ ...settings, contactEmail: e.target.value })
            }
          />
        </div>

        <div className="settings-actions">
          <button className="btn-save" onClick={handleSave}>
            Save Settings
          </button>
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="btn-logout" onClick={handleLogoutAll}>
            Logout Now
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;*/}
