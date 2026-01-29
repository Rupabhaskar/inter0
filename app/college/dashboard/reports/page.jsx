"use client";

import PermissionRoute from "@/components/PermissionRoute";

function ReportsContent() {
  return <h1>Download & Export Reports</h1>;
}

export default function Reports() {
  return (
    <PermissionRoute requiredPermission="reports">
      <ReportsContent />
    </PermissionRoute>
  );
}
