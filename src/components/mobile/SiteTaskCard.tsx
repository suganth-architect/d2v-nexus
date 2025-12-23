import { useState } from "react";
import type { Task } from "../../types";
import {
    FileText,
    Box,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    MapPin
} from "lucide-react";

interface SiteTaskCardProps {
    task: Task;
    materialRequestCount?: number;
    onComplete: (task: Task) => void;
    onDelay: (task: Task) => void;
    onViewDrawing: (url: string) => void;
}

export function SiteTaskCard({ task, materialRequestCount = 0, onComplete, onDelay, onViewDrawing }: SiteTaskCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isCritical = task.priority === 'critical';
    const isDelayed = task.isDelayed || false;
    const isCompleted = task.status === 'DONE' || (task.status as string) === 'completed';

    return (
        <div className={`
            rounded-2xl border transition-all overflow-hidden
            ${isCritical ? 'bg-red-950/10 border-red-900/40' : 'bg-zinc-900/60 border-zinc-800/60'}
            ${isDelayed ? 'border-amber-500/30 bg-amber-950/10' : ''}
        `}>
            {/* MAIN ROW */}
            <div className="p-4 flex gap-4">
                {/* CHECKBOX */}
                <button
                    onClick={() => onComplete(task)}
                    className={`
                        flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${isCompleted
                            ? 'bg-green-500 border-green-500 text-black'
                            : 'border-zinc-600 hover:border-green-500 hover:bg-green-500/10 text-transparent hover:text-green-500'}
                    `}
                >
                    <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                </button>

                <div className="flex-1 min-w-0">
                    {/* HEADER */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-semibold text-lg leading-tight ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {task.title}
                        </h3>
                        {task.priority === 'critical' && (
                            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse flex-shrink-0" />
                        )}
                    </div>

                    {/* META ROW */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {task.location && (
                            <span className="flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-950/50 px-2 py-1 rounded-md border border-zinc-800">
                                <MapPin className="w-3 h-3" />
                                {task.location}
                            </span>
                        )}

                        {materialRequestCount > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-950/30 px-2 py-1 rounded-md border border-blue-900/50">
                                <Box className="w-3 h-3" />
                                {materialRequestCount} Items
                            </span>
                        )}

                        {isDelayed && (
                            <span className="text-xs font-bold text-amber-500 bg-amber-950/30 px-2 py-1 rounded-md border border-amber-900/50">
                                DELAYED
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* EXPANDABLE SECTION */}
            <div className={`
                border-t border-zinc-800/50 bg-zinc-950/30
                transition-all duration-300 ease-in-out
                ${isExpanded || task.attachedFileUrl ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
            `}>
                <div className="p-4 space-y-4">
                    {/* DRAWING BUTTON */}
                    {task.attachedFileUrl && (
                        <button
                            onClick={() => onViewDrawing(task.attachedFileUrl!)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                        >
                            <FileText className="w-5 h-5" />
                            VIEW DRAWING
                        </button>
                    )}

                    {/* DESCRIPTION */}
                    {task.description && (
                        <div className="text-sm text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                            {task.description}
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex items-center border-t border-zinc-800/50 bg-zinc-900/20">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 py-3 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors flex items-center justify-center gap-1"
                >
                    {isExpanded ? (
                        <>Contract <ChevronUp className="w-3 h-3" /></>
                    ) : (
                        <>Details <ChevronDown className="w-3 h-3" /></>
                    )}
                </button>

                <div className="w-px h-full bg-zinc-800/50" />

                <button
                    onClick={() => onDelay(task)}
                    className="flex-1 py-3 text-xs font-bold text-red-500/80 hover:text-red-400 hover:bg-red-950/20 transition-colors flex items-center justify-center gap-1"
                >
                    <AlertTriangle className="w-3 h-3" />
                    DELAY
                </button>
            </div>
        </div>
    );
}
