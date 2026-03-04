import { useQuery } from "@tanstack/react-query";
import { getAllAuditLogs } from "../services/admin/adminAuditService";

export default function useAdminAuditLogs(options = {}) {
  return useQuery(["admin", "auditLogs"], getAllAuditLogs, options);
}
