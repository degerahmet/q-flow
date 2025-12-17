import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app/layout/sidebar";
import { Separator } from "@/components/ui/separator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Q-Flow | Security Automation",
  description: "AI-Powered Security Questionnaire Automation Agent",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SidebarProvider>
          <AppSidebar />
            <main className="flex flex-1 flex-col min-h-screen w-full transition-all duration-300 ease-in-out">
              <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-500">Q-Flow Public Demo</span>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 lg:p-8 bg-slate-50/50">
              {children}
              </div>
            </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
