import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import type { AttendanceRecord } from "../../types";
import { BananaButton } from "../ui/BananaButton";
import { MapPin, Clock, UserCheck, UserX } from "lucide-react";

export function AttendanceTab() {
    const { user: currentUser } = useAuth();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    // 1. STABLE REAL-TIME SUBSCRIPTION
    useEffect(() => {
        const q = query(
            collection(db, "attendance"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as AttendanceRecord));
            setRecords(data);
        }, (error) => {
            console.error("Attendance Sync Error:", error);
        });

        return () => unsub();
    }, []);

    // 2. UNIFIED CHECK-IN LOGIC
    const handleAttendance = async (type: 'in' | 'out') => {
        if (!currentUser) {
            alert("You must be logged in to record attendance.");
            return;
        }

        setLoading(true);
        try {
            const newRecord: Partial<AttendanceRecord> = {
                uid: currentUser.uid,
                userName: currentUser.displayName || "Anonymous Team Member",
                type: type,
                timestamp: serverTimestamp(),
                locationName: "Primary Site Office", // Default for now
            };

            await addDoc(collection(db, "attendance"), newRecord);
            console.log(`Attendance ${type} recorded successfully.`);
        } catch (err) {
            console.error("Critical Attendance Failure:", err);
            alert("Failed to record attendance. Please check connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            {/* Action Header */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 bg-zinc-900/50 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-500" /> Site Check-In
                    </h3>
                    <p className="text-zinc-400 text-sm">Log your daily presence and sync with the mission timeline.</p>
                </div>
                <div className="flex gap-3">
                    <BananaButton
                        onClick={() => handleAttendance('in')}
                        disabled={loading}
                        className="flex-1 sm:flex-none shadow-lg shadow-yellow-500/10"
                    >
                        <UserCheck className="w-4 h-4 mr-2" /> Check In
                    </BananaButton>
                    <BananaButton
                        onClick={() => handleAttendance('out')}
                        variant="secondary"
                        disabled={loading}
                        className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800"
                    >
                        <UserX className="w-4 h-4 mr-2" /> Check Out
                    </BananaButton>
                </div>
            </div>

            {/* Attendance Feed */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Recent Activity</h4>
                <div className="grid gap-3">
                    {records.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                            <p className="text-zinc-500">No attendance logs found for this period.</p>
                        </div>
                    ) : (
                        records.map((rec) => (
                            <div key={rec.id} className="group flex justify-between items-center p-4 bg-zinc-900/30 hover:bg-zinc-800/50 rounded-xl border border-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${rec.type === 'in' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                        {rec.type === 'in' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold group-hover:text-yellow-500 transition-colors">{rec.userName}</p>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-zinc-600" /> {rec.locationName}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold uppercase mb-1 ${rec.type === 'in' ? 'bg-green-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                        {rec.type === 'in' ? 'Signed In' : 'Signed Out'}
                                    </div>
                                    <p className="text-xs font-mono text-zinc-400">
                                        {rec.timestamp?.toDate ? rec.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "---"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
