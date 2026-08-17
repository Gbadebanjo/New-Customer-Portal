"use client";
import { useState, useSyncExternalStore } from "react";
import classes from "./navbar.module.css";
import Image from "next/image";
import DayStarLogo from "@/public/img/daystar/sidenav-logo-bottom.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardIcon from "@/components/ui/icons/DashboardIcon";
import FleetIcon from "@/components/ui/icons/FleetIcon";
import CustomerIcon from "@/components/ui/icons/CustomerIcon";
import SupportIcon from "@/components/ui/icons/SupportIcon";
import ChartIcon from "@/components/ui/icons/ChartIcon";
import WrenchIcon from "@/components/ui/icons/WrenchIcon";
import ReportIcon from "@/components/ui/icons/ReportIcon";
import AlertBellIcon from "@/components/ui/icons/AlertBellIcon";
import IdentityIcon from "@/components/ui/icons/IdentityIcon";
import TextTemplatesIcon from "@/components/ui/icons/TextTemplatesIcon";
import AuditLogsIcon from "@/components/ui/icons/AuditLogsIcon";
import SettingsIcon from "@/components/ui/icons/SettingsIcon";
import { Bars3BottomLeftIcon } from "@heroicons/react/20/solid";
import { FaChevronDown } from "react-icons/fa6";
import { useUser } from "@/components/Context/userContext";

// Small helpers so the JSX below stays flat and legible.
function itemClass(active) {
  return active ? `${classes.menuItem} ${classes.menuItemActive}` : classes.menuItem;
}
function subItemClass(active) {
  return active ? `${classes.subMenuItem} ${classes.subMenuActive}` : classes.subMenuItem;
}
function subSubItemClass(active) {
  return active ? `${classes.subSubMenuItem} ${classes.subSubMenuActive}` : classes.subSubMenuItem;
}

