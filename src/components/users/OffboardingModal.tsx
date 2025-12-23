import { useState, useEffect } from "react";
import { X, AlertTriangle, ArrowRightLeft, Archive, CheckCircle2, UserX } from "lucide-react";
import { collectionGroup, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../ui/BananaButton";

interface OffboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToOffboard: any;
    onOffboardComplete: () => void;
}

export function OffboardingModal({ isOpen, onClose, userToOffboard, onOffboardComplete }: OffboardingModalProps) {
    const [step, setStep] = useState<'scan' | 'transfer' | 'confirm'>('scan');
    const [loading, setLoading] = useState(false);

    // Scan Results
    const [activeTasks, setActiveTasks] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // Transfer Target
    const [targetUserId, setTargetUserId] = useState("");
    const [activeUsers, setActiveUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen || !userToOffboard) return;
        scanUserResponsibilites();
        fetchActiveUsers();
    }, [isOpen, userToOffboard]);

    const scanUserResponsibilites = async () => {
        setLoading(true);
        try {
            // 1. Active Tasks
            const qTasks = query(
                collectionGroup(db, "tasks"),
                where("assignedTo", "==", userToOffboard.uid),
                where("status", "!=", "done") // Assuming 'done' or 'completed'
            );
            const taskSnap = await getDocs(qTasks);
            // Filter locally for exact status mismatch if needed, but != done is good start
            const tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data(), ref: d.ref }));

            // 2. Pending Material Requests
            const qMat = query(
                collectionGroup(db, "material_requests"),
                where("requestedBy", "==", userToOffboard.uid),
                where("status", "==", "requested")
            );
            const matSnap = await getDocs(qMat);
            const requests = matSnap.docs.map(d => ({ id: d.id, ...d.data(), ref: d.ref }));

            setActiveTasks(tasks);
            setPendingRequests(requests);

            setStep('scan'); // Default
        } catch (error) {
            console.error("Scan failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveUsers = async () => {
        const q = query(collectionGroup(db, "users"), where("status", "==", "active"));
        const snap = await getDocs(q);
        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter((u: any) => u.uid !== userToOffboard.uid);
        setActiveUsers(users);
    };

    const handleTransferAndArchive = async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);

            // 1. Transfer Tasks
            activeTasks.forEach(task => {
                batch.update(task.ref, {
                    assignedTo: targetUserId,
                    transferredFrom: userToOffboard.uid,
                    updatedAt: new Date()
                });
            });

            // 2. Transfer Requests (Updated 'requestedBy' or maybe just leave them? 
            // Usually we want to know who ORIGINALLY requested, but if they are gone, who handles follow up?
            // "Transfer Responsibilities" => Maybe we don't change requestedBy but we ensure notifications go to new person?
            // For now, let's update requestedBy so the new person sees them in their 'My Requests' if that exists.)
            pendingRequests.forEach(req => {
                batch.update(req.ref, {
                    requestedBy: targetUserId,
                    originalRequester: userToOffboard.uid,
                    updatedAt: new Date()
                });
            });

            // 3. Archive User
            const userRef = doc(db, "users", userToOffboard.uid);
            batch.update(userRef, {
                status: 'archived',
                archivedAt: new Date(),
                responsibilitiesTransferredTo: targetUserId
            });

            await batch.commit();

            onOffboardComplete();
            onClose();

        } catch (error) {
            console.error("Offboard execution failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-red-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-red-500/20 bg-red-500/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                            <UserX className="w-6 h-6" />
                            Offboarding Protocol
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                            Deactivating <span className="text-white font-bold">{userToOffboard.displayName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {loading && step === 'scan' ? (
                        <div className="text-center py-10">
                            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-zinc-400">Scanning neural pathways for active links...</p>
                        </div>
                    ) : (
                        <>
                            {/* Report Card */}
                            <div className="bg-zinc-950 rounded-xl p-4 border border-white/5 space-y-3">
                                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Active Responsibilities</h3>
                                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><CheckCircle2 className="w-4 h-4" /></div>
                                        <div className="text-sm text-zinc-300">Active Tasks</div>
                                    </div>
                                    <div className="font-bold text-white font-mono">{activeTasks.length}</div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Archive className="w-4 h-4" /></div>
                                        <div className="text-sm text-zinc-300">Pending Requests</div>
                                    </div>
                                    <div className="font-bold text-white font-mono">{pendingRequests.length}</div>
                                </div>
                            </div>

                            {/* Action Area */}
                            {(activeTasks.length > 0 || pendingRequests.length > 0) && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-red-500">Dependencies Detected</h4>
                                            <p className="text-xs text-zinc-400 mt-1">You must transfer these items to another user before archiving.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Transfer Responsibilities To</label>
                                        <select
                                            value={targetUserId}
                                            onChange={e => setTargetUserId(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                                        >
                                            <option value="">Select Heir...</option>
                                            {activeUsers.map(u => (
                                                <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTasks.length === 0 && pendingRequests.length === 0 && (
                                <div className="flex items-center gap-2 text-green-500 text-sm justify-center p-2 bg-green-500/10 rounded-lg">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Clean Slate. Ready to Archive.</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <BananaButton
                        onClick={handleTransferAndArchive}
                        disabled={loading || ((activeTasks.length > 0 || pendingRequests.length > 0) && !targetUserId)}
                        variant="danger"
                    >
                        {loading ? "Processing..." : "Execute Offboarding"}
                        <ArrowRightLeft className="w-4 h-4 ml-2" />
                    </BananaButton>
                </div>
            </div>
        </div>
    );
}
