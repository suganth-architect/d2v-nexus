import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { differenceInDays, format } from "date-fns";
import { Calendar, Save, X } from "lucide-react";

interface ProjectTimelineProps {
    project: any;
    projectId: string;
    isEditable?: boolean;
}

export function ProjectTimeline({ project, projectId, isEditable = false }: ProjectTimelineProps) {
    const [editMode, setEditMode] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [handoverDate, setHandoverDate] = useState("");

    // Derived state for display
    const hasDates = project.startDate && project.handoverDate;

    // Timeline Calculations
    let timeProgress = 0;
    let daysElapsed = 0;
    let totalDays = 0;
    let daysLeft = 0;

    if (hasDates) {
        const start = project.startDate.seconds ? new Date(project.startDate.seconds * 1000) : new Date(project.startDate);
        const end = project.handoverDate.seconds ? new Date(project.handoverDate.seconds * 1000) : new Date(project.handoverDate);
        const now = new Date();

        totalDays = differenceInDays(end, start);
        daysElapsed = differenceInDays(now, start);
        daysLeft = differenceInDays(end, now);

        if (totalDays > 0) {
            timeProgress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 100);
        }
    }

    const handleSave = async () => {
        if (!startDate || !handoverDate) return;
        try {
            const ref = doc(db, "projects", projectId);
            await updateDoc(ref, {
                startDate: new Date(startDate).toISOString(), // Storing as ISO string for simplicity, or could be Timestamp
                handoverDate: new Date(handoverDate).toISOString()
            });
            setEditMode(false);
        } catch (error) {
            console.error("Failed to update timeline", error);
            alert("Failed to update timeline");
        }
    };

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-zinc-400 font-bold">Project Timeline</h3>
                {isEditable && !editMode && (
                    <button
                        onClick={() => {
                            // Initialize inputs
                            const s = hasDates ? (project.startDate.seconds ? new Date(project.startDate.seconds * 1000) : new Date(project.startDate)) : new Date();
                            const e = hasDates ? (project.handoverDate.seconds ? new Date(project.handoverDate.seconds * 1000) : new Date(project.handoverDate)) : new Date();
                            setStartDate(s.toISOString().split('T')[0]);
                            setHandoverDate(e.toISOString().split('T')[0]);
                            setEditMode(true);
                        }}
                        className="text-xs text-yellow-500 hover:text-yellow-400 font-mono border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 rounded"
                    >
                        EDIT TIMELINE
                    </button>
                )}
            </div>

            {editMode ? (
                <div className="bg-zinc-900/50 border border-yellow-500/30 rounded-2xl p-6 ring-1 ring-yellow-500/20">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-yellow-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Handover Date</label>
                            <input
                                type="date"
                                value={handoverDate}
                                onChange={(e) => setHandoverDate(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-yellow-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setEditMode(false)}
                            className="px-3 py-1.5 rounded text-xs font-bold uppercase text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700"
                        >
                            <X className="w-4 h-4" /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1.5 rounded text-xs font-bold uppercase bg-yellow-500 text-black hover:bg-yellow-400 flex items-center gap-1"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </button>
                    </div>
                </div>
            ) : hasDates ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                    {/* Background Grid Lines (Decoration) */}
                    <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-10">
                        <div className="w-px h-full bg-white"></div>
                        <div className="w-px h-full bg-white"></div>
                        <div className="w-px h-full bg-white"></div>
                        <div className="w-px h-full bg-white"></div>
                        <div className="w-px h-full bg-white"></div>
                    </div>

                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <div>
                            <div className="text-2xl font-bold text-white font-mono">{Math.round(timeProgress)}%</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Elapsed</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-white font-mono">{Math.max(daysLeft, 0)}</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Days Remaining</div>
                        </div>
                    </div>

                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden relative z-10 border border-white/5">
                        <div
                            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out relative"
                            style={{ width: `${timeProgress}%` }}
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50"></div>
                        </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-600 mt-3 uppercase font-bold relative z-10 font-mono">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(project.startDate.seconds ? new Date(project.startDate.seconds * 1000) : new Date(project.startDate), 'dd MMM yyyy')}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(project.handoverDate.seconds ? new Date(project.handoverDate.seconds * 1000) : new Date(project.handoverDate), 'dd MMM yyyy')}</span>
                    </div>
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                    <p className="text-zinc-500 mb-2">Timeline data unavailable.</p>
                    {isEditable ? (
                        <button
                            onClick={() => {
                                setStartDate(new Date().toISOString().split('T')[0]);
                                setHandoverDate(new Date().toISOString().split('T')[0]);
                                setEditMode(true);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                            Set Dates
                        </button>
                    ) : (
                        <p className="text-xs text-zinc-600">Please ask PM to set dates.</p>
                    )}
                </div>
            )}
        </div>
    );
}
