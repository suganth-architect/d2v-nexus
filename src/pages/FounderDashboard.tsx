import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BananaCard } from "../components/ui/BananaCard";
import { BananaButton } from "../components/ui/BananaButton";
import { ProjectCard } from "../components/dashboard/ProjectCard";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, collectionGroup, where, getDoc, setDoc, doc, limit } from "firebase/firestore";
import { Link } from "react-router-dom";
import { CreateProjectModal } from "../components/dashboard/CreateProjectModal";
import { Plus, DollarSign, AlertTriangle, Layers, CheckCircle2 } from "lucide-react";
import { useTitanAuth } from "../hooks/useTitanAuth";
import { GlobalFeed } from "../components/dashboard/GlobalFeed";
import { DashboardModals } from "../components/dashboard/DashboardModals";

import { HallOfFame } from "../components/dashboard/HallOfFame";

export function FounderDashboard() {
    const { user, profile } = useTitanAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [activeModal, setActiveModal] = useState<'pipeline' | 'collections' | 'supply' | 'sites' | 'hotfix' | null>(null);
    const [hotfixList, setHotfixList] = useState<any[]>([]);
    const [requestList, setRequestList] = useState<any[]>([]);
    const [warRoomPreview, setWarRoomPreview] = useState<any[]>([]);
    // const [rfiList, setRfiList] = useState<any[]>([]); // Removed as per optimization, passing [] for now.

    // Metrics State
    const [metrics, setMetrics] = useState({
        activeSites: 0,
        pipelineValue: 0,
        collectionsDue: 0,
        criticalHotfixes: 0,
        frozenAssets: 0,
        activeTasks: 0,
        pendingRFIs: 0,
        pendingRequests: 0, // Material
        criticalStock: 0,   // Material
        stockValue: 0       // Material
    });

    const isFinancialViewAllowed = profile?.role === 'founder';

    // 1. GHOST USER FIX: Auto-Repair Identity
    useEffect(() => {
        const repairUser = async () => {
            if (!user) return;
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.log("👻 GHOST USER DETECTED! Repairing identity...");
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || "Founder",
                    role: 'founder',
                    currentXP: 0,
                    level: 1,
                    streak: 0,
                    createdAt: new Date()
                });
                console.log("✅ Identity Repaired.");
            }
        };
        repairUser();
    }, [user]);

    // 2. FETCH DATA & CALCULATE METRICS (OPTIMIZED)
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // A. Fetch Projects
            const qProjects = query(collection(db, "projects"), orderBy("createdAt", "desc"));
            const projectSnap = await getDocs(qProjects);
            const allProjects = projectSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProjects(allProjects);

            // Fetch War Room Preview (Top 3 Critical)
            const qWarRoom = query(collectionGroup(db, "tasks"), where("priority", "==", "critical"), where("status", "!=", "done"), limit(3));
            const warRoomSnap = await getDocs(qWarRoom);
            setWarRoomPreview(warRoomSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // B. Calculate Metrics from Denormalized Stats
            const pipelineVal = allProjects
                .filter((p: any) => p.status === 'active')
                .reduce((sum: number, p: any) => sum + (p.totalContractValue || 0), 0);

            // "Collections Due" (Outstanding for ACTIVE projects)
            const collectionsDue = allProjects
                .filter((p: any) => p.status === 'active')
                .reduce((sum: number, p: any) => {
                    const due = (p.totalContractValue || 0) - (p.totalPaid || 0);
                    return sum + (due > 0 ? due : 0);
                }, 0);

            // "Active Sites"
            const activeProjects = allProjects.filter((p: any) => p.status === 'active');

            // STATS AGGREGATION
            let totalTasks = 0;
            let totalHotfixes = 0;
            let totalStockRequests = 0;
            let totalRFIs = 0;
            let totalStockValue = 0; // Legacy or keep 0
            let totalCriticalStock = 0;

            allProjects.forEach((p: any) => {
                if (p.stats) {
                    totalTasks += p.stats.totalTasks || 0;
                    totalHotfixes += p.stats.criticalHotfixes || 0;
                    totalStockRequests += p.stats.pendingStock || 0;
                    totalRFIs += p.stats.pendingRFIs || 0;
                    // Note: We don't have stockValue in stats yet. 
                    // If crucial, we'd add it to statsWorker. For now, 0 or lazy fetch?
                    // The prompt said "No sub-collection queries". So we skip stock value audit loop.
                }
            });

            setMetrics({
                activeSites: activeProjects.length,
                pipelineValue: pipelineVal,
                collectionsDue: collectionsDue,
                criticalHotfixes: totalHotfixes,
                frozenAssets: 0,
                activeTasks: totalTasks,
                pendingRFIs: totalRFIs,
                pendingRequests: totalStockRequests,
                criticalStock: totalCriticalStock,
                stockValue: totalStockValue
            });

        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    // 3. LAZY LOAD LISTS FOR MODALS
    useEffect(() => {
        if (!activeModal) return;

        const loadModalData = async () => {
            // Logic to fetch specific lists ONLY when modal is open
            // This keeps the main dashboard instant.
            try {
                if (activeModal === 'hotfix') {
                    const qCritical = query(collectionGroup(db, "tasks"), where("priority", "==", "critical"), where("status", "!=", "done"));
                    const snap = await getDocs(qCritical);
                    setHotfixList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                if (activeModal === 'supply') {
                    const qReqs = query(collectionGroup(db, "material_requests"), where("status", "==", "requested"));
                    const snap = await getDocs(qReqs);
                    setRequestList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                // Pipeline/Sites/Collections usually use 'projects' array which is already loaded.
                // Metrics for 'rfi' might be needed if there is a generic list modal?
                // FounderDashboard passes 'rfis={rfiList}' to DashboardModals.
                // We should fetch RFIs if there is an RFI view. 
                // There isn't an explicit 'rfi' modal type in the state definitions in line 21, but let's check.
                // Line 21: activeModal type includes 'pipeline' | 'collections' | 'supply' | 'sites' | 'hotfix'. 
                // Wait, 'pendingRFIs' is a metric, but is there a modal? 
                // The Architect View has "RFIs Pending" card but it doesn't seem to trigger a modal in the code I read (it was separate).
                // But let's be safe.
            } catch (e) {
                console.error("Lazy load failed", e);
            }
        };
        loadModalData();
    }, [activeModal]);

    const formatINR = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Welcome back, <span className="text-yellow-500">{user?.displayName?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-zinc-400 mt-1">Operational Overview</p>
                </div>
                <div className="flex gap-2">
                    <BananaButton onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4" />
                        New Project
                    </BananaButton>
                </div>
            </div>

            {/* 3. COMMAND METRICS GRID */}
            {isFinancialViewAllowed ? (
                /* --- FOUNDER / FINANCIAL VIEW --- */
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* 1. Pipeline Value */}
                        <div onClick={() => navigate('/command/ledger')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className="relative overflow-hidden bg-zinc-900/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl group hover:border-green-500/30 transition-all duration-500 flex flex-col justify-between h-32">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-400 transition-colors">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    Pipeline Value
                                </div>
                                <div className="relative z-10 text-2xl font-bold text-white truncate" title={formatINR(metrics.pipelineValue)}>
                                    {formatINR(metrics.pipelineValue)}
                                </div>
                            </div>
                        </div>

                        {/* 2. Collections Due */}
                        <div onClick={() => navigate('/command/ledger')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className="relative overflow-hidden bg-zinc-900/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl group hover:border-green-500/30 transition-all duration-500 flex flex-col justify-between h-32">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-green-400 transition-colors">
                                    <DollarSign className="w-4 h-4 text-red-400" />
                                    Collections Due
                                </div>
                                <div className="relative z-10 text-2xl font-bold text-white truncate" title={formatINR(metrics.collectionsDue)}>
                                    {formatINR(metrics.collectionsDue)}
                                </div>
                            </div>
                        </div>

                        {/* 3. Material Command (NEW) */}
                        <div onClick={() => setActiveModal('supply')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className="relative overflow-hidden bg-zinc-900/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl group hover:border-white/20 transition-all duration-500 flex flex-col justify-between h-32">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-yellow-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-yellow-500" />
                                        Supply Chain
                                    </div>
                                    {metrics.pendingRequests > 0 && <span className="bg-red-500 text-black px-1.5 rounded animate-pulse">{metrics.pendingRequests}</span>}
                                </div>

                                <div className="relative z-10 flex items-end justify-between">
                                    <div>
                                        <div className="text-xs text-zinc-500">Stock Value</div>
                                        <div className="text-lg font-bold text-white">{formatINR(metrics.stockValue)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-zinc-500 uppercase">Critical</div>
                                        <div className={`text-lg font-bold ${metrics.criticalStock > 0 ? 'text-red-500' : 'text-zinc-600'}`}>{metrics.criticalStock}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Active Sites */}
                        <div onClick={() => setActiveModal('sites')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className="relative overflow-hidden bg-zinc-900/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl group hover:border-white/20 transition-all duration-500 flex flex-col justify-between h-32">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                                    <Layers className="w-4 h-4 text-blue-400" />
                                    Active Sites
                                </div>
                                <div className="relative z-10 text-2xl font-bold text-white truncate">
                                    {metrics.activeSites}
                                </div>
                            </div>
                        </div>

                        {/* 5. Critical Hotfixes (WAR ROOM) */}
                        <div onClick={() => setActiveModal('hotfix')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className={`relative overflow-hidden bg-zinc-900/30 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl group hover:border-white/20 transition-all duration-500 flex flex-col justify-between h-32 ${metrics.criticalHotfixes > 0 ? 'border-red-500/30' : ''}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                {metrics.criticalHotfixes > 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}

                                <div className="relative z-10 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-red-400 transition-colors">
                                    <AlertTriangle className={`w-4 h-4 ${metrics.criticalHotfixes > 0 ? 'text-red-500' : 'text-zinc-600'}`} />
                                    War Room
                                </div>

                                <div className="relative z-10">
                                    {metrics.criticalHotfixes === 0 ? (
                                        <div className="flex items-center gap-2 text-green-500 font-bold">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="text-sm">All Systems Nominal</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 mt-1">
                                            {warRoomPreview.map((item) => (
                                                <div key={item.id} className="flex items-center gap-2 text-xs text-white truncate">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                                    <span className="truncate flex-1">{item.title}</span>
                                                </div>
                                            ))}
                                            {warRoomPreview.length < metrics.criticalHotfixes && (
                                                <div className="text-[10px] text-zinc-500 pl-3.5">
                                                    + {metrics.criticalHotfixes - warRoomPreview.length} more
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- ARCHITECT / OPS VIEW ---
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Active Tasks */}
                    <BananaCard className="bg-zinc-900/50 border-white/5 p-4 flex flex-col justify-between h-28 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                            <Layers className="w-4 h-4 text-blue-400" />
                            Active Tasks
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {metrics.activeTasks}
                        </div>
                    </BananaCard>

                    {/* 2. RFIs Pending */}
                    <BananaCard className="bg-zinc-900/50 border-white/5 p-4 flex flex-col justify-between h-28 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 bg-yellow-500/10 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            RFIs Pending
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {metrics.pendingRFIs}
                        </div>
                    </BananaCard>

                    {/* 3. Active Sites */}
                    <BananaCard className="bg-zinc-900/50 border-white/5 p-4 flex flex-col justify-between h-28">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                            <Layers className="w-4 h-4 text-green-400" />
                            Active Sites
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {metrics.activeSites}
                        </div>
                    </BananaCard>

                    {/* 4. Critical ISSUES */}
                    <Link to="/command/global-tasks?filter=critical" className="block relative group">
                        <BananaCard className="bg-zinc-900/50 border-white/5 p-4 flex flex-col justify-between h-28 relative overflow-hidden group-hover:border-red-500/50 transition-colors">
                            {metrics.criticalHotfixes > 0 && (
                                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                            )}
                            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider group-hover:text-red-400 transition-colors">
                                <AlertTriangle className="w-4 h-4 text-orange-400 group-hover:text-red-400" />
                                Site Issues
                            </div>
                            <div className="text-3xl font-bold text-white flex items-center gap-2">
                                {metrics.criticalHotfixes}
                                {metrics.criticalHotfixes > 0 && <span className="text-xs bg-red-500 text-black px-1.5 py-0.5 rounded font-bold animate-bounce">RESOLVE</span>}
                            </div>
                        </BananaCard>
                    </Link>
                </div>
            )}

            {/* Project List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-zinc-900 rounded-xl border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((p) => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            isFinancialView={isFinancialViewAllowed}
                            formatINR={formatINR}
                        />
                    ))}
                </div>
            )}

            {/* 4. LIVE OPS & HALL OF FAME */}
            <div className="pt-8 border-t border-white/5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Live Ops Feed */}
                    <div className="lg:col-span-2">
                        {/* Header is inside GlobalFeed but prompt says "Render Activity Stream here".
                             GlobalFeed has its own container styling, so we might need to adjust or just drop it in.
                             Prompt: "Left Column (col-span-2): LIVE OPERATIONS FEED... Render the Activity Stream here"
                             GlobalFeed.tsx has "bg-zinc-900/50... p-6".
                         */}
                        <GlobalFeed />
                    </div>

                    {/* RIGHT: Hall of Fame */}
                    <div className="lg:col-span-1">
                        <HallOfFame />
                    </div>
                </div>
            </div>

            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onProjectCreated={fetchDashboardData}
            />

            <DashboardModals
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                type={activeModal}
                projects={projects}
                hotfixes={hotfixList}
                materialRequests={requestList}
                rfis={[]} // TODO: Implement lazy load for RFIs if needed
            />
        </div>
    );
}
