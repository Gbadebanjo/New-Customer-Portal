import { useState } from "react";
import NavbarComponent from "@/components/ui/Navbar/NavbarContainer";
import RightSideComponent from "@/components/ui/rightside/RightSideComponent";
import classes from './sharedLayout.module.css';
import { Bars3BottomLeftIcon } from "@heroicons/react/20/solid";

export default function MainAppLayout({ children, impersonationBanner }) {
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  let containerClass = classes.container;
  if (collapsed && hovered) {
    containerClass += ` ${classes.expandedOnHover}`;
  } else if (collapsed) {
    containerClass += ` ${classes.collapsed}`;
  } else {
    containerClass += ` ${classes.uncollapsed}`;
  }
  if (mobileOpen) {
    containerClass += ` ${classes.mobileOpen}`;
  }

  return (
    <div className={containerClass}>
      {/* Mobile: dim overlay — tap to close sidebar */}
      {mobileOpen && (
        <div className={classes.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile: floating hamburger to open sidebar */}
      <div
        className={classes.mobileMenuTrigger}
        onClick={() => { setMobileOpen(true); setCollapsed(false); }}
      >
        <Bars3BottomLeftIcon width={22} />
      </div>

      <div className={classes.navbarComponent}>
        <NavbarComponent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          hovered={hovered}
          setHovered={setHovered}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </div>

      <div className={classes.content}>
        {children}
      </div>

      <div className={classes.rightSideComponent}>
        <RightSideComponent impersonationBanner={impersonationBanner} />
      </div>
    </div>
  );
}