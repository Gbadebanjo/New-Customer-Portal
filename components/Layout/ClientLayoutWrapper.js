"use client";
import MainAppLayout from "@/components/Layout/MainAppLayout";
import { usePathname } from "next/navigation";

export default function ClientLayoutWrapper({ children, impersonationBanner }) {
  const pathname = usePathname();

  const noLayoutRoutes = [
    "/login",
    "/register",
    "/verify",
    "/2FAVerification",
    "/forgot-password",
    "/reset-password",
    "/403",
    "/404",
  ];
  const shouldExcludeLayout = pathname === "/" || noLayoutRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (shouldExcludeLayout) {
    return children;
  }
  return <MainAppLayout impersonationBanner={impersonationBanner}>{children}</MainAppLayout>;
}