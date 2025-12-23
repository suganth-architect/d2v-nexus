import { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { grantXP } from "../lib/gamification";
import { BananaButton } from "./ui/BananaButton";
import { MapPin, CheckCircle, History, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AttendanceWidget({ projectId }: { projectId?: string }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [checkedIn, setCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState("");

    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleCheckIn = () => {
        if (!user) return;
        setLoading(true);

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;

                // 1. Save Attendance Record
                await addDoc(collection(db, "attendance"), {
                    uid: user.uid,
                    projectId: projectId || "general",
                    timestamp: serverTimestamp(),
                    location: {
                        lat: latitude,
                        lng: longitude
                    },
                    type: "in"
                });

                // 2. Grant XP
                await grantXP(user.uid, 50, "Daily Check-in");

                // 3. Update UI
                setCheckedIn(true);
                setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            } catch (error: any) {
                console.error("Check-in failed:", error);
                alert("Check-in failed: " + error.message);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve location. Please allow location access.");
            setLoading(false);
        });
    };

    const fetchHistory = async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            // Note: In a real app we might want to filter by user.uid if normal user, or all if founder.
            // For now, let's just query ALL for simplicity (HR View) or we can just view our own.
            // User request implies "view history" on the widget.
            const q = query(
                collection(db, "attendance"),
                orderBy("timestamp", "desc"),
                limit(20)
            );
            const snap = await getDocs(q);
            setHistoryLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Failed to fetch history", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    if (checkedIn) {
        return (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-white font-bold text-lg">Checked In!</h3>
                <p className="text-green-400 text-sm">at {checkInTime}</p>
                <div className="mt-2 text-xs text-zinc-500 font-mono">+50 XP Earned</div>

                <button
                    onClick={() => setShowHistory(true)}
                    className="mt-4 text-xs text-zinc-400 hover:text-white underline"
                >
                    View History
                </button>

                {/* History Modal (Mounted here to preserve state if checked in) */}
                {showHistory && <HistoryModal onClose={() => setShowHistory(false)} logs={historyLogs} loading={loadingHistory} />}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center relative">
            <button
                onClick={() => setShowHistory(true)}
                className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300"
                title="View History"
            >
                <History className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Daily Attendance</h3>
            <p className="text-zinc-500 text-sm mb-4">Check in to earn XP & track hours.</p>

            <BananaButton
                onClick={handleCheckIn}
                isLoading={loading}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black border-none"
            >
                📍 Check In Now
            </BananaButton>

            {showHistory && <HistoryModal onClose={() => setShowHistory(false)} logs={historyLogs} loading={loadingHistory} />}
        </div>
    );
}

function HistoryModal({ onClose, logs, loading }: { onClose: () => void, logs: any[], loading: boolean }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white">Attendance Log (Recent)</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center text-zinc-500 py-4">Loading records...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-zinc-500 py-4">No records found.</div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                                <div>
                                    <div className="text-sm font-bold text-zinc-200">
                                        {log.type === 'in' ? 'Checked In' : 'Checked Out'}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : 'Unknown time'}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-600 font-mono">
                                    {log.location ? `${log.location.lat.toFixed(4)}, ${log.location.lng.toFixed(4)}` : 'No Loc'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
