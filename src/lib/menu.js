export function getMenuByRole(role) {
  if (role === "STUDENT") {
    return [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Notifications", to: "/notifications" },
    ];
  }

  if (role === "LECTURER") {
    return [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Generate QR", to: "/generateQR" },
    ];
  }

  if (role === "ADMIN" || role === "COORDINATOR") {
    return [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Management Panel", to: "/manage" },
    ];
  }

  return [{ label: "Dashboard", to: "/dashboard" }];
}
