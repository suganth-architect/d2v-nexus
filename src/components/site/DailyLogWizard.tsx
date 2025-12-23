import { useState, useEffect } from "react";
import { X, ChevronRight, CheckCircle2, AlertTriangle, ShieldCheck, Sun, CloudRain, Clock } from "lucide-react";
import { LaborCounter } from "./LaborCounter";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { Task, InventoryItem, DailyLog } from "../../types";

interface DailyLogWizardProps {
    projectId: string;
    userId: string;
    userName: string;
    onClose: () => void;
    mode: 'morning' | 'evening';
}

export function DailyLogWizard({ projectId, userId, userName, onClose, mode }: DailyLogWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);

    // Data
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [morningPlan, setMorningPlan] = useState<Task[]>([]); // For Evening
    const [criticalInventory, setCriticalInventory] = useState<InventoryItem[]>([]);

    // Form State
    const [labor, setLabor] = useState({ mason: 0, helper: 0, carpenter: 0 });
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]); // Morning: Planned, Evening: Completed
    const [inventoryChecks, setInventoryChecks] = useState<string[]>([]);
    const [weather, setWeather] = useState("Sunny");

    useEffect(() => {
        loadData();
    }, [projectId, mode]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Inventory (Client side filter for < minLevel)
            const qInv = query(collection(db, "projects", projectId, "inventory"));
            const invSnap = await getDocs(qInv);
            const items = invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
            setCriticalInventory(items.filter(i => (i.quantity || 0) < (i.minLevel || 0)));

            if (mode === 'morning') {
                // Fetch All Active Tasks
                const qTasks = query(collection(db, "projects", projectId, "tasks"), where("status", "in", ["pending", "in_progress", "delayed"]));
                const taskSnap = await getDocs(qTasks);
                const tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                setActiveTasks(tasks);
            } else {
                // EVENING: Fetch Morning Log to see what was planned
                const today = new Date().toISOString().split('T')[0];
                const qLog = query(collection(db, "projects", projectId, "daily_logs"), where("date", "==", today), where("type", "==", "morning"));
                const logSnap = await getDocs(qLog);

                if (!logSnap.empty) {
                    const morningLog = logSnap.docs[0].data() as DailyLog;
                    if (morningLog.plannedTasks && morningLog.plannedTasks.length > 0) {
                        // Fetch specific tasks
                        // Firestore 'in' limit is 10. If > 10, separate queries. 
                        // Simplified: Fetch all active and filter in memory since we don't have getDocsByIds helper ready
                        const qTasks = query(collection(db, "projects", projectId, "tasks"));
                        const taskSnap = await getDocs(qTasks);
                        const allTasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                        setMorningPlan(allTasks.filter(t => morningLog.plannedTasks.includes(t.id)));
                    }
                    // Load labor from morning as default?
                    if (morningLog.labor) {
                        setLabor({ ...morningLog.labor as any });
                    }
                } else {
                    // Fallback if no morning log
                    const qTasks = query(collection(db, "projects", projectId, "tasks"), where("status", "==", "in_progress"));
                    const taskSnap = await getDocs(qTasks);
                    setMorningPlan(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            await addDoc(collection(db, "projects", projectId, "daily_logs"), {
                date: new Date().toISOString().split('T')[0],
                labor,
                inventoryCheck: {
                    itemsChecked: inventoryChecks,
                    criticalItems: criticalInventory.map(i => i.id)
                },
                plannedTasks: mode === 'morning' ? selectedTasks : [],
                completedTasks: mode === 'evening' ? selectedTasks : [], // IDs of completed tasks
                status: mode === 'morning' ? 'open' : 'submitted',
                createdAt: serverTimestamp(),
                submittedBy: userId,
                submittedByName: userName,
                weather,
                type: mode
            });

            if (mode === 'evening') {
                // Update Tasks to Completed
                const updatePromises = selectedTasks.map(tid =>
                    updateDoc(doc(db, "projects", projectId, "tasks", tid), {
                        status: 'completed',
                        completedAt: serverTimestamp(),
                        completedBy: userId
                    })
                );
                await Promise.all(updatePromises);
                alert("Day Ended. Good work!");
            } else {
                alert("Good Morning! Let's build.");
            }

            onClose();
        } catch (e) {
            console.error("Submission error", e);
            alert("Failed to submit log.");
        }
    };

    if (loading) return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-zinc-500 animate-pulse">Loading Protocol...</div>;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {mode === 'morning' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Clock className="w-5 h-5 text-purple-500" />}
                        {mode === 'morning' ? 'Morning Protocol' : 'Evening Checkout'}
                    </h2>
                    <p className="text-xs text-zinc-500">Step {step} of 3</p>
                </div>
                <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-400">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* STEP 1: LABOR */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                                {mode === 'morning' ? 'Who is on site?' : 'Final Headcount'}
                            </h3>
                            <p className="text-zinc-500">{mode === 'morning' ? "Log today's strength." : "Confirm today's labor."}</p>
                        </div>

                        <LaborCounter counts={labor} onChange={(k, v) => setLabor(prev => ({ ...prev, [k]: v }))} />

                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                            <label className="block text-xs font-medium text-zinc-400 mb-3">Weather Condition</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setWeather("Sunny")}
                                    className={`p-3 rounded-lg border flex items-center gap-2 justify-center transition-all ${weather === 'Sunny' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-zinc-800 text-zinc-500'}`}
                                >
                                    <Sun className="w-4 h-4" /> Sunny
                                </button>
                                <button
                                    onClick={() => setWeather("Rainy")}
                                    className={`p-3 rounded-lg border flex items-center gap-2 justify-center transition-all ${weather === 'Rainy' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-zinc-800 text-zinc-500'}`}
                                >
                                    <CloudRain className="w-4 h-4" /> Rainy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: INVENTORY */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-red-400">
                                {mode === 'morning' ? 'Critical Stock' : 'Stock Check'}
                            </h3>
                            <p className="text-zinc-500">{mode === 'morning' ? 'Confirm readiness.' : 'Did we run out of anything?'}</p>
                        </div>

                        <div className="space-y-3">
                            {criticalInventory.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-green-500/50" />
                                    No critical items. Safe to proceed.
                                </div>
                            ) : (
                                criticalInventory.map(item => (
                                    <div key={item.id}
                                        onClick={() => setInventoryChecks(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${inventoryChecks.includes(item.id)
                                            ? 'bg-green-500/10 border-green-500/50'
                                            : 'bg-zinc-900/50 border-red-900/30'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium text-zinc-200">{item.itemName}</div>
                                            <div className="text-xs text-red-400">Qty: {item.quantity} (Min: {item.minLevel})</div>
                                        </div>
                                        {inventoryChecks.includes(item.id) ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: PLAN / RECONCILIATION */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-blue-400">
                                {mode === 'morning' ? "Today's Targets" : "Reconciliation"}
                            </h3>
                            <p className="text-zinc-500">{mode === 'morning' ? "Select what gets done today." : "What did we finish?"}</p>
                        </div>

                        <div className="space-y-3">
                            {mode === 'morning' ? (
                                // MORNING: SELECT PLAN
                                activeTasks.map(task => (
                                    <div key={task.id}
                                        onClick={() => setSelectedTasks(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedTasks.includes(task.id)
                                            ? 'bg-blue-600/20 border-blue-500'
                                            : 'bg-zinc-900 border-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="text-sm font-medium text-zinc-200">{task.title}</div>
                                            {selectedTasks.includes(task.id) && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1 uppercase">{task.status.replace('_', ' ')}</div>
                                    </div>
                                ))
                            ) : (
                                // EVENING: RECONCILE
                                morningPlan.length === 0 ? (
                                    <div className="text-zinc-500 text-center py-10">No tasks were planned for today.</div>
                                ) : (
                                    morningPlan.map(task => (
                                        <div key={task.id}
                                            onClick={() => setSelectedTasks(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedTasks.includes(task.id)
                                                ? 'bg-green-600/20 border-green-500'
                                                : 'bg-zinc-900 border-zinc-800 opacity-80'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="text-sm font-medium text-zinc-200">{task.title}</div>
                                                {selectedTasks.includes(task.id) ? (
                                                    <span className="text-xs font-bold bg-green-500 text-black px-2 py-1 rounded">DONE</span>
                                                ) : (
                                                    <span className="text-xs font-bold bg-zinc-800 text-zinc-500 px-2 py-1 rounded">NOT DONE</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>



            {/* Footer */}
            <div className={`p-4 bg-zinc-900 border-t border-zinc-800 pb-24`}>
                {step < 3 ? (
                    <button
                        onClick={() => setStep(s => s + 1)}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        Next Step <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-green-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        {mode === 'morning' ? 'Start Day' : 'End Day & Submit'}
                    </button>
                )}
            </div>
        </div >
    );
}
