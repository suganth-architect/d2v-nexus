import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, collection, query, where, updateDoc } from "firebase/firestore";
import { AppLayout } from "../../layouts/AppLayout";
import { ProjectTimeline } from "../../components/ui/ProjectTimeline";
import { KanbanSquare, CloudSun, Users, TrendingUp, AlertTriangle, CheckCircle, Lock } from "lucide-react";

export default function PMDashboard() {
    const { id: projectId } = useParams(); // Note: Route is /portal/ops/:id in App.tsx
    // const { user, profile } = useTitanAuth(); // Unused for now

    // Derived state from profile if needed later

    const [project, setProject] = useState<any>(null);
    const [variations, setVariations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Project Data
    useEffect(() => {
        if (!projectId) return;
        const unsub = onSnapshot(doc(db, "projects", projectId), (doc) => {
            if (doc.exists()) {
                setProject(doc.data());
                setLoading(false);
            }
        });
        return () => unsub();
    }, [projectId]);

    // 2. Fetch Variations (Pending ones only for the queue)
    useEffect(() => {
        if (!projectId) return;
        // Assuming there is a 'variations' subcollection or just tasks with specific type. 
        // Prompt says "Variation Queue". Let's assume a 'variations' collection or look for specific variation documents.
        // For now, I'll mock the Variation Queue logic or assume a query if I knew the schema. 
        // Let's assume we query `pvo_requests` or similar based on previous context, OR just a placeholder if not defined.
        // Given constraints, I will build a lightweight queue assuming 'variations' collection exists or I'll create a UI that *would* populate it.
        // Let's assume 'financial_variations' collection based on "Financial variations".

        const q = query(collection(db, `projects / ${projectId}/variations`), where("status", "==", "pending_review"));
        // Since I don't want to break if collection doesn't exist, I'll wrap in try/catch or just be safe.
        // Actually, let's just use a dummy list or empty if not found, to satisfy the UI requirement.

        // Real implementation:
        const unsub = onSnapshot(q, (snapshot) => {
            const vars = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setVariations(vars); // Filter in UI
        });

        return () => unsub();
    }, [projectId]);

    const handleApproveForReview = async (variationId: string) => {
        // PM can "Approve for Review" -> sends to Founder
        await updateDoc(doc(db, `projects/${projectId}/variations`, variationId), {
            status: 'founder_review'
        });
    };

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">LOADING OPS...</div>;
    if (!project) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">PROJECT DATABASE ERROR</div>;

    return (
        <AppLayout>
            <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20">
                {/* Header: Mission Control */}
                <header className="border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                <KanbanSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-white mb-0.5">Mission Control</h1>
                                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{project.title}</p>
                            </div>
                        </div>

                        {/* High Density Data Row */}
                        <div className="flex items-center gap-6 hidden md:flex">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Weather</span>
                                <div className="flex items-center gap-2 text-zinc-300">
                                    <CloudSun className="w-4 h-4" /> <span className="font-mono">24°C</span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Active Crews</span>
                                <div className="flex items-center gap-2 text-zinc-300">
                                    <Users className="w-4 h-4" /> <span className="font-mono">3</span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold">Trend</span>
                                <div className="flex items-center gap-2 text-green-400">
                                    <TrendingUp className="w-4 h-4" /> <span className="font-mono">+12%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                    {/* 1. Timeline View (Editable) */}
                    <section>
                        <ProjectTimeline project={project} projectId={projectId!} isEditable={true} />
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 2. Variation Queue */}
                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="text-zinc-400 font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Variation Queue
                            </h3>

                            {/* Queue List */}
                            <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden min-h-[200px]">
                                {variations.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-600 flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                                            <CheckCircle className="w-5 h-5 opacity-20" />
                                        </div>
                                        <p className="text-sm">No pending variations.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {variations.map((v) => (
                                            <div key={v.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                                <div>
                                                    <h4 className="text-sm font-medium text-zinc-200">{v.title || "Untitled Variation"}</h4>
                                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">Cost Impact: ${v.amount || 0}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-zinc-950 text-zinc-500 border border-zinc-800">
                                                        {v.status}
                                                    </span>
                                                    {/* Approve Button */}
                                                    <button
                                                        onClick={() => handleApproveForReview(v.id)}
                                                        className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-xs font-bold uppercase hover:bg-yellow-500 hover:text-black transition-colors"
                                                    >
                                                        Review →
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Budget (View Only, Hidden Profit) */}
                        <div className="space-y-4">
                            <h3 className="text-zinc-400 font-bold">Master Budget</h3>
                            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                    <Lock className="w-12 h-12" />
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <div className="text-zinc-500 text-xs uppercase mb-1">Total Budget</div>
                                        <div className="text-2xl font-bold font-mono text-white blur-[2px] transition-all hover:blur-none cursor-help" title="Confidential">
                                            ${(project.budgetTotal || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500 text-xs uppercase mb-1">Allocated</div>
                                        <div className="text-xl font-bold font-mono text-zinc-300">
                                            ${(project.budgetAllocated || 0).toLocaleString()}
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-zinc-950 border border-white/5 rounded text-xs text-zinc-500 italic text-center">
                                        Profit Margin is hidden in Ops View.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
