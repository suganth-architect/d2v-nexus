import { useState, useEffect } from "react";
import { X, User as UserIcon, CheckCircle, Trash2, AlertCircle, Clock, MessageSquare, Paperclip, Package, LayoutList, GripVertical, AlertOctagon, Hash, Star } from "lucide-react";
import { doc, updateDoc, deleteDoc, collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { BananaButton } from "./ui/BananaButton";
import { SubTaskList } from "./ui/SubTaskList";
import { TaskComments } from "./ui/TaskComments";
import { FilePickerModal } from "./dashboard/FilePickerModal";
import { TaskMaterialModal } from "./dashboard/TaskMaterialModal";
import { logActivity } from "../lib/logger";

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: any; // Optional for creation mode
    users: any[];
    projectId?: string;
    onUpdate?: () => void;
    mode?: 'create' | 'edit'; // NEW
    initialValues?: {
        status?: string;
        priority?: string;
        type?: string;
    };
}

export function TaskDetailModal({ isOpen, onClose, task, users, projectId, onUpdate, mode = 'edit', initialValues }: TaskDetailModalProps) {
    // Core State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("TODO"); // Default TODO
    const [priority, setPriority] = useState("medium");
    const [type, setType] = useState("GENERAL"); // NEW Type
    const [assignedTo, setAssignedTo] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [xpReward, setXpReward] = useState(50);

    // Flags
    const [isDelayed, setIsDelayed] = useState(false);
    const [delayReason, setDelayReason] = useState("");
    const [isEmergency, setIsEmergency] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'materials'>('chat');
    const [isSaving, setIsSaving] = useState(false);
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);

    // Additional Data State (for embedded views)
    const [materials, setMaterials] = useState<any[]>([]);

    const activeProjectId = task?.projectId || projectId;

    // --- EFFECT: SYNC TASK DATA or RESET ---
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && task) {
                setTitle(task.title || "");
                setDescription(task.description || "");
                setStatus(task.status || "TODO");
                setPriority(task.priority || "medium");
                setType(task.type || "GENERAL");
                setAssignedTo(task.assignedTo || "");
                setXpReward(task.xpReward || 50);
                setIsDelayed(task.isDelayed || false);
                setDelayReason(task.delayReason || "");
                setIsEmergency(task.isEmergency || false);
                setIsOnHold(task.isOnHold || false);

                const toDateString = (val: any) => {
                    if (!val) return "";
                    if (typeof val === 'string') return val.split('T')[0];
                    if (val.toDate) return format(val.toDate(), 'yyyy-MM-dd');
                    if (val instanceof Date) return format(val, 'yyyy-MM-dd');
                    return "";
                };

                setStartDate(toDateString(task.startDate));
                setEndDate(toDateString(task.endDate));
            } else if (mode === 'create') {
                // RESET FOR CREATE
                setTitle("");
                setDescription("");
                setStatus(initialValues?.status || "TODO");
                setPriority(initialValues?.priority || "medium");
                setType(initialValues?.type || "GENERAL");
                setAssignedTo("");
                setStartDate("");
                setEndDate("");
                setEndDate("");
                setXpReward(50);
                setIsDelayed(false);
                setDelayReason("");
                setIsEmergency(false);
                setIsOnHold(false);
            }
        }
    }, [task, isOpen, mode, initialValues]);


    // --- EFFECT: FETCH MATERIALS (Only in Edit Mode) ---
    useEffect(() => {
        if (!isOpen || !task?.id || activeTab !== 'materials') return;

        const q = query(
            collection(db, "projects", activeProjectId, "material_requests"),
            where("taskId", "==", task.id),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [isOpen, task?.id, activeTab, activeProjectId]);


    if (!isOpen) return null;


    // --- HANDLERS ---

    const handleSave = async (silent = false) => {
        if (!title.trim()) {
            if (!silent) alert("Mission Title is required.");
            return;
        }

        if (!silent) setIsSaving(true);
        try {
            const data: any = {
                title,
                description,
                status,
                priority,
                type,
                assignedTo,
                startDate: startDate ? startDate : null,
                endDate: endDate ? endDate : null,
                xpReward: Number(xpReward),
                isDelayed,
                delayReason: isDelayed ? delayReason : null,
                isEmergency,
                isOnHold
            };

            if (mode === 'edit' && task) {
                const taskRef = doc(db, "projects", activeProjectId, "tasks", task.id);
                await updateDoc(taskRef, data);
            } else {
                // CREATE MODE
                data.projectId = activeProjectId;
                data.createdAt = serverTimestamp();
                data.createdBy = "user"; // Should get actual user ID
                data.requiresMaterial = false;
                data.commentCount = 0;

                await addDoc(collection(db, "projects", activeProjectId, "tasks"), data);

                // Trigger Stats (Hotfix)
                if (priority === 'critical') {
                    import("../lib/statsWorker").then(({ incrementStat }) => {
                        incrementStat(activeProjectId, 'stats.criticalHotfixes', 1);
                        incrementStat(activeProjectId, 'stats.totalTasks', 1);
                    });
                } else {
                    import("../lib/statsWorker").then(({ incrementStat }) => {
                        incrementStat(activeProjectId, 'stats.totalTasks', 1);
                    });
                }
            }

            if (onUpdate) onUpdate();
            if (!silent) onClose();
        } catch (error) {
            console.error("Error saving task:", error);
            if (!silent) alert("Failed to save mission.");
        } finally {
            if (!silent) setIsSaving(false);
        }
    };

    const handleAutoSave = () => {
        if (mode === 'edit') handleSave(true);
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this mission?")) return;
        setIsSaving(true);
        try {
            const taskRef = doc(db, "projects", activeProjectId, "tasks", task.id);
            await deleteDoc(taskRef);
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error("Error deleting task:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkComplete = async () => {
        if (mode === 'create') return;
        setIsSaving(true);
        try {
            const taskRef = doc(db, "projects", activeProjectId, "tasks", task.id);
            await updateDoc(taskRef, {
                status: 'DONE',
                completedAt: new Date(),
            });
            setStatus('DONE');

            await logActivity(activeProjectId, 'task', `Task Completed: ${title}`, {
                taskId: task.id,
                priority: priority
            });

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error completing task:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const onFileSelected = async (url: string) => {
        if (mode === 'create') {
            alert("Save the task first before attaching files.");
            return;
        }
        try {
            const taskRef = doc(db, `projects/${activeProjectId}/tasks`, task.id);
            await updateDoc(taskRef, { attachedFileUrl: url });
            setShowFilePicker(false);
        } catch (error) {
            console.error("Attach failed", error);
        }
    }

    const handleToggleDelay = () => {
        if (!isDelayed) {
            // TURNING ON
            const reason = prompt("Reason for delay?");
            if (reason === null) return; // Cancelled

            const isCrit = confirm("Is this a critical/emergency delay?");

            setIsDelayed(true);
            setDelayReason(reason);
            setStatus('ACTIVE'); // Enforce Active

            if (isCrit) {
                setPriority('critical');
                setIsEmergency(true);
            }

            // Auto save after state updates might need a useEffect or just call save manually after a timeout, 
            // but handleAutoSave relies on state. simplified:
            setTimeout(() => handleSave(true), 100);
        } else {
            // TURNING OFF
            setIsDelayed(false);
            setDelayReason("");
            setIsEmergency(false);
            setTimeout(() => handleSave(true), 100);
        }
    };


    // --- STYLES ---

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'DONE': return 'bg-green-500 text-black border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
            case 'ACTIVE': return 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.3)]';
            case 'REVIEW': return 'bg-purple-500 text-white border-purple-400';
            case 'TODO': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* CONTAINER */}
            <div className={`
                w-full max-w-5xl h-[85vh] bg-[#09090b] border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500
                ${status === 'DONE' ? 'border-green-500/30' : priority === 'critical' ? 'border-red-500/30' : 'border-white/10'}
            `}>

                {/* --- HEADER --- */}
                <div className="flex-none p-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md flex items-start gap-4">
                    {/* Status Pill (Interactive) */}
                    <div className="relative group">
                        <select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); handleAutoSave(); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            <option value="TODO">To Do</option>
                            <option value="ACTIVE">Active</option>
                            <option value="REVIEW">Review</option>
                            <option value="DONE">Done</option>
                        </select>
                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${getStatusStyle(status)}`}>
                            {status === 'DONE' && <CheckCircle className="w-4 h-4" />}
                            {status === 'ACTIVE' && <Clock className="w-4 h-4 animate-pulse" />}
                            {status === 'REVIEW' && <AlertOctagon className="w-4 h-4" />}
                            {status === 'TODO' && <Hash className="w-4 h-4" />}
                            {status}
                        </div>
                    </div>

                    {/* Title & Priority */}
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            {/* Priority Dot */}
                            {(priority === 'critical' || priority === 'high') && (
                                <div className={`w-3 h-3 rounded-full animate-pulse ${priority === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`} />
                            )}
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleAutoSave}
                                className="w-full bg-transparent text-2xl font-bold text-white placeholder-zinc-600 focus:outline-none focus:ring-0 border-none p-0"
                                placeholder={mode === 'create' ? "New Mission Title..." : "Task Title"}
                                autoFocus={mode === 'create'}
                            />
                        </div>

                        {/* Meta Row */}
                        <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                            <select
                                value={priority}
                                onChange={(e) => { setPriority(e.target.value); handleAutoSave(); }}
                                className="bg-transparent text-xs font-bold uppercase tracking-wide border-none outline-none cursor-pointer hover:text-white"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="critical">Critical</option>
                            </select>

                            <select
                                value={type}
                                onChange={(e) => { setType(e.target.value); handleAutoSave(); }}
                                className="bg-transparent text-xs font-bold uppercase tracking-wide border-none outline-none cursor-pointer hover:text-white"
                            >
                                <option value="GENERAL">General</option>
                                <option value="DESIGN">Design</option>
                                <option value="BUILD">Build</option>
                                <option value="PROCUREMENT">Procurement</option>
                            </select>

                            {activeProjectId && <span className="uppercase tracking-wide opacity-50">Project ID: {activeProjectId.slice(0, 4)}</span>}
                        </div>
                    </div>

                    {/* Close */}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>


                {/* --- BODY Grid --- */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

                    {/* LEFT COL: EXECUTION (60%) */}
                    <div className="lg:col-span-7 flex flex-col border-r border-white/5 overflow-y-auto p-6 space-y-8 no-scrollbar bg-black/20">

                        {/* Description */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <LayoutList className="w-3 h-3" /> Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleAutoSave}
                                placeholder="Detailed mission specs..."
                                className="w-full h-32 bg-transparent border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                            />
                        </div>

                        {/* Dates & Flags */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); handleAutoSave(); }}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Due Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); handleAutoSave(); }}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status Flags</label>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleToggleDelay}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${isDelayed ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <AlertCircle className="w-3 h-3" /> {isDelayed ? 'Delayed' : 'Report Delay'}
                                    </button>
                                    {isDelayed && delayReason && (
                                        <div className="text-[10px] text-red-400 pl-2 border-l border-red-500/20 italic">
                                            "{delayReason}"
                                        </div>
                                    )}
                                    <button
                                        onClick={() => { setIsOnHold(!isOnHold); handleAutoSave(); }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${isOnHold ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <Clock className="w-3 h-3" /> {isOnHold ? 'On Hold' : 'Place on Hold'}
                                    </button>
                                </div>
                                <div className="pt-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">XP Reward</label>
                                    <div className="flex items-center gap-2">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        <input
                                            type="number"
                                            value={xpReward}
                                            onChange={(e) => { setXpReward(parseInt(e.target.value)); handleAutoSave(); }}
                                            className="bg-transparent border-b border-zinc-700 w-16 text-sm text-white text-center focus:border-yellow-500 outline-none"
                                        />
                                        <span className="text-xs text-zinc-500">XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUB-TASK ENGINE (Only Edit Mode) */}
                        {mode === 'edit' && task && (
                            <div className="pt-4 border-t border-white/5">
                                <SubTaskList
                                    taskId={task.id}
                                    projectId={activeProjectId}
                                    subtasks={task.subtasks}
                                />
                            </div>
                        )}
                    </div>


                    {/* RIGHT COL: CONTEXT (40%) */}
                    <div className="lg:col-span-5 flex flex-col bg-zinc-900/20">

                        {/* Top Context Panel */}
                        <div className="p-6 border-b border-white/5 space-y-4">
                            {/* Assignee Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <UserIcon className="w-3 h-3" /> Owner
                                </label>
                                <div className="relative group">
                                    <select
                                        value={assignedTo}
                                        onChange={(e) => { setAssignedTo(e.target.value); handleAutoSave(); }}
                                        className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:border-blue-500/50 outline-none appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABS HEADER */}
                        <div className="flex items-center border-b border-white/5 px-2">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'chat' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <MessageSquare className="w-3 h-3" /> Chat
                            </button>
                            <button
                                onClick={() => setActiveTab('files')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'files' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Paperclip className="w-3 h-3" /> Files
                            </button>
                            <button
                                onClick={() => setActiveTab('materials')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'materials' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Package className="w-3 h-3" /> Items
                            </button>
                        </div>

                        {/* TAB CONTENT (Scrollable) */}
                        <div className="flex-1 overflow-hidden relative bg-black/20">

                            {mode === 'create' ? (
                                <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-zinc-600">
                                    <div>
                                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="text-sm">Create the mission to access Chat, Files, and Material Request modules.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* CHAT TAB */}
                                    {activeTab === 'chat' && (
                                        <div className="absolute inset-0 pb-16">
                                            <TaskComments taskId={task.id} projectId={activeProjectId} />
                                        </div>
                                    )}

                                    {/* FILES TAB */}
                                    {activeTab === 'files' && (
                                        <div className="absolute inset-0 p-6 overflow-y-auto">
                                            <div className="space-y-4">
                                                <BananaButton onClick={() => setShowFilePicker(true)} className="w-full">
                                                    <Paperclip className="w-4 h-4 mr-2" />
                                                    Attach Document
                                                </BananaButton>

                                                {task.attachedFileUrl ? (
                                                    <div className="group relative aspect-video bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center">
                                                        {task.attachedFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || task.attachedFileUrl.startsWith('data:image') ? (
                                                            <img src={task.attachedFileUrl} alt="Attachment" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2 text-zinc-500">
                                                                <Paperclip className="w-12 h-12" />
                                                                <span className="text-xs uppercase font-bold">Document Attached</span>
                                                            </div>
                                                        )}

                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <a
                                                                href={task.attachedFileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200"
                                                            >
                                                                View
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-10 text-zinc-600 italic text-xs">
                                                        No files attached.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* MATERIALS TAB */}
                                    {activeTab === 'materials' && (
                                        <div className="absolute inset-0 overflow-y-auto p-4 animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase">Required Items</h3>
                                                <BananaButton onClick={() => setShowMaterialModal(true)}>
                                                    <Package className="w-4 h-4 mr-2" />
                                                    Request Item
                                                </BananaButton>
                                            </div>

                                            <div className="space-y-2">
                                                {materials.map(mat => (
                                                    <div key={mat.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-bold text-zinc-200">{mat.name}</div>
                                                            <div className="text-[10px] text-zinc-500">{mat.quantity} {mat.unit} • {mat.status}</div>
                                                        </div>
                                                        {mat.priority === 'urgent' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                    </div>
                                                ))}
                                                {materials.length === 0 && <div className="text-xs text-zinc-600 text-center py-4">No requests pending.</div>}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>


                {/* --- FOOTER --- */}
                <div className="flex-none p-4 border-t border-white/5 bg-zinc-950 flex items-center justify-between">
                    {mode === 'edit' ? (
                        <>
                            <button
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Mission
                            </button>

                            <div className="flex gap-2">
                                {status !== 'DONE' && (
                                    <BananaButton onClick={handleMarkComplete} disabled={isSaving}>
                                        <CheckCircle className="w-4 h-4" />
                                        Mark Complete
                                    </BananaButton>
                                )}
                            </div>
                        </>
                    ) : (
                        // CREATE MODE FOOTER
                        <div className="flex justify-between w-full">
                            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs font-bold uppercase transition-colors">
                                Cancel
                            </button>
                            <BananaButton
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className={`px-8 ${priority === 'critical' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                            >
                                {priority === 'critical' ? '🔥 DEPLOY HOTFIX' : '🚀 Launch Mission'}
                            </BananaButton>
                        </div>
                    )}
                </div>

            </div>

            {/* MODALS OVERLAY */}
            <FilePickerModal
                isOpen={showFilePicker}
                onClose={() => setShowFilePicker(false)}
                onSelect={onFileSelected}
                projectId={activeProjectId}
            />

            {mode === 'edit' && task && (
                <TaskMaterialModal
                    isOpen={showMaterialModal}
                    onClose={() => setShowMaterialModal(false)}
                    taskId={task.id}
                    projectId={activeProjectId}
                    taskTitle={task.title}
                />
            )}
        </div>
    );
}
