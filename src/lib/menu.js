export function getMenuByRole(role) {
    if (role === "STUDENT") {
      return [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Notifications", to: "/notifications" },
        { label: "Enroll", to: "/enroll" },
      ];
    }

    if (role === "LECTURER") {
      return [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Generate QR", to: "/generateQR" },
      ];
    }

    if (role === "ADMIN") {
       return [
          { label: "Dashboard", to: "/dashboard" },
          { label: "Manage Users", to: "/manageUser" },
          { label: "Class & Timetable", to: "/manageClassTimetable" },
          { label: "Reports", to: "/adminReport" },
       ];
      }

    if (role === "COORDINATOR") {
       return [
          { label: "Dashboard", to: "/dashboard" },
          { label: "Manage Subjects", to: "/manageSubjects" },
          { label: "Reports", to: "/coordReport" },
       ];
      }

  return [{ label: "Dashboard", to: "/dashboard" }];
}
