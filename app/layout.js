import { Kanit } from "next/font/google";
import "./globals.css";
import ClientLayoutWrapper from "@/components/Layout/ClientLayoutWrapper";
import { UserProvider } from "@/components/Context/userContext";
import ImpersonationBanner from "@/components/Layout/ImpersonationBanner";
import { verifyAuth } from "@/lib/auth/auth";
import getUserById from "@/lib/controllers/users/getUserById";

const kanit = Kanit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

// Server-side resolve the current user once so the client-side
// UserProvider can seed synchronously — no /api/auth/me poll, no 401
// noise on unauth routes, and no localStorage-vs-live-state drift on
// impersonation switches. Falls back to null on any failure; every
// server page also gates with verifyAuth() so unauthenticated visitors
// are already redirected before this runs on protected routes.
async function getInitialUser() {
  try {
    const { user: sessionUser } = await verifyAuth();
    if (!sessionUser?.id) return null;
    const { user } = await getUserById(sessionUser.id);
    if (!user) return null;
    const { id, username, email, name, surname, roles, customer, timezone, totp_enabled } = user;
    return { id, username, email, name, surname, roles, customer, timezone, totp_enabled };
  } catch {
    return null;
  }
}

export const metadata = {
  title: "Daystar - Customer Portal",
  description: "Daystar Power Solutions Customer facing Portal",
  icons: {
    icon: [
      { url: "/img/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/img/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/img/favicon/favicon.ico" },
    ],
    apple: "/img/favicon/apple-touch-icon.png",
    other: [
      { rel: "mask-icon", url: "/img/favicon/safari-pinned-tab.svg" },
    ],
  },
};

export default async function RootLayout({ children }) {
  const initialUser = await getInitialUser();
  return (
    <html lang="en">
      <body className={kanit.className}>
        <UserProvider initialUser={initialUser}>
          <ClientLayoutWrapper impersonationBanner={<ImpersonationBanner />}>
            {children}
          </ClientLayoutWrapper>
        </UserProvider>
      </body>
    </html>
  );
}
