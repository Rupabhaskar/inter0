import {
  LayoutDashboard,
  Users,
  Trophy,
  BookOpen,
  BarChart3,
  FileText,
  Settings,
  Brain
} from "lucide-react";

export const dashboardNav = [
  { 
    label: "Dashboard", 
    href: "/college/dashboard", 
    icon: LayoutDashboard,
    permission: "dashboard" // Requires dashboard permission
  },
  { 
    label: "Leaderboard", 
    href: "/college/dashboard/leaderboard", 
    icon: Trophy,
    permission: "leaderboard" // Requires leaderboard permission
  },
  { 
    label: "Tests", 
    href: "/college/dashboard/tests", 
    icon: FileText,
    permission: "tests" // Requires tests permission
  },
  { 
    label: "Reports", 
    href: "/college/dashboard/reports", 
    icon: FileText,
    permission: "reports" // Requires reports permission
  },
  { 
    label: "Insights", 
    href: "/college/dashboard/insights", 
    icon: Brain,
    permission: "insights" // Requires insights permission
  },
  { 
    label: "Manage ", 
    href: "/college/dashboard/manage", 
    icon: Settings,
    permission: "manage-students" // Requires manage-students permission (or any manage-*)
  },
];
