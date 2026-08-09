"use client";
import MainAppLayout from "@/components/Layout/MainAppLayout";
import { usePathname } from "next/navigation";

const NO_LAYOUT_ROUTES = [
  "/login",
  "/register",
  "/verify",
  "/2FAVerification",
  "/forgot-password",
  "/reset-password",
  "/403",
  "/404",
];

export default function ClientLayoutWrapper({ children, impersonationBanner }) {
  const pathname = usePathname();
  const shouldExcludeLayout = pathname === "/" || NO_LAYOUT_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Keep a stable outer element across navigations. When the mode flips
  // (login → app), React reconciles inside this fragment instead of the
  // Router seeing its subtree shape-shift mid-transition — that shift was
  // tripping Next 16's app-router `useMemo` (app-router.tsx:168) with the
  // "Rendered more hooks than during the previous render" error.
  //
  // The `key` forces a full unmount/remount when the mode changes, so
  // MainAppLayout's hooks are never reconciled against the plain-children
  // branch (or vice versa).
  return (
    <div key={shouldExcludeLayout ? "no-layout" : "with-layout"} style={{ display: "contents" }}>
      {shouldExcludeLayout ? (
        children
      ) : (
        <MainAppLayout impersonationBanner={impersonationBanner}>{children}</MainAppLayout>
      )}
    </div>
  );
}