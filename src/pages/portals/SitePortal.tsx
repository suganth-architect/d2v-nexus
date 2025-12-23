import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import type { Task, Project, MaterialRequest } from "../../types";
import { SiteTaskCard } from "../../components/mobile/SiteTaskCard";
import { DailyLogWizard } from "../../components/site/DailyLogWizard";
import {
    MapPin, Camera, Package, Users, AlertTriangle, CheckCircle2,
    Clock, Truck, Plus, HelpCircle
} from "lucide-react";
import { logActivity } from "../../lib/logger";

export function SitePortal() {
    const { id } = useParams<{ id: string }>();
    const { user } = useTitanAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
    const [feedItems, setFeedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clockedIn, setClockedIn] = useState(false);

    // Wizard State
    const [showWizard, setShowWizard] = useState(false);
    const [wizardMode, setWizardMode] = useState<'morning' | 'evening'>('morning');

    // Modals
    const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
    const [selectedTaskForDelay, setSelectedTaskForDelay] = useState<Task | null>(null);
    const [delayReason, setDelayReason] = useState("");

    // RFI State
    const [isRfiModalOpen, setIsRfiModalOpen] = useState(false);
    const [rfiQuestion, setRfiQuestion] = useState("");
    const [rfiPriority, setRfiPriority] = useState<'normal' | 'urgent'>('normal');

    useEffect(() => {
        if (id && user) {
            loadProjectData();
            checkAttendanceStatus();
            loadTasks();
            loadMaterialRequests();
            checkDailyLog();
            loadFeed();
        }
    }, [id, user]);

    const loadProjectData = async () => {
        if (!id) return;
        try {
            const docRef = doc(db, "projects", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() } as Project);
            }
        } catch (error) { console.error(error); }
    };

    const checkAttendanceStatus = async () => setClockedIn(false); // Mock for now

    const loadTasks = async () => {
        if (!id) return;
        try {
            const q = query(
                collection(db, "projects", id, "tasks"),
                where("status", "in", ["pending", "in_progress", "delayed", "on_hold"])
            );
            const snapshot = await getDocs(q);
            const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(taskList);
            setLoading(false);
        } catch (error) { console.error(error); }
    };

    const loadMaterialRequests = async () => {
        if (!id) return;
        try {
            const q = query(
                collection(db, "projects", id, "material_requests"),
                where("status", "!=", "delivered")
            );
            const snapshot = await getDocs(q);
            setMaterialRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest)));
        } catch (error) { console.error(error); }
    };

    const checkDailyLog = async () => {
        if (!id) return;
        const today = new Date().toISOString().split('T')[0];
        const q = query(collection(db, "projects", id, "daily_logs"), where("date", "==", today), where("type", "==", "morning"));
        const snap = await getDocs(q);
        if (snap.empty) {
            setWizardMode('morning');
            setShowWizard(true);
        }
    };

    const loadFeed = async () => {
        if (!id) return;
        try {
            // Fetch recent logs, RFIs, photos
            // Simplified: Just fetching site_logs and decisions for now as logic implies
            // In a real app, we'd use a combined collection or separate queries merged

            const qLogs = query(collection(db, "projects", id, "site_logs"), orderBy("timestamp", "desc"), limit(10));
            const qDecisions = query(collection(db, "projects", id, "decisions"), orderBy("createdAt", "desc"), limit(5));

            const [snapLogs, snapDecisions] = await Promise.all([getDocs(qLogs), getDocs(qDecisions)]);

            const logs = snapLogs.docs.map(d => ({ ...d.data(), id: d.id, _type: 'log', time: d.data().timestamp }));
            const decisions = snapDecisions.docs.map(d => ({ ...d.data(), id: d.id, _type: 'decision', time: d.data().createdAt }));

            const combined = [...logs, ...decisions].sort((a, b) => b.time - a.time);
            setFeedItems(combined);
        } catch (e) {
            console.error("Feed error", e);
        }
    };

    const handleClockIn = async () => {
        if (!id || !user) return;
        setClockedIn(!clockedIn);

        if (!clockedIn) {
            await logActivity(id, 'attendance', `Checked In: ${user.displayName || 'User'}`, {
                location: project?.location || 'Site',
                role: 'Engineer'
            }, user.uid);
            loadFeed();
        }
    };

    const handleTaskComplete = async (task: Task) => {
        if (!id) return;
        setTasks(prev => prev.filter(t => t.id !== task.id));
        await updateDoc(doc(db, "projects", id, "tasks", task.id), {
            status: 'completed',
            completedAt: serverTimestamp(),
            completedBy: user?.uid
        });

        await logActivity(id, 'task', `Completed Task: ${task.title}`, {
            taskId: task.id,
            xpReward: task.xpReward
        }, user?.uid);

        loadFeed();
    };

    // --- Delay Logic ---
    const openDelayModal = (task: Task) => {
        setSelectedTaskForDelay(task);
        setIsDelayModalOpen(true);
        setDelayReason("");
    };

    const handleDelaySubmit = async () => {
        if (!id || !selectedTaskForDelay || !delayReason) return;
        const isDesignIssue = delayReason === 'Design Issue';

        await updateDoc(doc(db, "projects", id, "tasks", selectedTaskForDelay.id), {
            status: 'delayed',
            delayReason: delayReason,
            priority: isDesignIssue ? 'critical' : selectedTaskForDelay.priority,
            isEmergency: isDesignIssue
        });

        // Use logActivity instead of manual addDoc
        await logActivity(id, 'incident', `DELAY: ${selectedTaskForDelay.title} - ${delayReason}`, {
            taskId: selectedTaskForDelay.id,
            severity: isDesignIssue ? 'high' : 'medium',
            reason: delayReason
        }, user?.uid);

        setIsDelayModalOpen(false);
        loadTasks();
        loadFeed();
    };

    // --- RFI Logic ---
    const handleRaiseRFI = async () => {
        if (!id || !user || !rfiQuestion) return;

        try {
            await addDoc(collection(db, "projects", id, "decisions"), {
                projectId: id,
                type: 'rfi',
                title: rfiQuestion,
                status: 'pending',
                priority: rfiPriority,
                requiresImmediateAttention: rfiPriority === 'urgent',
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });

            await logActivity(id, 'decision', `RFI Raised: ${rfiQuestion}`, {
                priority: rfiPriority
            }, user.uid);

            setIsRfiModalOpen(false);
            setRfiQuestion("");
            alert("RFI Sent to Architect!");
            loadFeed();
        } catch (e) {
            console.error(e);
        }
    };

    // --- Magic Actions ---
    const handlePhotoUpdate = async () => {
        alert("Camera Module would open here. Mocking photo log.");
        if (!id || !user) return;

        await logActivity(id, 'photo', "Site Progress Update", {
            imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=1000",
            isPublic: true
        }, user.uid);

        loadFeed();
    };

    const handleRequestMaterial = async () => {
        const item = prompt("Material Name:");
        if (!item) return;
        const qty = prompt("Quantity:");
        if (!qty) return;
        await addDoc(collection(db, "projects", id!, "material_requests"), {
            item, quantity: qty, status: 'pending', requestedBy: user!.uid, createdAt: serverTimestamp()
        });
        loadMaterialRequests();
    };

    if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading Site Portal...</div>;

    return (
        <div className="pb-32 animate-in fade-in duration-500 bg-black min-h-screen relative">
            {/* WIZARD */}
            {showWizard && id && user && (
                <DailyLogWizard
                    projectId={id}
                    userId={user.uid}
                    userName={user.displayName || "Engineer"}
                    onClose={() => setShowWizard(false)}
                    mode={wizardMode}
                />
            )}

            {/* HEADER */}
            <div className="flex items-center justify-between p-4 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40 border-b border-zinc-800">
                <div>
                    <h1 className="text-xl font-bold text-zinc-100 tracking-tight">{project?.title || "Project"}</h1>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <MapPin className="w-3 h-3 text-yellow-500" />
                        <span>{project?.location || "Site"}</span>
                    </div>
                </div>
                <button
                    onClick={handleClockIn}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all active:scale-95 ${clockedIn ? "bg-green-500/20 border-green-500 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}
                >
                    <Clock className={`w-5 h-5 ${clockedIn ? "animate-pulse" : ""}`} />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* QUICK ACTIONS */}
                <div className="grid grid-cols-2 gap-3">
                    <ActionButton icon={<Camera className="w-6 h-6 text-blue-400" />} label="Photo Update" onClick={handlePhotoUpdate} delay={0} />
                    <ActionButton icon={<Package className="w-6 h-6 text-yellow-400" />} label="Request Material" onClick={handleRequestMaterial} delay={1} />
                    <ActionButton icon={<HelpCircle className="w-6 h-6 text-purple-400" />} label="Raise RFI / Doubt" onClick={() => setIsRfiModalOpen(true)} delay={2} />
                    <ActionButton icon={<Users className="w-6 h-6 text-green-400" />} label="End Day Report" onClick={() => { setWizardMode('evening'); setShowWizard(true); }} delay={3} />
                </div>

                {/* SUPPLY TRACKER */}
                {materialRequests.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Truck className="w-4 h-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">In Transit / Pending</h2>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {materialRequests.map(req => (
                                <div key={req.id} className="flex-shrink-0 w-48 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                                    <div className="font-medium text-zinc-200 truncate">{req.item}</div>
                                    <div className="text-xs text-zinc-500">{req.quantity} • {req.status}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TODAY'S TARGETS */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-zinc-200">Today's Targets</h2>
                        <span className="text-xs font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-500 border border-zinc-800">{tasks.length} ACTIVE</span>
                    </div>
                    <div className="space-y-4">
                        {tasks.length === 0 ? (
                            <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>All caught up!</p>
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <SiteTaskCard
                                    key={task.id}
                                    task={task}
                                    materialRequestCount={0}
                                    onComplete={handleTaskComplete}
                                    onDelay={openDelayModal}
                                    onViewDrawing={() => { }}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* LIVE FEED */}
                <div>
                    <h2 className="text-lg font-bold text-zinc-200 mb-4">Live Stream</h2>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-zinc-800">
                        {feedItems.map((item) => (
                            <div key={item.id} className="relative pl-10">
                                <div className={`absolute left-2 top-2 w-4 h-4 rounded-full border-2 ${item._type === 'decision' ? 'bg-purple-500 border-purple-900' : 'bg-blue-500 border-blue-900'} z-10`} />
                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${item._type === 'decision' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {item._type === 'decision' ? (item.type === 'rfi' ? 'RFI' : 'DECISION') : 'SITE LOG'}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                            {item.time?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-zinc-300 font-medium">
                                        {item._type === 'decision' ? item.title : item.description}
                                    </p>
                                    {item.imageUrl && (
                                        <img src={item.imageUrl} alt="Update" className="mt-2 rounded-lg w-full h-32 object-cover" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MAGIC FAB */}
            <button
                onClick={() => setIsRfiModalOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-90 transition-all z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* DELAY MODAL */}
            {isDelayModalOpen && selectedTaskForDelay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-red-900/50 p-4 space-y-4">
                        <h3 className="text-red-400 font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Report Incident</h3>
                        <p className="text-zinc-400 text-sm">Task: {selectedTaskForDelay.title}</p>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200"
                            value={delayReason}
                            onChange={(e) => setDelayReason(e.target.value)}
                        >
                            <option value="">Reason...</option>
                            <option value="Rain / Weather">Rain / Weather</option>
                            <option value="Material Shortage">Material Shortage</option>
                            <option value="Design Issue">Design Issue</option>
                            <option value="Labor Shortage">Labor Shortage</option>
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => setIsDelayModalOpen(false)} className="flex-1 py-3 bg-zinc-800 rounded-xl text-zinc-400">Cancel</button>
                            <button onClick={handleDelaySubmit} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold">Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RFI MODAL */}
            {isRfiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-purple-900/50 p-4 space-y-4">
                        <h3 className="text-purple-400 font-bold flex items-center gap-2"><HelpCircle className="w-5 h-5" /> Raise RFI</h3>
                        <textarea
                            placeholder="What is your doubt?"
                            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-purple-500"
                            value={rfiQuestion}
                            onChange={(e) => setRfiQuestion(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="urgent"
                                checked={rfiPriority === 'urgent'}
                                onChange={(e) => setRfiPriority(e.target.checked ? 'urgent' : 'normal')}
                                className="w-4 h-4 accent-red-500"
                            />
                            <label htmlFor="urgent" className="text-zinc-400 text-sm">Mark as Urgent / Blocker</label>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsRfiModalOpen(false)} className="flex-1 py-3 bg-zinc-800 rounded-xl text-zinc-400">Cancel</button>
                            <button onClick={handleRaiseRFI} className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-bold">Send to Architect</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon, label, onClick, delay }: { icon: any, label: string, onClick: () => void, delay: number }) {
    return (
        <button
            onClick={onClick}
            className="h-24 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 flex flex-col justify-between items-start active:scale-95 transition-all"
            style={{ animationDelay: `${delay * 100}ms` }}
        >
            <div className="bg-zinc-950/50 p-2 rounded-lg">{icon}</div>
            <span className="text-xs font-medium text-zinc-400">{label}</span>
        </button>
    );
}
