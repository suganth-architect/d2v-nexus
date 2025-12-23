import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { Briefcase, Clock, HardHat, Hammer, Zap, Truck, AlertTriangle, Plus, DollarSign } from "lucide-react";
import { BananaButton } from "../../components/ui/BananaButton";
import { BananaCard } from "../../components/ui/BananaCard";
import type { Task } from "../../types";

export function PartnerPortal() {
    const { projectId } = useParams();
    const { user, profile } = useTitanAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Fetch Tasks Assigned to Me
    useEffect(() => {
        if (!user || !projectId) return;
        const q = query(
            collection(db, "projects", projectId, "tasks"),
            where("assignedTo", "==", user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[]);
        });
        return () => unsubscribe();
    }, [user, projectId]);

    const handleRequestResource = async (resource: string) => {
        if (!projectId || !user) return;
        try {
            await addDoc(collection(db, "projects", projectId, "site_requests"), {
                requestType: resource,
                requestedBy: user.uid,
                requestedByName: profile?.name || "Contractor",
                status: 'pending',
                timestamp: serverTimestamp()
            });
            setShowResourceModal(false);
            alert("Request Sent to Site Engineer!");
        } catch (e) {
            console.error(e);
            alert("Failed to send request.");
        }
    };

    const handleReportWork = async (amount: number, notes: string) => {
        if (!projectId || !user || !selectedTask) return;
        try {
            await addDoc(collection(db, "projects", projectId, "payment_claims"), {
                taskId: selectedTask.id,
                taskTitle: selectedTask.title,
                contractorId: user.uid,
                amountClaimed: amount,
                notes,
                status: 'pending_verification',
                timestamp: serverTimestamp()
            });
            setShowPaymentModal(false);
            setSelectedTask(null);
            alert("Work Reported! Payment Request Created.");
        } catch (e) {
            console.error(e);
            alert("Failed to report work.");
        }
    }

    // Helper for Status Display
    const getStatusDisplay = (task: Task) => {
        if (task.isDelayed || (task.status as string) === 'delayed') return 'DELAYED';
        if (task.isOnHold || (task.status as string) === 'on_hold') return 'ON HOLD';
        return task.status.replace('_', ' ');
    }

    return (
        <div className="min-h-screen bg-black text-yellow-500 font-sans selection:bg-yellow-500/30">
            {/* Header */}
            <header className="p-6 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xl">
                        {profile?.name?.[0] || "C"}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">{profile?.companyName || "Partner Portal"}</h1>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            ACTIVE ON SITE
                        </div>
                    </div>
                </div>
                <BananaButton variant="ghost" className="text-sm" onClick={() => navigate('/login')}>Logout</BananaButton>
            </header>

            {/* Main Content */}
            <main className="p-6 max-w-4xl mx-auto space-y-8 pb-32">

                {/* Stats / Welcome */}
                <div className="grid grid-cols-2 gap-4">
                    <BananaCard className="bg-zinc-900/50 border-yellow-500/20">
                        <div className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Pending Tasks</div>
                        <div className="text-3xl font-mono text-white">{tasks.filter(t => t.status !== 'DONE' && (t.status as string) !== 'completed').length}</div>
                    </BananaCard>
                    <BananaCard className="bg-zinc-900/50 border-yellow-500/20">
                        <div className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Claims</div>
                        <div className="text-3xl font-mono text-white">0</div>
                    </BananaCard>
                </div>

                {/* My Tasks */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-yellow-500" />
                        My Assignments
                    </h2>
                    <div className="space-y-4">
                        {tasks.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600">
                                No tasks assigned to you. Enjoy the break! ☕
                            </div>
                        ) : tasks.map(task => (
                            <BananaCard key={task.id} className="group relative border-l-4 border-l-yellow-500 pl-6 hover:bg-zinc-900 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-zinc-200 group-hover:text-yellow-500 transition-colors">
                                            {task.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2 text-zinc-500 text-xs">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due Soon</span>
                                            <span className={`px-2 py-0.5 rounded-full border ${task.status === 'DONE' || (task.status as string) === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-zinc-700 bg-zinc-800'}`}>
                                                {getStatusDisplay(task)}
                                            </span>
                                        </div>
                                    </div>
                                    <BananaButton
                                        variant="ghost"
                                        onClick={() => { setSelectedTask(task); setShowPaymentModal(true); }}
                                    >
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        Report Work
                                    </BananaButton>
                                </div>
                            </BananaCard>
                        ))}
                    </div>
                </section>
            </main>

            {/* FAB: Request Resource */}
            <button
                onClick={() => setShowResourceModal(true)}
                className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-yellow-500 text-black shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-black/50 backdrop-blur-xl"
            >
                <HardHat className="w-8 h-8" />
            </button>

            {/* RESOURCE MODAL */}
            {showResourceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                        <button onClick={() => setShowResourceModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><Plus className="rotate-45" /></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <AlertTriangle className="text-yellow-500" />
                            Request Support
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { name: "Scaffolding", icon: Hammer },
                                { name: "Ladder", icon: HardHat }, // Using HardHat as placeholder for Ladder not in Lucide standard set sometimes, or just generic
                                { name: "Electrician", icon: Zap },
                                { name: "Material Move", icon: Truck },
                                { name: "Water/Power", icon: Zap },
                            ].map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => handleRequestResource(item.name)}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-zinc-400 hover:text-yellow-500 gap-2"
                                >
                                    <item.icon className="w-6 h-6" />
                                    <span className="text-xs font-medium">{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT/WORK REPORT MODAL */}
            {showPaymentModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button onClick={() => { setShowPaymentModal(false); setSelectedTask(null); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><Plus className="rotate-45" /></button>
                        <h2 className="text-xl font-bold text-white mb-2">Report Work Done</h2>
                        <p className="text-zinc-500 text-sm mb-6">For task: <span className="text-yellow-500">{selectedTask.title}</span></p>

                        <PaymentClaimForm onSubmit={handleReportWork} />
                    </div>
                </div>
            )}
        </div>
    );
}

function PaymentClaimForm({ onSubmit }: { onSubmit: (amount: number, notes: string) => void }) {
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Amount to Claim (INR)</label>
                <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none font-mono text-lg"
                    placeholder="0.00"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Work Notes / Quantity</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none h-24 text-sm"
                    placeholder="e.g. Completed 500 sqft of flooring..."
                />
            </div>
            <BananaButton className="w-full mt-2" onClick={() => onSubmit(Number(amount), notes)}>
                Submit Claim
            </BananaButton>
        </div>
    )
}
