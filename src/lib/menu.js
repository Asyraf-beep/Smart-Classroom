export function getMenuByRole(role) {
    if (role === "STUDENT") {
      return [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Notifications", to: "/notifications" },
        { label: "Enroll", to: "/enroll" },
        { label: "Today's Schedule", to: "/todaySchedule" },
      ];
    }

    if (role === "LECTURER") {
      return [
        { label: "Dashboard", to: "/dashboard" },
        { label: "Generate QR", to: "/generateQR" },
        { label: "Mark Attendance", to: "/markAttendanceLate" },
      ];
    }

    if (role === "ADMIN") {
       return [
          { label: "Dashboard", to: "/dashboard" },
          { label: "Manage Users", to: "/manageUser" },
          { label: "Class & Timetable", to: "/manageClassTimetable" },
          { label: "Reports", to: "/adminReport" },
          { label: "System Settings", to: "/manageSystemSettings" },
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
