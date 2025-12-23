import { motion, AnimatePresence } from "framer-motion";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useState } from "react";
import { Calendar, Check, MessageSquare, Paperclip, Package, AlertOctagon, AlertCircle } from "lucide-react";
import type { User } from "../../types";
import { TaskComments } from "./TaskComments";
import { FilePickerModal } from "../dashboard/FilePickerModal";

interface TaskItemProps {
    task: any;
    projectId: string;
    users: User[];
    isSelected?: boolean;
    readOnly?: boolean;
    showProjectBadge?: boolean;
    projectName?: string;
    viewMode?: 'row' | 'card' | 'list';
    onClick?: (task: any) => void;
}

export function TaskItem({ task, projectId, users, isSelected, readOnly, showProjectBadge, projectName, viewMode = 'row', onClick }: TaskItemProps) {
    const [showChat, setShowChat] = useState(false);
    const [showFilePicker, setShowFilePicker] = useState(false);

    const isCompleted = task.status === 'DONE';
    const isHotfix = task.priority === 'critical' || task.isEmergency;

    const cycleStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly) return;

        const statusOrder = ['TODO', 'ACTIVE', 'REVIEW', 'DONE'];
        const currentIdx = statusOrder.indexOf(task.status) !== -1 ? statusOrder.indexOf(task.status) : 0;
        const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];

        try {
            await updateDoc(doc(db, `projects/${projectId}/tasks`, task.id), {
                status: nextStatus
            });
        } catch (err) {
            console.error("Failed to cycle status", err);
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'DONE': return 'bg-green-500/20 text-green-500 border-green-500/50';
            case 'REVIEW': return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
            case 'ACTIVE': return 'bg-blue-500/20 text-blue-500 border-blue-500/50 animate-pulse';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'; // TODO
        }
    };

    const handleAssigneeChange = async (userId: string) => {
        try {
            await updateDoc(doc(db, `projects/${projectId}/tasks`, task.id), {
                assignedTo: userId
            });
        } catch (error) {
            console.error("Assign failed", error);
        }
    };

    const onFileSelected = async (url: string) => {
        try {
            await updateDoc(doc(db, `projects/${projectId}/tasks`, task.id), { attachedFileUrl: url });
            setShowFilePicker(false);
        } catch (error) {
            console.error("Attach failed", error);
            alert("Failed to attach file");
        }
    }

    // --- RENDER HELPERS ---
    const assignee = users.find(u => u.uid === task.assignedTo);
    const assigneeInitial = assignee?.displayName ? assignee.displayName[0] : "?";

    // Fallback Colors for avatars
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const colorIndex = assignee?.uid ? assignee.uid.charCodeAt(0) % colors.length : 0;
    const fallbackColor = colors[colorIndex];


    if (viewMode === 'card') {
        return (
            <>
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, a, input, select, .no-modal-open')) return;
                        if (onClick) onClick(task);
                    }}
                    className={`
                    group relative bg-[#09090b] border border-white/10 rounded-xl hover:border-white/20 transition-all cursor-pointer overflow-hidden p-5 flex flex-col space-y-3
                    ${isSelected ? 'bg-yellow-500/10 border-yellow-500/50' : ''}
                    ${isCompleted ? 'opacity-60 grayscale' : ''}
                    ${isHotfix ? 'border-red-500/30 bg-red-500/5' : ''}
                `}
                >
                    {/* Header / Title Row */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                {task.priority === 'critical' && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                                {task.type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                                        {task.type}
                                    </span>
                                )}
                                {/* Material Traffic Light Dot */}
                                {task.requiresMaterial && (
                                    <div
                                        className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] transition-colors
                                    ${task.materialStatus === 'on_site' ? 'text-green-500 bg-green-500' :
                                                task.materialStatus === 'ordered' ? 'text-yellow-500 bg-yellow-500' :
                                                    'text-red-500 bg-red-500'}
                                    `}
                                        title={`Material Status: ${task.materialStatus || 'Requested'}`}
                                    />
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors leading-tight line-clamp-2">
                                {task.title}
                            </h3>
                        </div>

                        {/* XP BADGE */}
                        <div className="flex-none flex flex-col items-end gap-1">
                            <div className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                +{task.xpReward || 50} XP
                            </div>

                            {/* STATUS BADGE (CLICKABLE) */}
                            <button
                                onClick={cycleStatus}
                                className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getStatusColor(task.status)} hover:brightness-125 transition-all`}
                            >
                                {task.status || 'TODO'}
                            </button>
                        </div>

                        {/* Avatar */}

                        {/* Avatar */}
                        <div className="flex-none relative group/avatar">
                            {assignee?.photoURL ? (
                                <img
                                    src={assignee.photoURL}
                                    alt="Assignee"
                                    className="w-8 h-8 rounded-full border border-black/50 object-cover shadow-sm bg-zinc-800"
                                />
                            ) : (
                                <div className={`w-8 h-8 rounded-full border border-black/50 flex items-center justify-center text-xs font-bold text-white shadow-sm ${fallbackColor}`}>
                                    {assigneeInitial}
                                </div>
                            )}

                            {/* Inline Assignee Select (Hidden) */}
                            {!readOnly && (
                                <select
                                    value={task.assignedTo || ""}
                                    onChange={(e) => { e.stopPropagation(); handleAssigneeChange(e.target.value); }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Footer: Meta & Actions */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center gap-2">
                            {showProjectBadge && (
                                <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wide">
                                    {projectName || projectId.slice(0, 3)}
                                </span>
                            )}
                            {task.endDate && (
                                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${new Date(task.endDate) < new Date() && !isCompleted ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-zinc-500 border-white/5 bg-zinc-900'}`}>
                                    <Calendar className="w-2.5 h-2.5" />
                                    {new Date(task.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {task.commentCount > 0 && (
                                <div className="flex items-center gap-0.5 text-[9px] text-zinc-500">
                                    <MessageSquare className="w-3 h-3" /> {task.commentCount}
                                </div>
                            )}
                            {task.attachedFileUrl && <Paperclip className="w-3 h-3 text-purple-400/70" />}
                            {task.requiresMaterial && <Package className="w-3 h-3 text-orange-400/70" />}
                        </div>
                    </div>

                </motion.div>
                {/* Modals outside motion div to prevent layout issues */}
            </>
        );
    }

    // ROW / LIST MODE (Simplified for Global View or other lists)
    return (
        <div
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a, input, select')) return;
                if (onClick) onClick(task);
            }}
            className={`
                group relative grid grid-cols-12 items-center gap-4 p-3 rounded-xl border border-white/5 transition-all cursor-pointer
                ${isSelected ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black/20 hover:bg-zinc-900/40 hover:border-white/10'}
                ${isCompleted ? 'opacity-50' : ''}
            `}
        >
            {/* Status / Check */}
            <div className="col-span-1 flex justify-center">
                <button
                    onClick={cycleStatus}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-green-500 border-green-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                >
                    {isCompleted && <Check className="w-3.5 h-3.5 text-black" />}
                </button>
            </div>

            {/* Title */}
            <div className="col-span-6 md:col-span-5 flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    {task.priority === 'critical' && <AlertOctagon className="w-3 h-3 text-red-500" />}
                    <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    {showProjectBadge && <span>{projectName || projectId.slice(0, 4)}</span>}
                    {task.phase && <span>• {task.phase}</span>}
                </div>
            </div>

            {/* Assignee */}
            <div className="col-span-2 hidden md:flex justify-center">
                {assignee?.photoURL ? (
                    <img src={assignee.photoURL} className="w-6 h-6 rounded-full border border-white/10" />
                ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${fallbackColor}`}>
                        {assigneeInitial}
                    </div>
                )}
            </div>

            {/* Date */}
            <div className="col-span-3 md:col-span-2 text-right">
                <span className="text-xs text-zinc-500 font-mono">
                    {task.endDate ? new Date(task.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                </span>
            </div>

            {/* Right Actions */}
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowChat(true); }}
                    className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-white"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </button>
            </div>


            {/* Attachments Logic */}
            <FilePickerModal
                isOpen={showFilePicker}
                onClose={() => setShowFilePicker(false)}
                onSelect={onFileSelected}
                projectId={projectId}
            />

            <AnimatePresence>
                {showChat && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur" onClick={(e) => { e.stopPropagation(); setShowChat(false) }}>
                        <div className="w-[400px] h-[500px] bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <TaskComments taskId={task.id} projectId={projectId} onClose={() => setShowChat(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
