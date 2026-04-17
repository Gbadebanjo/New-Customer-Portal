"use client";
import { useState } from "react";
import classes from "./navbar.module.css";
import Image from "next/image";
import DayStarLogo from "@/public/img/daystar/sidenav-logo-bottom.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardIcon from "@/components/ui/icons/DashboardIcon";
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
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { useUser } from "@/components/Context/userContext";

export default function Navbar({
  collapsed,
  setCollapsed,
  hovered,
  setHovered,
  setMobileOpen,
}) {
  const path = usePathname();
  const { user } = useUser();

  const roleNames = user?.roles?.map((r) => r.name) || [];
  const hasAdminRole = roleNames.includes('Admin') || roleNames.includes('Daystar Portal Admin');
  const hasDaystarCustomerAdmin = roleNames.includes('Daystar Customer Admin');
  const hasCustomerUser = roleNames.includes('Customer');

  // Multi-role: show item if ANY of the user's roles grants access to it.
  // Admin/Daystar Portal Admin  → sees everything
  // Daystar Customer Admin      → sees everything except Dashboard and Administration
  // Customer User               → sees everything except Customers, Planned data upload, and Administration
  const showDashboard = hasAdminRole || hasCustomerUser;
  const showCustomers = hasAdminRole || hasDaystarCustomerAdmin;
  const showPlannedDataUpload = hasAdminRole || hasDaystarCustomerAdmin;
  const showAdministration = hasAdminRole;
  const [adminMenuOpen, setAdminMenuOpen] = useState(path.includes("/admin/"));
  const [identityMenuOpen, setIdentityMenuOpen] = useState(
    path.includes("/admin/identity")
  );
  // const [hovered, setHovered] = useState(false);

  const showText = !collapsed || hovered;

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <div
      className={`${classes.sidebarMenu} ${
        collapsed ? classes.collapsed : ""
      } ${collapsed && hovered ? classes.expandedOnHover : ""}`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => collapsed && setHovered(false)}
    >
      <div className={classes.sidebarHeaderContainer}>
        {showText && <div className={classes.sidebarHeader}>DAYSTAR POWER</div>}
        <div
          className={classes.hamburgerMenu}
          onClick={() => {
            setCollapsed((prev) => !prev);
            if (setMobileOpen) setMobileOpen(false);
          }}
        >
          <Bars3BottomLeftIcon className={classes.hamburgerIcon} />
        </div>
      </div>
      {/* Sidebar Menu Items */}
      {showDashboard && (
        <Link href="/dashboard" onClick={closeMobile}>
          <div
            className={
              path.startsWith("/dashboard")
                ? `${classes.menuItemOrange} ${classes.menuItem}`
                : classes.menuItem
            }
          >
            <span>
              <DashboardIcon />
            </span>
            {showText && <span>Dashboard</span>}
          </div>
        </Link>
      )}
      {showCustomers && (
        <Link href="/customers" onClick={closeMobile}>
          <div
            className={
              path.startsWith("/customers")
                ? `${classes.menuItemOrange} ${classes.menuItem}`
                : classes.menuItem
            }
          >
            <span>
              <CustomerIcon />
            </span>
            <span>Customers</span>
          </div>
        </Link>
      )}
      <Link href="/support" onClick={closeMobile}>
        <div
          className={
            path.startsWith("/support")
              ? `${classes.menuItemOrange} ${classes.menuItem}`
              : classes.menuItem
          }
        >
          <span>
            <SupportIcon />
          </span>
          <span>Support</span>
        </div>
      </Link>
      {showPlannedDataUpload && (
        <Link href="/planned-data-upload" onClick={closeMobile}>
          <div
            className={
              path.startsWith("/planned-data-upload")
                ? `${classes.menuItemOrange} ${classes.menuItem}`
                : classes.menuItem
            }
          >
            <span>
              <ChartIcon />
            </span>
            <span>Planned data upload</span>
          </div>
        </Link>
      )}
      <Link href="/planned-vs-actual" onClick={closeMobile}>
        <div
          className={
            path.startsWith("/planned-vs-actual")
              ? `${classes.menuItemOrange} ${classes.menuItem}`
              : classes.menuItem
          }
        >
          <span>
            <ChartIcon />
          </span>
          <span>Planned vs Actual</span>
        </div>
      </Link>
      <Link href="/reports" onClick={closeMobile}>
        <div
          className={
            path.startsWith("/reports")
              ? `${classes.menuItemOrange} ${classes.menuItem}`
              : classes.menuItem
          }
        >
          <span>
            <ReportIcon />
          </span>
          <span>Reports</span>
        </div>
      </Link>
      <Link href="/alerts" onClick={closeMobile}>
        <div
          className={
            path.startsWith("/alerts")
              ? `${classes.menuItemOrange} ${classes.menuItem}`
              : classes.menuItem
          }
        >
          <span>
            <AlertBellIcon />
          </span>
          {showText && <span>Alerts</span>}
        </div>
      </Link>
      {/* Administration */}
      {showAdministration && (
        <Link href="#">
          <div onClick={() => setAdminMenuOpen(!adminMenuOpen)}>
            <div className={adminMenuOpen ? classes.menuItemOrange : classes.menuItem}>
              <span>
                <WrenchIcon />
              </span>
              <span>Administration</span>
              <span style={{ marginLeft: 'auto', paddingRight: '16px' }}>
                {adminMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </div>
          </div>
        </Link>
      )}
      {showAdministration && adminMenuOpen && (
        <ul className={classes.innerMenu}>
          <li className={classes.innerMenuItem}>
            <Link href="#">
              <div
                onClick={() => setIdentityMenuOpen(!identityMenuOpen)}
                className={
                  path.includes("/admin/identity")
                    ? classes.subMenuOrange
                    : classes.subMenuItem
                }
              >
                <span>
                  <IdentityIcon />
                </span>
                <span>Identity management</span>
                <span style={{ marginLeft: 'auto', paddingRight: '16px' }}>
                  {identityMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </div>
            </Link>
            {identityMenuOpen && (
              <ul className={classes.innerMenu}>
                <li className={classes.innerMenuItem}>
                  <Link href="/admin/identity/roles" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
                    <div
                      className={
                        path.startsWith("/admin/identity/roles")
                          ? classes.subSubMenuItemOrange
                          : classes.subSubMenuItem
                      }
                    >
                      Roles
                    </div>
                  </Link>
                </li>
                <li className={classes.innerMenuItem}>
                  <Link href="/admin/identity/users" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
                    <div
                      className={
                        path.startsWith("/admin/identity/users")
                          ? classes.subSubMenuItemOrange
                          : classes.subSubMenuItem
                      }
                    >
                      Users
                    </div>
                  </Link>
                </li>
                <li
                  className={classes.innerMenuItem}
                  style={{
                    marginBottom: 10,
                  }}
                >
                  <Link href="/admin/identity/security-logs" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
                    <div
                      className={
                        path.startsWith("/admin/identity/security-logs")
                          ? classes.subSubMenuItemOrange
                          : classes.subSubMenuItem
                      }
                    >
                      Security Logs
                    </div>
                  </Link>
                </li>
                {/* grand child menu items ends here */}
              </ul>
            )}
          </li>
          {/* Other menu items */}
          <li className={classes.innerMenuItem}>
            <Link href="/admin/text-templates" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
              <div
                className={
                  path.startsWith("/admin/text-templates")
                    ? classes.subMenuOrange
                    : classes.subMenuItem
                }
              >
                <span>
                  <TextTemplatesIcon />
                </span>
                <span>Text Templates</span>
              </div>
            </Link>
          </li>
          <li className={classes.innerMenuItem}>
            <Link href="/admin/audit-logs" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
              <div
                className={
                  path.startsWith("/admin/audit-logs")
                    ? classes.subMenuOrange
                    : classes.subMenuItem
                }
              >
                <span>
                  <AuditLogsIcon />
                </span>
                <span>Audit Logs</span>
              </div>
            </Link>
          </li>
          <li className={classes.innerMenuItem}>
            <Link href="/admin/settings" onClick={() => { setAdminMenuOpen(false); closeMobile(); }}>
              <div
                className={
                  path.startsWith("/admin/settings")
                    ? classes.subMenuOrange
                    : classes.subMenuItem
                }
              >
                <span>
                  <SettingsIcon />
                </span>
                <span>Settings</span>
              </div>
            </Link>
          </li>
        </ul>
      )}
      <div className={classes.dayStarLogoForMenu}>
        <Image src={DayStarLogo} alt="Daystar Logo" priority />
      </div>
    </div>
  );
}
