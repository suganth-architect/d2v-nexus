import { useEffect, useState, useMemo } from "react";
import { collectionGroup, query, where, onSnapshot, orderBy, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AlertOctagon, LayoutList, Kanban as KanbanIcon, Calendar as CalendarIcon } from "lucide-react";
import { TaskItem } from "../../components/ui/TaskItem";
import { TaskDetailModal } from "../../components/TaskDetailModal";
import { ModernCalendar } from "../../components/ModernCalendar";
import { useLocation } from "react-router-dom";

export default function GlobalTaskPortal() {
    const location = useLocation();

    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<Record<string, any>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // FILTERS
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'kanban'>('kanban');

    // MODAL STATE
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // URL FILTER STATE
    const [criticalOnly, setCriticalOnly] = useState(false);

    // URL PARAMS EFFECT
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filter = params.get('filter');
        if (filter === 'critical') {
            setCriticalOnly(true);
        } else {
            setCriticalOnly(false);
        }
    }, [location.search]);

    // DATA FETCHING
    useEffect(() => {
        // 1. Fetch Users
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        });

        // 2. Fetch Projects (for Badges)
        const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
            const projMap: Record<string, any> = {};
            snap.docs.forEach(d => {
                projMap[d.id] = { id: d.id, ...d.data() };
            });
            setProjects(projMap);
        });

        // 3. Fetch Global Tasks
        const q = query(
            collectionGroup(db, 'tasks'),
            where('status', '!=', 'archived'),
            orderBy('status'),
            orderBy('createdAt', 'desc')
        );

        const unsubTasks = onSnapshot(q, (snapshot) => {
            const results: any[] = [];
            snapshot.docs.forEach(doc => {
                const projectRef = doc.ref.parent.parent;
                const projectId = projectRef?.id;
                if (projectId) {
                    results.push({
                        id: doc.id,
                        ...doc.data(),
                        projectId: projectId
                    });
                }
            });
            setTasks(results);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Global Query Error", err);
            if (err.message.includes("indexes")) {
                setError("MISSING_INDEX");
            } else {
                setError(err.message);
            }
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubProjects();
            unsubTasks();
        };
    }, []);

    // FILTER LOGIC
    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(t => t.title.toLowerCase().includes(lower));
        }

        // Status
        // Status
        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }

        // Assignee
        if (assigneeFilter !== 'all') {
            result = result.filter(t => t.assignedTo === assigneeFilter);
        }

        // Project
        if (projectFilter !== 'all') {
            result = result.filter(t => t.projectId === projectFilter);
        }

        // Critical Filter (from URL)
        if (criticalOnly) {
            result = result.filter(t => t.isEmergency === true || t.priority === 'critical');
        }

        return result;
    }, [tasks, searchQuery, statusFilter, assigneeFilter, projectFilter, criticalOnly]);


    // DRAG AND DROP HANDLER
    const handleTaskDrop = async (taskId: string, newStatus: string) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const currentTask = tasks[taskIndex];
        if (currentTask.status === newStatus) return;

        // Optimistic Update
        const updatedTask = { ...currentTask, status: newStatus };
        const newTasks = [...tasks];
        newTasks[taskIndex] = updatedTask;
        setTasks(newTasks);

        try {
            await updateDoc(doc(db, `projects/${currentTask.projectId}/tasks`, taskId), {
                status: newStatus
            });
        } catch (err) {
            console.error("Drop update failed", err);
        }
    };


    if (error === "MISSING_INDEX") {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <AlertOctagon className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wider">GOD MODE REQUIRES ACTIVATION</h1>
                    <p className="text-zinc-400">
                        To view all tasks globally, a Firestore Composite Index must be built.
                    </p>
                    <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-lg text-left text-sm font-mono text-yellow-500">
                        Task: Enable Global Query<br />
                        Status: Pending Index<br />
                        Action: Click Link in Console
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2 flex items-center gap-3">
                        Global Command
                        <span className="text-xs text-green-500 border border-green-500/50 px-1 rounded ml-2">SYSTEM v4.0 ONLINE</span>
                        {criticalOnly && (
                            <span className="text-sm bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-1 rounded flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" /> CRITICAL MODE
                            </span>
                        )}
                    </h1>
                    <p className="text-zinc-500">Team Tasks & Task Intelligence across all active sites.</p>
                </div>

                {criticalOnly && (
                    <button
                        onClick={() => setCriticalOnly(false)}
                        className="text-xs text-zinc-400 hover:text-white underline"
                    >
                        Clear Filter
                    </button>
                )}
            </div>

            {/* TOOLBAR */}
            <div className="max-w-7xl mx-auto sticky top-4 z-40 mb-8">
                <div className="bg-zinc-900/50 backdrop-blur-md border border-white/5 p-2 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    {/* LEFT: Filters */}
                    <div className="flex flex-1 items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="GLOBAL SEARCH..."
                            className="bg-black/40 border border-white/5 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 uppercase tracking-wide min-w-[200px]"
                        />
                        <div className="h-6 w-px bg-white/5 mx-1" />

                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="bg-zinc-800/50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold text-zinc-300 uppercase max-w-[140px]"
                        >
                            <option value="all">Project: All</option>
                            {Object.values(projects).map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-zinc-800/50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold text-zinc-300 uppercase"
                        >
                            <option value="all">Status: All</option>
                            <option value="TODO">To Do</option>
                            <option value="ACTIVE">Active</option>
                            <option value="REVIEW">Review</option>
                            <option value="DONE">Done</option>
                        </select>

                        <select
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="bg-zinc-800/50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold text-zinc-300 uppercase max-w-[140px]"
                        >
                            <option value="all">Agent: All</option>
                            {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* RIGHT: View Modes */}
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded transition-all ${viewMode === 'calendar' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded transition-all ${viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <KanbanIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* LOADING STATE */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
            )}

            {/* CONTENT */}
            {!loading && viewMode === 'list' && (
                <div className="max-w-7xl mx-auto space-y-2">
                    {filteredTasks.map(task => {
                        const project = projects[task.projectId];
                        return (
                            <TaskItem
                                key={task.id}
                                task={task}
                                projectId={task.projectId}
                                users={users}
                                viewMode="list"
                                showProjectBadge={true}
                                projectName={project?.title || "Unknown"}
                                onClick={(t) => {
                                    setSelectedTask(t);
                                    setIsModalOpen(true);
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {!loading && viewMode === 'calendar' && (
                <ModernCalendar
                    tasks={filteredTasks}
                    projects={projects}
                    grouping="project"
                    onTaskClick={(task) => {
                        setSelectedTask(task);
                        setIsModalOpen(true);
                    }}
                />
            )}

            {!loading && viewMode === 'kanban' && (
                <GlobalKanban
                    tasks={filteredTasks}
                    projects={projects}
                    users={users}
                    onTaskClick={(task) => {
                        setSelectedTask(task);
                        setIsModalOpen(true);
                    }}
                    onTaskDrop={handleTaskDrop}
                />
            )}

            {/* TASK DETAIL MODAL */}
            {selectedTask && (
                <TaskDetailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    task={selectedTask}
                    users={users}
                    projectId={selectedTask?.projectId}
                    onUpdate={() => { }}
                />
            )}
        </div>
    );
}


// KANBAN COMPONENT
function GlobalKanban({ tasks, projects, users, onTaskClick, onTaskDrop }: {
    tasks: any[],
    projects: Record<string, any>,
    users: any[],
    onTaskClick: (task: any) => void,
    onTaskDrop: (taskId: string, status: string) => void
}) {
    const columns = [
        { id: 'TODO', label: 'To Do', color: 'bg-zinc-500', aliases: ['pending'] },
        { id: 'ACTIVE', label: 'Active', color: 'bg-blue-500', aliases: ['in_progress', 'active'] },
        { id: 'REVIEW', label: 'Review', color: 'bg-purple-500', aliases: ['review'] },
        { id: 'DONE', label: 'Done', color: 'bg-green-500', aliases: ['completed', 'done'] }
    ];

    const getColumnTasks = (statusId: string, aliases: string[]) => {
        return tasks.filter(t => t.status === statusId || aliases.includes(t.status));
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) {
            onTaskDrop(taskId, status);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)] overflow-x-auto pb-4">
            {columns.map(col => {
                const colTasks = getColumnTasks(col.id, col.aliases || []);
                return (
                    <div
                        key={col.id}
                        className="flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden min-w-[280px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header */}
                        <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between bg-zinc-900/50`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${col.color.replace('bg-', 'text-')}`}>
                                {col.label}
                            </h3>
                            <span className="text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full text-zinc-400">
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Task List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {colTasks.map(task => {
                                const project = projects[task.projectId];
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => onTaskClick(task)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        className="cursor-grab active:cursor-grabbing"
                                    >
                                        <TaskItem
                                            task={task}
                                            projectId={task.projectId}
                                            users={users}
                                            viewMode="card"
                                            showProjectBadge={true}
                                            projectName={project?.title || "Unknown"}
                                            onClick={(t) => onTaskClick(t)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
