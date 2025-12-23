import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { AppLayout } from "../../layouts/AppLayout";
import { BananaCard } from "../../components/ui/BananaCard";
import { StocksTab } from "../ProjectTabs/StocksTab";
import { Package, Truck, MapPin, MousePointerClick, LogOut } from "lucide-react";

export default function ProcurementPortal() {
    const [loading, setLoading] = useState(true);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [availableProjects, setAvailableProjects] = useState<any[]>([]);

    // 1. Resolve Project ID or Fetch List
    useEffect(() => {
        const pid = localStorage.getItem('titan_procurement_project_id');
        if (pid) {
            setActiveProjectId(pid);
            setLoading(false);
        } else {
            // Need to select project
            const fetchProjects = async () => {
                try {
                    const qProjects = query(collection(db, "projects"), orderBy("createdAt", "desc"));
                    const snap = await getDocs(qProjects);
                    const projs = snap.docs.map(d => ({
                        id: d.id,
                        ...d.data()
                    })).filter((p: any) => p.status === 'active' || p.status === 'paused');

                    setAvailableProjects(projs);
                } catch (e) {
                    console.error("Failed to load projects", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchProjects();
        }
    }, [activeProjectId]);

    // 2. Lobby Action: Select Project
    const handleSelectProject = (projectId: string) => {
        localStorage.setItem('titan_procurement_project_id', projectId);
        setActiveProjectId(projectId);
    };

    const handleExitProject = () => {
        localStorage.removeItem('titan_procurement_project_id');
        setActiveProjectId(null);
    };

    if (loading && !activeProjectId && availableProjects.length === 0) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">LOADING SUPPLY CHAIN...</div>;

    // --- RENDER: LOBBY (No Project Selected) ---
    if (!activeProjectId) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center">
                    <div className="max-w-5xl w-full space-y-8">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                                <Truck className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h1 className="text-3xl text-white font-bold tracking-tight">The Supply Command</h1>
                            <p className="text-zinc-500">Select a project to manage inventory and site requests.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableProjects.map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectProject(p.id)}
                                    className="group relative flex flex-col text-left h-full"
                                >
                                    <BananaCard className="h-full hover:border-yellow-500/30 hover:bg-zinc-900/80 transition-all duration-300">
                                        <div className="p-1">
                                            <div className="h-32 w-full bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg mb-4 flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform">
                                                <Package className="w-8 h-8 text-white/10 group-hover:text-yellow-500/20 transition-colors" />
                                            </div>

                                            <div className="px-1 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-1">{p.title}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border border-white/5 uppercase tracking-wide ${p.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-zinc-500'}`}>
                                                        {p.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                                                    <MapPin className="w-3 h-3" />
                                                    {p.location || "Unknown Location"}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 px-1">
                                                <span>ID: {p.id.slice(0, 6)}...</span>
                                                <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                                                    Manage Store <MousePointerClick className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    </BananaCard>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // --- RENDER: WORKSPACE (Project Selected) ---
    return (
        <AppLayout>
            <div className="bg-zinc-950 min-h-screen pb-20">
                {/* Header Bar */}
                <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            onClick={handleExitProject}
                            className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center cursor-pointer hover:border-yellow-500/50 hover:text-yellow-500 text-zinc-400 transition-colors"
                            title="Return to Project Selector"
                        >
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                The Supply Command
                            </h1>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Procurement Access Level</p>
                        </div>
                    </div>
                </header>

                <main className="p-6 max-w-7xl mx-auto">
                    {/* 
                      StoreTab handles Inventory and Site Requests.
                      It already includes the "SITE REQUESTS (PENDING)" logic (aka Field Requests).
                    */}
                    <StocksTab projectId={activeProjectId} />
                </main>
            </div>
        </AppLayout>
    );
}
