import {
  Calendar,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Mail,
  PlusCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short: string; // shorter label for the mobile bottom bar
  icon: LucideIcon;
}

export const MEMBER_NAV: NavItem[] = [
  { href: "/member/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/member/events", label: "Events", short: "Events", icon: Calendar },
  { href: "/member/report-hours", label: "Report Hours", short: "Report", icon: Clock },
  {
    href: "/member/request-event",
    label: "Request Event",
    short: "Request",
    icon: PlusCircle,
  },
];

export const OFFICER_NAV: NavItem[] = [
  { href: "/officer/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/officer/events", label: "Events", short: "Events", icon: Calendar },
  { href: "/officer/requests", label: "Requests", short: "Requests", icon: ClipboardList },
  { href: "/officer/members", label: "Members", short: "Members", icon: Users },
  { href: "/officer/invites", label: "Invites", short: "Invites", icon: Mail },
];
