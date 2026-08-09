import Link from "next/link";
import HomeIcon from "@/components/ui/icons/HomeIcon";
import BackButton from "@/components/ui/BackButton/BackButton";
import classes from "./pageHeader.module.css";

/**
 * Standard page header used across screens.
 *
 * Props:
 *   crumbs         string[]   Breadcrumb segments after "Home". e.g. ["Admin","Settings"]
 *   showBackButton boolean    Show the "Back" button on the right. Defaults to true.
 *   homeHref       string     Where the home icon links. Defaults to "/dashboard".
 */
export default function PageHeader({
  crumbs = [],
  showBackButton = true,
  homeHref = "/dashboard",
}) {
  return (
    <div className={classes.header}>
      <Link href={homeHref} className={classes.homeLink} aria-label="Home">
        <HomeIcon />
      </Link>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${crumb}-${i}`} style={{ display: "inline-flex", alignItems: "center" }}>
            <span className={classes.separator}>|</span>
            <span className={isLast ? classes.crumbLast : classes.crumb}>{crumb}</span>
          </span>
        );
      })}
      {showBackButton && (
        <span className={classes.backSlot}>
          <BackButton />
        </span>
      )}
    </div>
  );
}
