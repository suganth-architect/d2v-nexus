import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { FileText, Lock, PenTool, LayoutGrid, MapPin, MousePointerClick } from "lucide-react";
import { AppLayout } from "../../layouts/AppLayout";
import { BananaCard } from "../../components/ui/BananaCard";

// ----------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------

type KanbanColumnId = 'pending_decision' | 'rfi_sent' | 'founder_review' | 'issued';

interface DesignTask {
    id: string;
    title: string;
    description?: string;
    status: string;
    designStage: KanbanColumnId;
    priority: 'low' | 'medium' | 'high';
    isBlocked?: boolean;
    drawingSet?: string;
    revision?: string;
    thumbnailUrl?: string;
    category?: string;
}

const COLUMNS: { id: KanbanColumnId; label: string; color: string }[] = [
    { id: 'pending_decision', label: 'Needs Decision', color: 'border-pink-500/50 text-pink-400' },
    { id: 'rfi_sent', label: 'RFI In Progress', color: 'border-blue-500/50 text-blue-400' },
    { id: 'founder_review', label: 'Founder Review', color: 'border-yellow-500/50 text-yellow-400' },
    { id: 'issued', label: 'Issued for Construction', color: 'border-green-500/50 text-green-400' },
];

export default function DesignStudio() {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<DesignTask[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [availableProjects, setAvailableProjects] = useState<any[]>([]);

    // 1. Resolve Project ID or Fetch List
    useEffect(() => {
        const pid = localStorage.getItem('titan_last_project_id');
        if (pid) {
            setActiveProjectId(pid);
        } else {
            // No active project? Fetch all active projects for the Lobby.
            const fetchProjects = async () => {
                try {
                    const qProjects = query(collection(db, "projects"), orderBy("createdAt", "desc"));
                    const snap = await getDocs(qProjects);
                    // Simplify data for the card
                    const projs = snap.docs.map(d => ({
                        id: d.id,
                        ...d.data()
                    }));
                    setAvailableProjects(projs);
                } catch (e) {
                    console.error("Failed to load projects", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchProjects();
        }
    }, []);

    // 2. Fetch Design Tasks (Only if we have a Project ID)
    useEffect(() => {
        if (!activeProjectId) return;

        setLoading(true);
        const q = query(
            collection(db, `projects/${activeProjectId}/tasks`),
            where("category", "in", ["Design", "Selection"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks: DesignTask[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "Untitled Task",
                    description: data.description,
                    designStage: data.designStage || 'pending_decision',
                    priority: data.priority || 'medium',
                    isBlocked: data.status === 'BLOCKED',
                    drawingSet: data.drawingSet || "A-00",
                    revision: data.revision || "R0",
                    thumbnailUrl: data.thumbnailUrl,
                    category: data.category
                } as DesignTask;
            });
            setTasks(fetchedTasks);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeProjectId]);

    // 3. Lobby Action: Select Project
    const handleSelectProject = (projectId: string) => {
        localStorage.setItem('titan_last_project_id', projectId);
        setActiveProjectId(projectId);
    };

    const handleExitProject = () => {
        localStorage.removeItem('titan_last_project_id');
        setActiveProjectId(null);
        setTasks([]);
        // Re-fetch projects if needed, or just reload page logic (useEffect will run if we reset, but actually useEffect [] only runs once)
        // Better to manually trigger the fetch or just reload window for simplicity, or refactor useEffect.
        // Let's just refactor the first useEffect? No, easier to just:
        window.location.reload();
    };

    // 4. "The Red Pen" - Block Task
    const toggleBlockTask = async (task: DesignTask) => {
        if (!activeProjectId) return;
        const ref = doc(db, `projects/${activeProjectId}/tasks`, task.id);
        const newStatus = task.isBlocked ? 'pending' : 'BLOCKED';
        await updateDoc(ref, {
            status: newStatus
        });
    };

    if (loading && !activeProjectId && availableProjects.length === 0) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">LOADING STUDIO...</div>;

    // --- RENDER: LOBBY (No Project Selected) ---
    if (!activeProjectId) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center">
                    <div className="max-w-5xl w-full space-y-8">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                <PenTool className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl text-white font-bold tracking-tight">Architect's Lobby</h1>
                            <p className="text-zinc-500">Select an active project to enter the Design Command Center.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableProjects.map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectProject(p.id)}
                                    className="group relative flex flex-col text-left h-full"
                                >
                                    <BananaCard className="h-full hover:border-white/20 hover:bg-zinc-900/80 transition-all duration-300">
                                        <div className="p-1">
                                            {/* Dummy Image or Gradient */}
                                            <div className="h-32 w-full bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg mb-4 flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-[1.02] transition-transform">
                                                <LayoutGrid className="w-8 h-8 text-white/10 group-hover:text-white/20 transition-colors" />
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
                                                    Enter Studio <MousePointerClick className="w-3 h-3" />
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

    // --- RENDER: STUDIO (Project Selected) ---
    return (
        <AppLayout>
            <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-950 text-white overflow-hidden font-sans border border-zinc-800/50 rounded-xl">
                {/* Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-xl shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={handleExitProject} title="Back to Lobby">
                            <PenTool className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                                Design Command
                                <span className="text-[10px] bg-zinc-900 border border-white/10 px-2 py-0.5 rounded text-zinc-500 font-mono cursor-pointer hover:bg-zinc-800 hover:text-white transition-colors" onClick={handleExitProject}>
                                    SWITCH PROJECT
                                </span>
                            </h1>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Architectural Control System</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-xs text-zinc-400 font-mono">
                            {tasks.length} ACTIVE ITEMS
                        </div>
                    </div>
                </header>

                {/* The Board (Kanban) */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex h-full gap-6 min-w-max">
                        {COLUMNS.map(col => (
                            <Column
                                key={col.id}
                                column={col}
                                tasks={tasks.filter(t => t.designStage === col.id)}
                                onBlock={toggleBlockTask}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function Column({ column, tasks, onBlock }: {
    column: { id: KanbanColumnId; label: string; color: string },
    tasks: DesignTask[],
    onBlock: (task: DesignTask) => void
}) {
    return (
        <div className="w-[320px] h-full flex flex-col bg-zinc-900/20 rounded-xl border border-white/5 backdrop-blur-sm">
            {/* Column Header */}
            <div className={`p-4 border-b border-white/5 flex items-center justify-between ${column.color}`}>
                <h3 className="font-bold text-sm tracking-wide">{column.label}</h3>
                <span className="text-xs font-mono opacity-50 bg-black/20 px-2 py-0.5 rounded">{tasks.length}</span>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onBlock={onBlock} />
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task, onBlock }: { task: DesignTask, onBlock: (t: DesignTask) => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative group flex flex-col gap-3 p-4 rounded-lg border backdrop-blur-xl transition-all
                ${task.isBlocked
                    ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
                    : 'bg-zinc-900/60 border-white/5 hover:border-yellow-500/30 hover:bg-zinc-900/80'}
            `}
        >
            {/* Header: ID and Priority */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{task.drawingSet} • {task.revision}</span>
                {task.isBlocked && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
                        <Lock className="w-3 h-3" /> BLOCKED
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex gap-3">
                {/* Thumbnail (if exists) or Placeholder */}
                <div className="w-12 h-12 rounded bg-black border border-white/10 flex-shrink-0 flex items-center justify-center text-zinc-700 overflow-hidden">
                    {task.thumbnailUrl ? (
                        <img src={task.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                        <FileText className="w-5 h-5 opacity-50" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium leading-tight mb-1 truncate ${task.isBlocked ? 'text-red-200' : 'text-zinc-200 group-hover:text-white'}`}>
                        {task.title}
                    </h4>
                    {task.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2">{task.description}</p>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                {/* The Red Pen */}
                <button
                    onClick={(e) => { e.stopPropagation(); onBlock(task); }}
                    className={`
                        text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1
                        ${task.isBlocked
                            ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                            : 'text-red-500/70 hover:text-red-400 hover:bg-red-500/10'}
                    `}
                >
                    {task.isBlocked ? 'Unblock' : 'Mark Blocker'}
                </button>

                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                </div>
            </div>
        </motion.div>
    );
}
