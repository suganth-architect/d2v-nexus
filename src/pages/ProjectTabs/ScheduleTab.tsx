import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ModernCalendar } from "../../components/ModernCalendar";
import { TaskDetailModal } from "../../components/TaskDetailModal";
import type { Task } from "../../types";

interface ScheduleTabProps {
    projectId: string;
}

export function ScheduleTab({ projectId }: ScheduleTabProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]); // For modal

    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // 1. Fetch Users (for Modal assignment)
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        });

        // 2. Fetch Tasks
        const qTasks = query(
            collection(db, "projects", projectId, "tasks"),
            orderBy("startDate", "asc") // Optional sorting
        );
        const unsubTasks = onSnapshot(qTasks, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), projectId } as unknown as Task));
            setTasks(fetched);
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubTasks();
        };
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
                    <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Loading Timeline...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-200px)]">
            <ModernCalendar
                tasks={tasks}
                grouping="stage"
                onTaskClick={(task) => {
                    setSelectedTask(task);
                    setIsModalOpen(true);
                }}
            />

            <TaskDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                task={selectedTask}
                users={users}
                projectId={projectId}
            />
        </div>
    );
}
