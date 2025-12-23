import { useState, useMemo, useEffect } from "react";
import { Plus, Search, LayoutGrid, List as ListIcon, Clock, CheckCircle, Hash, AlertOctagon } from "lucide-react";
import { TaskItem } from "../../components/ui/TaskItem";
import { TaskDetailModal } from "../../components/TaskDetailModal";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";


interface OpsTabProps {
    project: any;
}

export function OpsTab({ project }: OpsTabProps) {
    // const { user } = useTitanAuth(); // unused
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [filter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // MODALS
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // DATA
    const [tasks, setTasks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]); // Fetch internally

    // FETCH USERS (OpsTab is self-sufficient now)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // FETCH TASKS
    useMemo(() => {
        if (!project?.id) return;
        const q = query(
            collection(db, "projects", project.id, "tasks"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [project?.id]);


    // FILTERING
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'all' || t.priority === filter;
            return matchesSearch && matchesFilter;
        });
    }, [tasks, searchQuery, filter]);


    // GROUPING (TRAFFIC LIGHT LOGIC)
    const taskGroups = useMemo(() => {
        const groups: Record<string, any[]> = {
            'TODO': [],
            'ACTIVE': [],
            'REVIEW': [],
            'DONE': []
        };

        filteredTasks.forEach(task => {
            // Normalize Status
            let statusKey = 'TODO';
            if (task.status === 'DONE' || task.status === 'completed') statusKey = 'DONE';
            else if (task.status === 'ACTIVE' || task.status === 'in_progress') statusKey = 'ACTIVE';
            else if (task.status === 'REVIEW' || task.status === 'review') statusKey = 'REVIEW';
            else statusKey = 'TODO'; // pending, etc

            if (groups[statusKey]) {
                groups[statusKey].push(task);
            } else {
                // Fallback
                groups['TODO'].push(task);
            }
        });

        return groups;
    }, [filteredTasks]);


    const getGroupIcon = (status: string) => {
        switch (status) {
            case 'DONE': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'ACTIVE': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
            case 'REVIEW': return <AlertOctagon className="w-4 h-4 text-purple-500" />;
            default: return <Hash className="w-4 h-4 text-zinc-500" />;
        }
    };

    const getGroupColor = (status: string) => {
        switch (status) {
            case 'DONE': return 'border-t-green-500/50 bg-green-500/5';
            case 'ACTIVE': return 'border-t-blue-500/50 bg-blue-500/5';
            case 'REVIEW': return 'border-t-purple-500/50 bg-purple-500/5';
            default: return 'border-t-zinc-500/50 bg-zinc-500/5';
        }
    };


    return (
        <div className="h-full flex flex-col space-y-6">

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search Mission Control..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-white/10 placeholder-zinc-700 font-medium transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <ListIcon className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Launch Mission
                </button>
            </div>

            {/* KANBAN / LIST VIEW */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-max px-2">
                    {Object.entries(taskGroups).map(([status, groupTasks]) => (
                        <div key={status} className="w-[22rem] flex flex-col gap-4">
                            {/* Column Header */}
                            <div className={`p-3 rounded-xl border border-white/5 flex items-center justify-between ${getGroupColor(status)}`}>
                                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-zinc-300">
                                    {getGroupIcon(status)}
                                    {status}
                                </div>
                                <span className="text-[10px] font-black opacity-50 bg-black/20 px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                            </div>

                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar pb-10">
                                {groupTasks.map((task: any) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className={`
                                    transition-all duration-300 rounded-xl
                                    ${task.isDelayed ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)] ring-1 ring-red-500/50' : ''} 
                                    ${task.isOnHold ? 'opacity-40 hover:opacity-100 grayscale' : ''}
                                `}
                                    >
                                        <TaskItem
                                            task={task}
                                            users={users}
                                            projectId={project.id}
                                            viewMode={viewMode}
                                            onClick={() => setSelectedTask(task)}
                                        />
                                    </div>
                                ))}
                                {groupTasks.length === 0 && (
                                    <div className="h-24 rounded-2xl border border-dashed border-white/5 flex items-center justify-center text-xs text-zinc-700 italic">
                                        No Missions
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CREATE MODAL */}
            <TaskDetailModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                users={users}
                projectId={project.id}
                mode="create"
                onUpdate={() => { }}
            />

            {/* EDIT MODAL */}
            {selectedTask && (
                <TaskDetailModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                    users={users}
                    projectId={project.id}
                    mode="edit"
                    onUpdate={() => { }}
                />
            )}

        </div>
    );
}
