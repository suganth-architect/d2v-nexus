import type { ReactNode } from "react";

interface ClientPortalLayoutProps {
    children: ReactNode;
    projectTitle?: string;
}

export function ClientPortalLayout({ children, projectTitle }: ClientPortalLayoutProps) {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-500/30">
            {/* Navbar */}
            <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                        C
                    </div>
                    <span className="font-bold text-lg tracking-tight">
                        {projectTitle ? (
                            <>
                                {projectTitle} <span className="text-zinc-500 font-normal mx-2">|</span> <span className="text-green-500 text-sm uppercase tracking-wider border border-green-500/20 px-2 py-0.5 rounded-full">Client View</span>
                            </>
                        ) : (
                            "Client Portal"
                        )}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-4 md:px-8 pb-12 max-w-5xl mx-auto">
                {children}
            </main>
        </div>
    );
}
