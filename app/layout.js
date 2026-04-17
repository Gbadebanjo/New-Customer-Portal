import { Kanit } from "next/font/google";
import "./globals.css";
import ClientLayoutWrapper from "@/components/Layout/ClientLayoutWrapper";
import { UserProvider } from "@/components/Context/userContext";
import ImpersonationBanner from "@/components/Layout/ImpersonationBanner";

const kanit = Kanit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="night">
      <body className={kanit.className}>
        <UserProvider>
          <ClientLayoutWrapper impersonationBanner={<ImpersonationBanner />}>
            {children}
          </ClientLayoutWrapper>
        </UserProvider>
      </body>
    </html>
  );
}
//     <html lang="en" data-theme="night">
//       <body className={inter.className}>{children}</body>
//     </html>
//   );
// }
