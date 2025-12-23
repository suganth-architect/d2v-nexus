import { useState, useMemo } from "react";
import { format, addDays, subDays, eachDayOfInterval, isSameDay, parseISO, isValid, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Layers, Briefcase } from "lucide-react";

interface ModernCalendarProps {
    tasks: any[];
    projects?: Record<string, any>; // For Global View coloring/names
    grouping?: 'project' | 'stage' | 'none'; // How to group rows
    onTaskClick?: (task: any) => void;
}

export function ModernCalendar({ tasks, projects = {}, grouping = 'project', onTaskClick }: ModernCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [daysToShow] = useState(14); // 2 Weeks default view

    // Generate Date Range
    const startDate = subDays(currentDate, 2); // Start a bit before today
    const endDate = addDays(startDate, daysToShow);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // 1. GROUP TASKS
    const groupedTasks = useMemo(() => {
        const groups: Record<string, any[]> = {};

        tasks.forEach(task => {
            let groupKey = 'uncategorized';
            if (grouping === 'project') {
                groupKey = task.projectId || 'uncategorized';
            } else if (grouping === 'stage') {
                groupKey = task.status || 'uncategorized'; // Or phaseId if available
            }

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(task);
        });

        return groups;
    }, [tasks, grouping]);

    // Helper: Status Colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-zinc-500 border-zinc-400';
            case 'in_progress': return 'bg-blue-500 border-blue-400';
            case 'completed': return 'bg-green-500 border-green-400';
            case 'delayed': return 'bg-red-500 border-red-400';
            case 'on_hold': return 'bg-orange-500 border-orange-400';
            default: return 'bg-zinc-600 border-zinc-500';
        }
    };

    // Helper: Position Task Bar
    // We need to find the left offset (days from start) and width (duration in days)
    const getTaskStyle = (task: any) => {
        const taskStart = task.startDate ? parseISO(task.startDate) : (task.createdAt?.toDate ? task.createdAt.toDate() : new Date());
        const taskEnd = task.endDate ? parseISO(task.endDate) : taskStart;

        if (!isValid(taskStart) || !isValid(taskEnd)) return { display: 'none' };

        // Calculate visual start (clamped to view)
        // Actually, for a scrolling timeline, we want absolute positioning relative to the grid start

        let startDiff = differenceInDays(taskStart, startDate);
        let duration = differenceInDays(taskEnd, taskStart) + 1;

        // Visual clamping handled via overflow hidden in parent, but we can clamp logic if needed.
        // Let's just render them relative to the 14 day window. 
        // If task is outside window entirely?
        if (differenceInDays(taskEnd, startDate) < 0 || differenceInDays(taskStart, endDate) > 0) {
            return { display: 'none' };
        }

        const COLUMN_WIDTH = 60; // px per day

        return {
            left: `${startDiff * COLUMN_WIDTH}px`,
            width: `${Math.max(duration, 1) * COLUMN_WIDTH}px`
        };
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                        <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white transition-colors">Today</button>
                        <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-yellow-500" />
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                </div>

                <div className="flex gap-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Done</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Delayed</span>
                </div>
            </div>

            {/* TIMELINE BODY */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">

                {/* 1. Header Row (Dates) */}
                <div className="flex sticky top-0 z-20 bg-zinc-900/95 backdrop-blur border-b border-white/5 min-w-max">
                    {/* Empty Corner */}
                    <div className="w-[200px] sticky left-0 z-30 bg-zinc-900 border-r border-white/5 p-3 text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                        {grouping === 'project' ? 'Projects' : 'Stages'}
                    </div>

                    {/* Days */}
                    {dateRange.map(day => (
                        <div
                            key={day.toISOString()}
                            className={`w-[60px] flex-shrink-0 text-center border-r border-white/5 p-2 flex flex-col items-center justify-center ${isSameDay(day, new Date()) ? 'bg-yellow-500/10' : ''}`}
                        >
                            <span className="text-[10px] text-zinc-500 uppercase">{format(day, 'EEE')}</span>
                            <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-yellow-500' : 'text-white'}`}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* 2. Groups & Rows */}
                <div className="min-w-max">
                    {Object.keys(groupedTasks).map(groupKey => {
                        const groupTasks = groupedTasks[groupKey];
                        const groupTitle = grouping === 'project'
                            ? (projects[groupKey]?.title || 'Unknown Project')
                            : groupKey.replace('_', ' ').toUpperCase();

                        return (
                            <div key={groupKey} className="group">
                                {/* Row Container */}
                                <div className="flex relative min-h-[60px] border-b border-white/5 hover:bg-white/[0.02] transition-colors">

                                    {/* Row Header (Sticky Left) */}
                                    <div className="w-[200px] sticky left-0 z-10 bg-[#09090b] border-r border-white/5 p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                                            {grouping === 'project' ? <Briefcase className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-white truncate" title={groupTitle}>{groupTitle}</div>
                                            <div className="text-[10px] text-zinc-500">{groupTasks.length} tasks</div>
                                        </div>
                                    </div>

                                    {/* Grid Cells Background */}
                                    <div className="flex absolute inset-0 pl-[200px] pointer-events-none">
                                        {dateRange.map(day => (
                                            <div
                                                key={`grid-${day.toISOString()}`}
                                                className={`w-[60px] flex-shrink-0 border-r border-white/5 h-full ${isSameDay(day, new Date()) ? 'bg-yellow-500/5' : ''}`}
                                            />
                                        ))}
                                    </div>

                                    {/* Task Bars Layer */}
                                    <div className="flex-1 relative h-full py-3" style={{ width: `${dateRange.length * 60}px` }}>
                                        {groupTasks.map(task => {
                                            const style = getTaskStyle(task);
                                            // Stack bars vertically if multiple? 
                                            // Simple version: Just overlap or simple logic. 
                                            // For "God Tier", we often want lanes. 
                                            // Let's settle for a simple horizontal flow for now.
                                            // If precise scheduling is needed, we'd need a row per task. 
                                            // Let's try to fit them in the row, but if they overlap, they might overlap.

                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => onTaskClick && onTaskClick(task)}
                                                    className={`
                                                        absolute h-8 rounded-full flex items-center px-3 border backdrop-blur-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-sm z-10
                                                        ${getStatusColor(task.status)} bg-opacity-20
                                                    `}
                                                    style={style}
                                                    title={`${task.title} (${task.status})`}
                                                >
                                                    <div className="flex items-center gap-2 max-w-full">
                                                        {/* Avatar */}
                                                        <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-[8px] font-bold text-white/80 shrink-0">
                                                            {task.assignedTo ? 'U' : '?'}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-white truncate">{task.title}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
