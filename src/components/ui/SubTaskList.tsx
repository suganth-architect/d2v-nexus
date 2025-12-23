import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Plus, Check, X } from "lucide-react";

interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

interface SubTaskListProps {
    taskId: string;
    projectId: string;
    subtasks?: SubTask[];
    readOnly?: boolean;
}

export function SubTaskList({ taskId, projectId, subtasks = [], readOnly = false }: SubTaskListProps) {
    const [localSubtasks, setLocalSubtasks] = useState<SubTask[]>(subtasks);
    const [newItem, setNewItem] = useState("");
    const [progress, setProgress] = useState(0);

    // Sync props to local state
    useEffect(() => {
        setLocalSubtasks(subtasks || []);
    }, [subtasks]);

    // Calculate Progress
    useEffect(() => {
        if (localSubtasks.length === 0) {
            setProgress(0);
        } else {
            const completedCount = localSubtasks.filter(t => t.completed).length;
            setProgress(Math.round((completedCount / localSubtasks.length) * 100));
        }
    }, [localSubtasks]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim() || readOnly) return;

        const newSubtask: SubTask = {
            id: Date.now().toString(),
            title: newItem.trim(),
            completed: false
        };

        // Optimistic Update
        const updatedList = [...localSubtasks, newSubtask];
        setLocalSubtasks(updatedList);
        setNewItem("");

        try {
            const taskRef = doc(db, "projects", projectId, "tasks", taskId);
            await updateDoc(taskRef, {
                subtasks: updatedList
            });
        } catch (error) {
            console.error("Failed to add subtask", error);
            // Revert on failure (optional, simplistic here)
            setLocalSubtasks(localSubtasks);
        }
    };

    const toggleComplete = async (id: string) => {
        if (readOnly) return;

        const updatedList = localSubtasks.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        setLocalSubtasks(updatedList);

        try {
            const taskRef = doc(db, "projects", projectId, "tasks", taskId);
            await updateDoc(taskRef, {
                subtasks: updatedList
            });
        } catch (error) {
            console.error("Failed to toggle subtask", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (readOnly) return;

        const updatedList = localSubtasks.filter(t => t.id !== id);
        setLocalSubtasks(updatedList);

        try {
            const taskRef = doc(db, "projects", projectId, "tasks", taskId);
            await updateDoc(taskRef, {
                subtasks: updatedList
            });
        } catch (error) {
            console.error("Failed to delete subtask", error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Progress */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider text-zinc-500">
                    <span>Execution Steps</span>
                    <span>{progress}% Ready</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {localSubtasks.map(step => (
                    <div
                        key={step.id}
                        className={`group flex items-center gap-3 p-2 rounded-lg border transition-all ${step.completed ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    >
                        <button
                            onClick={() => toggleComplete(step.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${step.completed ? 'bg-green-500 border-green-500 text-black' : 'border-zinc-600 hover:border-zinc-400'}`}
                        >
                            {step.completed && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <span className={`flex-1 text-sm ${step.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                            {step.title}
                        </span>

                        {!readOnly && (
                            <button
                                onClick={() => handleDelete(step.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            {!readOnly && (
                <form onSubmit={handleAdd} className="relative">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Add a step..."
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newItem.trim()}
                        className="absolute right-1 top-1 p-1 bg-zinc-800 hover:bg-white text-zinc-400 hover:text-black rounded transition-colors disabled:opacity-0"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </form>
            )}
        </div>
    );
}
