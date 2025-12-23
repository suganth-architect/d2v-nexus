import type { ReactNode } from "react";
// import { cn } from "../../lib/cn";
import { BananaButton } from "../ui/BananaButton";
import { auth } from "../../lib/firebase";

interface AppLayoutProps {
    children: ReactNode;
    userEmail?: string | null;
    role?: string | null;
}

export function AppLayout({ children, userEmail, role }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100 font-sans selection:bg-yellow-500/30">
            {/* Navbar */}
            <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-zinc-950">
                        T
                    </div>
                    <span className="font-bold text-lg tracking-tight">D2V <span className="text-yellow-400">TITAN</span></span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-400">
                    {userEmail && (
                        <div className="hidden md:block">
                            {role && <span className="uppercase text-xs font-bold text-yellow-500 mr-2 border border-yellow-500/20 px-2 py-0.5 rounded-full">{role}</span>}
                            {userEmail}
                        </div>
                    )}
                    <BananaButton variant="ghost" onClick={() => auth.signOut()} className="text-xs">
                        Sign Out
                    </BananaButton>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-4 md:px-8 pb-12 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
