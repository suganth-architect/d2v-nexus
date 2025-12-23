import { useEffect, useState } from "react";
import { doc, updateDoc, onSnapshot, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../../components/ui/BananaButton";
import { BananaCard } from "../../components/ui/BananaCard";
import { AlertCircle, Calendar, CheckCircle, PauseCircle, Archive } from "lucide-react";
import type { Project } from "../../types";

export function SettingsTab({ projectId }: { projectId: string }) {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [status, setStatus] = useState<string>('active');
    const [pausedReason, setPausedReason] = useState("");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [projectValue, setProjectValue] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "projects", projectId), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Project;
                setProject(data);
                setStatus(data.status);
                setPausedReason(data.pausedReason || "");
                // Prioritize 'totalContractValue', fallback to 'budget'/'projectValue'
                setProjectValue(data.totalContractValue?.toString() || data.budget?.toString() || data.projectValue?.toString() || "");

                // Handle Dates
                if (data.startDate) {
                    setDateRange(prev => ({ ...prev, start: new Date(data.startDate.toDate()).toISOString().split('T')[0] }));
                }
                if (data.handoverDate) {
                    setDateRange(prev => ({ ...prev, end: new Date(data.handoverDate.toDate()).toISOString().split('T')[0] }));
                }
            }
            setLoading(false);
        });
        return () => unsub();
    }, [projectId]);

    const handleSave = async () => {
        if (!project) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "projects", projectId), {
                status,
                pausedReason: status === 'paused' ? pausedReason : null,
                projectValue: Number(projectValue), // Keep legacy field for safety
                budget: Number(projectValue),       // Legacy
                totalContractValue: Number(projectValue), // MASTER FIELD
                startDate: dateRange.start ? new Date(dateRange.start) : null,
                handoverDate: dateRange.end ? new Date(dateRange.end) : null
            });

            // LOGGING: God View
            if (status !== project.status) {
                await addDoc(collection(db, "projects", projectId, "site_logs"), {
                    description: `Project Status changed to: ${status.toUpperCase()}`,
                    type: "admin",
                    createdAt: serverTimestamp(),
                    isPublic: true
                });
            }

            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    // Progress Calculation
    const calculateProgress = () => {
        if (!dateRange.start || !dateRange.end) return { percent: 0, daysElapsed: 0, totalDays: 0 };
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const now = new Date();

        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();

        const totalDays = Math.ceil(total / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.ceil(elapsed / (1000 * 60 * 60 * 24));

        let percent = (elapsed / total) * 100;
        percent = Math.max(0, Math.min(100, percent)); // Clamp 0-100

        return { percent, daysElapsed, totalDays };
    };

    const progress = calculateProgress();

    if (loading) return <div className="animate-pulse h-64 bg-zinc-900 rounded-xl"></div>;
    if (!project) return <div>Project not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Archive className="w-6 h-6 text-zinc-500" />
                Project Settings & Lifecycle
            </h2>

            {/* Lifecycle Control */}
            <BananaCard className="p-6 bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-4">Project Status</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-zinc-400 text-sm font-medium">Current State</label>
                        <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-800">
                            {['active', 'paused', 'completed', 'archived'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold uppercase transition-all ${status === s
                                        ? s === 'active' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                                            : s === 'paused' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                                : s === 'completed' ? 'bg-blue-500 text-black shadow-lg shadow-blue-500/20'
                                                    : 'bg-zinc-600 text-white'
                                        : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {status === 'paused' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-yellow-500 text-xs font-bold uppercase mb-1">Reason for Pause</label>
                                <input
                                    type="text"
                                    value={pausedReason}
                                    onChange={(e) => setPausedReason(e.target.value)}
                                    placeholder="e.g. Client Funding Issue, Monsoon Delay"
                                    className="w-full bg-zinc-950 border border-yellow-500/30 rounded-lg p-3 text-white focus:border-yellow-500 outline-none placeholder:text-zinc-700"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-zinc-800/50 flex flex-col justify-center items-center text-center">
                        {status === 'active' && (
                            <>
                                <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                                <p className="text-green-400 font-bold">Project is Live</p>
                                <p className="text-zinc-500 text-xs">Visible on Dashboard. Stats tracking enabled.</p>
                            </>
                        )}
                        {status === 'paused' && (
                            <>
                                <PauseCircle className="w-12 h-12 text-yellow-500 mb-2" />
                                <p className="text-yellow-400 font-bold">Project Frozen</p>
                                <p className="text-zinc-500 text-xs">Assets are frozen. Timeline alerts muted.</p>
                            </>
                        )}
                        {status === 'archived' && (
                            <>
                                <Archive className="w-12 h-12 text-zinc-500 mb-2" />
                                <p className="text-zinc-400 font-bold">Read Only Mode</p>
                                <p className="text-zinc-600 text-xs">Project is locked. No edits allowed.</p>
                            </>
                        )}
                        {status === 'completed' && (
                            <>
                                <CheckCircle className="w-12 h-12 text-blue-500 mb-2" />
                                <p className="text-blue-400 font-bold">Mission Accomplished</p>
                                <p className="text-zinc-500 text-xs">Project is complete. Final analytics locked.</p>
                            </>
                        )}
                    </div>
                </div>
            </BananaCard>

            {/* Timeline Control */}
            <BananaCard className="p-6 bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Timeline & Value</h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                        <Calendar className="w-3 h-3" />
                        Duration: {progress.totalDays ? `${progress.totalDays} Days` : 'N/A'}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase mb-1">Handover Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase mb-1">Total Contract Value (Budget)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-zinc-500">₹</span>
                            <input
                                type="number"
                                value={projectValue}
                                onChange={(e) => setProjectValue(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 pl-8 text-white focus:border-yellow-500 outline-none font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="bg-black/40 rounded-xl p-4 border border-zinc-800">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2">
                        <span>Day {progress.daysElapsed > 0 ? progress.daysElapsed : 0}</span>
                        <span>{progress.percent.toFixed(1)}% Elapsed</span>
                        <span>Day {progress.totalDays}</span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
                        <div
                            className={`h-full transition-all duration-1000 ${progress.percent > 90 ? 'bg-red-500' :
                                progress.percent > 75 ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                    {progress.percent > 100 && (
                        <div className="mt-2 flex items-center gap-2 text-red-400 text-xs font-bold">
                            <AlertCircle className="w-4 h-4" />
                            Project Overrun by {progress.daysElapsed - progress.totalDays} days
                        </div>
                    )}
                </div>
            </BananaCard>

            <div className="flex justify-between pt-4 items-center">
                <button
                    type="button"
                    onClick={async () => {
                        if (!confirm("Force resync task counts from database?")) return;
                        try {
                            const { getCountFromServer, collection } = await import("firebase/firestore");
                            const snapshot = await getCountFromServer(collection(db, "projects", projectId, "tasks"));
                            await updateDoc(doc(db, "projects", projectId), { taskCount: snapshot.data().count });
                            alert(`Synced! Count: ${snapshot.data().count}`);
                        } catch (e) {
                            console.error(e);
                            alert("Sync failed");
                        }
                    }}
                    className="text-xs text-zinc-500 hover:text-white underline"
                >
                    Force Resync Task Counts
                </button>

                <BananaButton onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                    {saving ? "Saving Changes..." : "Save Project Settings"}
                </BananaButton>
            </div>

            {/* SYSTEM MAINTENANCE ("The Healer") */}
            <SystemMaintenance />

            {/* DANGER ZONE ("The Purge") */}
            <DangerZone />
        </div>
    );
}

function SystemMaintenance() {
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    const handleGlobalSync = async () => {
        if (!confirm("⚠️ WARNING: This will recalculate stats for ALL projects in the system. accurate but expensive. Continue?")) return;

        setSyncing(true);
        setStatus("Initializing...");

        try {
            const { collection, getDocs } = await import("firebase/firestore");
            const { recalcProjectStats } = await import("../../lib/statsWorker");

            const snap = await getDocs(collection(db, "projects"));
            const total = snap.size;
            let current = 0;

            for (const doc of snap.docs) {
                setStatus(`Syncing ${doc.data().title}...`);
                await recalcProjectStats(doc.id);
                current++;
                setProgress((current / total) * 100);
            }

            setStatus("All Systems Operational.");
            setTimeout(() => {
                setSyncing(false);
                setStatus("");
                setProgress(0);
                alert("Global Stats Synced Successfully!");
            }, 1000);

        } catch (e) {
            console.error(e);
            setStatus("Error during sync.");
            alert("Sync Failed. Check console.");
            setSyncing(false);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-zinc-800">
            <h3 className="text-red-500 font-bold text-sm uppercase tracking-widest mb-4">System Maintenance (Zone 0)</h3>

            <BananaCard className="bg-red-500/5 border-red-500/20 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-white font-bold">Global Stats Synchronization</h4>
                        <p className="text-zinc-500 text-xs mt-1">
                            Recalculates denormalized counters (Tasks, Stock, RFIs) for ALL projects.
                            <br />Run this if Dashboard numbers look out of sync.
                        </p>
                    </div>
                    <BananaButton
                        onClick={handleGlobalSync}
                        disabled={syncing}
                        className="bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white"
                    >
                        {syncing ? "SYNCING..." : "⚡ Sync Global Stats"}
                    </BananaButton>
                </div>

                {syncing && (
                    <div className="space-y-2 animate-in fade-in">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                            <span>{status}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </BananaCard>
        </div>
    );
}

function DangerZone() {
    const [confirming, setConfirming] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [purging, setPurging] = useState(false);

    const handlePurge = async () => {
        if (confirmText !== "DELETE") return;

        setPurging(true);
        try {
            const { purgeOperationalData } = await import("../../lib/dataPurge");
            await purgeOperationalData();
            alert("💀 SYSTEM PURGED. RELOADING...");
            window.location.href = "/";
        } catch (e) {
            console.error(e);
            alert("Purge Failed. See console.");
            setPurging(false);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-red-900/30">
            <h3 className="text-red-600 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Danger Zone
            </h3>

            <BananaCard className="bg-red-950/10 border-red-900/50 p-6">
                {!confirming ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-red-500 font-bold">Purge Operational Data</h4>
                            <p className="text-red-900/60 text-xs mt-1">
                                Irreversibly deletes ALL Projects, Tasks, Inventory, and Logs.
                                <br />Users and Accounts are preserved.
                            </p>
                        </div>
                        <BananaButton
                            onClick={() => setConfirming(true)}
                            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-900/20"
                        >
                            💀 Purge All Data
                        </BananaButton>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-red-900/20 p-4 rounded-xl border border-red-900/50">
                            <h4 className="text-red-500 font-bold flex items-center gap-2 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                FINAL WARNING
                            </h4>
                            <p className="text-red-300 text-sm mb-4">
                                This action is <b>IRREVERSIBLE</b>. You are about to wipe the entire operational database.
                                <br />Type <b>DELETE</b> below to confirm.
                            </p>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type DELETE"
                                    className="flex-1 bg-black/50 border border-red-900/50 rounded-lg p-3 text-red-500 placeholder:text-red-900/50 focus:outline-none focus:border-red-500 font-bold tracking-widest"
                                    autoFocus
                                />
                                <BananaButton
                                    onClick={() => setConfirming(false)}
                                    variant="ghost"
                                    className="text-zinc-500 hover:text-white"
                                >
                                    Cancel
                                </BananaButton>
                                <BananaButton
                                    onClick={handlePurge}
                                    disabled={confirmText !== "DELETE" || purging}
                                    isLoading={purging}
                                    className="bg-red-600 hover:bg-red-700 text-white border-none min-w-[120px]"
                                >
                                    {purging ? "PURGING..." : "CONFIRM PURGE"}
                                </BananaButton>
                            </div>
                        </div>
                    </div>
                )}
            </BananaCard>
        </div>
    );
}