export default function Navbar({
  collapsed,
  setCollapsed,
  hovered,
  setHovered,
  setMobileOpen,
}) {
  const path = usePathname();
  const { user } = useUser();

  // Role-derived flags depend on `user`, which is populated after
  // hydration from localStorage / /api/auth/me. Server render + first
  // client render must produce IDENTICAL DOM, so we gate every
  // role-conditional item behind `mounted`. useSyncExternalStore is the
  // cleanest primitive for "false on server + first client render, true
  // afterwards" — no state, no effect, no lint noise.
  const mounted = useSyncExternalStore(
      () => () => {},   // no external source to subscribe to
      () => true,       // client snapshot
      () => false,      // server snapshot
  );

  const roleNames = mounted ? (user?.roles?.map((r) => r.name) || []) : [];
  const hasAdminRole = roleNames.includes('Admin') || roleNames.includes('Daystar Portal Admin');
  const hasDaystarCustomerAdmin = roleNames.includes('Daystar Customer Admin');
  const hasCustomerUser = roleNames.includes('Customer User') || roleNames.includes('Customer');
  const isDaystarRole = hasAdminRole || hasDaystarCustomerAdmin;

  // Daystar roles land on /fleet, Customer Users on /dashboard. Distinct
  // routes and icons so the two views can diverge cleanly.
  const showLanding = isDaystarRole || hasCustomerUser;
  const landingHref = isDaystarRole ? '/fleet' : '/dashboard';
  const landingLabel = isDaystarRole ? 'Fleet' : 'Dashboard';
  const LandingIcon = isDaystarRole ? FleetIcon : DashboardIcon;
  const isLandingActive = isDaystarRole
    ? path.startsWith('/fleet')
    : path.startsWith('/dashboard');

  const showCustomers = hasAdminRole || hasDaystarCustomerAdmin;
  const showPlannedDataUpload = hasAdminRole || hasDaystarCustomerAdmin;
  // DCA gets Administration → Identity management → Users only, so they
  // can reach the impersonate action. Everything else under Administration
  // (Roles, Security Logs, Analytics, API keys, Templates, Audit Logs,
  // Settings) stays hidden for DCA.
  const showAdministration = hasAdminRole || hasDaystarCustomerAdmin;
  const showFullAdmin = hasAdminRole;

  const [adminMenuOpen, setAdminMenuOpen] = useState(path.includes("/admin/"));
  const [identityMenuOpen, setIdentityMenuOpen] = useState(path.includes("/admin/identity"));

  const closeMobile = () => setMobileOpen && setMobileOpen(false);
  // Leaf clicks in Administration close only the mobile drawer — leaving
  // the submenu open keeps the active item visible after navigation.
  const closeAdminOnLeafClick = () => closeMobile();

  const chevron = (open) => (
    <span className={`${classes.chevron} ${open ? classes.chevronOpen : ''}`}>
      <FaChevronDown />
    </span>
  );

  return (
    <div
      className={`${classes.sidebarMenu} ${collapsed ? classes.collapsed : ""} ${
        collapsed && hovered ? classes.expandedOnHover : ""
      }`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => collapsed && setHovered(false)}
    >
      <div className={classes.sidebarHeaderContainer}>
        <div className={classes.sidebarHeader}>DAYSTAR POWER</div>
        <button
          type="button"
          className={classes.hamburgerMenu}
          onClick={() => {
            setCollapsed((prev) => !prev);
            if (setMobileOpen) setMobileOpen(false);
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Bars3BottomLeftIcon width={20} />
        </button>
      </div>

      {/* Top-level nav */}
      {showLanding && (
        <Link href={landingHref} onClick={closeMobile} className={itemClass(isLandingActive)}>
          <span className={classes.icon}><LandingIcon /></span>
          <span className={classes.label}>{landingLabel}</span>
        </Link>
      )}

      {showCustomers && (
        <Link href="/customers" onClick={closeMobile} className={itemClass(path.startsWith("/customers"))}>
          <span className={classes.icon}><CustomerIcon /></span>
          <span className={classes.label}>Customers</span>
        </Link>
      )}

      <Link href="/support" onClick={closeMobile} className={itemClass(path.startsWith("/support"))}>
        <span className={classes.icon}><SupportIcon /></span>
        <span className={classes.label}>Support</span>
      </Link>

      {showPlannedDataUpload && (
        <Link href="/planned-data-upload" onClick={closeMobile} className={itemClass(path.startsWith("/planned-data-upload"))}>
          <span className={classes.icon}><ChartIcon /></span>
          <span className={classes.label}>Planned data upload</span>
        </Link>
      )}

      <Link href="/planned-vs-actual" onClick={closeMobile} className={itemClass(path.startsWith("/planned-vs-actual"))}>
        <span className={classes.icon}><ChartIcon /></span>
        <span className={classes.label}>Planned vs Actual</span>
      </Link>

      <Link href="/reports" onClick={closeMobile} className={itemClass(path.startsWith("/reports"))}>
        <span className={classes.icon}><ReportIcon /></span>
        <span className={classes.label}>Reports</span>
      </Link>

      {/* Alerts hidden from pure-Customer users — raw provider alarms can
          panic non-technical viewers. Daystar roles still see it. */}
      {isDaystarRole && (
        <Link href="/alerts" onClick={closeMobile} className={itemClass(path.startsWith("/alerts"))}>
          <span className={classes.icon}><AlertBellIcon /></span>
          <span className={classes.label}>Alerts</span>
        </Link>
      )}

      {/* Administration (collapsible) */}
      {showAdministration && (
        <button
          type="button"
          className={itemClass(adminMenuOpen || path.startsWith("/admin"))}
          onClick={() => setAdminMenuOpen((o) => !o)}
          aria-expanded={adminMenuOpen}
        >
          <span className={classes.icon}><WrenchIcon /></span>
          <span className={classes.label}>Administration</span>
          {chevron(adminMenuOpen)}
        </button>
      )}

      {showAdministration && adminMenuOpen && (
        <ul className={classes.innerMenu}>
          {/* Identity management (nested collapsible) */}
          <li className={classes.innerMenuItem}>
            <button
              type="button"
              className={subItemClass(identityMenuOpen || path.includes("/admin/identity"))}
              onClick={() => setIdentityMenuOpen((o) => !o)}
              aria-expanded={identityMenuOpen}
            >
              <span className={classes.icon}><IdentityIcon /></span>
              <span className={classes.label}>Identity management</span>
              {chevron(identityMenuOpen)}
            </button>
            {identityMenuOpen && (
              <ul className={classes.subSubMenu}>
                {showFullAdmin && (
                  <li>
                    <Link
                      href="/admin/identity/roles"
                      onClick={closeAdminOnLeafClick}
                      className={subSubItemClass(path.startsWith("/admin/identity/roles"))}
                    >
                      Roles
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/admin/identity/users"
                    onClick={closeAdminOnLeafClick}
                    className={subSubItemClass(path.startsWith("/admin/identity/users"))}
                  >
                    Users
                  </Link>
                </li>
                {showFullAdmin && (
                  <li>
                    <Link
                      href="/admin/identity/security-logs"
                      onClick={closeAdminOnLeafClick}
                      className={subSubItemClass(path.startsWith("/admin/identity/security-logs"))}
                    >
                      Security Logs
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </li>

          {showFullAdmin && (
            <>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/analytics"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/analytics"))}
                >
                  <span className={classes.icon}><ChartIcon /></span>
                  <span className={classes.label}>Analytics</span>
                </Link>
              </li>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/api-keys"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/api-keys"))}
                >
                  <span className={classes.icon}><IdentityIcon /></span>
                  <span className={classes.label}>API keys</span>
                </Link>
              </li>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/text-templates"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/text-templates"))}
                >
                  <span className={classes.icon}><TextTemplatesIcon /></span>
                  <span className={classes.label}>Text Templates</span>
                </Link>
              </li>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/audit-logs"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/audit-logs"))}
                >
                  <span className={classes.icon}><AuditLogsIcon /></span>
                  <span className={classes.label}>Audit Logs</span>
                </Link>
              </li>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/cron-health"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/cron-health"))}
                >
                  <span className={classes.icon}><ChartIcon /></span>
                  <span className={classes.label}>Cron Health</span>
                </Link>
              </li>
              <li className={classes.innerMenuItem}>
                <Link
                  href="/admin/settings"
                  onClick={closeAdminOnLeafClick}
                  className={subItemClass(path.startsWith("/admin/settings"))}
                >
                  <span className={classes.icon}><SettingsIcon /></span>
                  <span className={classes.label}>Settings</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      )}

      <div className={classes.dayStarLogoForMenu}>
        <Image src={DayStarLogo} alt="Daystar Logo" priority />
      </div>
    </div>
  );
}
