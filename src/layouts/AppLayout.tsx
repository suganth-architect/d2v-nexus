import { Outlet } from "react-router-dom";
import { useTitanAuth } from "../hooks/useTitanAuth";
import { NanoDock } from "../components/NanoDock";

interface AppLayoutProps {
    children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { profile } = useTitanAuth();
    const isClient = profile?.role === 'client';

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-500/30 relative">
            {/* Main Content Area - Full Width/Height */}
            <main className="min-h-screen w-full relative z-10 pb-32">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {children || <Outlet />}
                </div>
            </main>

            {/* Floating Dock Navigation - INTERNAL ONLY */}
            {!isClient && <NanoDock />}

            {/* Global Background Elements (optional subtle gradients) */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
            </div>
        </div>
    );
}
