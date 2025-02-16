import { Roboto } from "next/font/google";
import { FC, ReactNode } from "react";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";

const roboto = Roboto({
  style: "normal",
  weight: ["100", "300", "400", "500", "700", "900"],
});

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning={true}
        className={`${roboto.className} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
