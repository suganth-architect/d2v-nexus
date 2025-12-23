import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, LogOut, Bell, MapPin, X, Target, Home } from "lucide-react";
import { cn } from "../lib/cn";
import { auth, db } from "../lib/firebase";
import { onSnapshot, doc, collection, query, orderBy, addDoc, serverTimestamp, limit, where } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { NotificationCenter } from "./NotificationCenter";
import type { Notification } from "../types";
import { grantXP } from "../lib/gamification";
import { startOfDay } from "date-fns";
import { BananaButton } from "./ui/BananaButton";
import { CommandLauncher } from "./CommandLauncher";
import { useTitanAuth } from "../hooks/useTitanAuth";

export function NanoDock() {
    const location = useLocation();
    const { user } = useAuth();
    const [xpData, setXpData] = useState({ currentXP: 0, level: 1 });
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showLauncher, setShowLauncher] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // HR State
    const [attendanceStatus, setAttendanceStatus] = useState<'in' | 'out' | 'loading'>('loading');
    const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
    const [isHrLoading, setIsHrLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        // XP Listener
        const unsubXP = onSnapshot(doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setXpData({
                    currentXP: data.currentXP || 0,
                    level: data.level || 1
                });
            }
        });

        // Notifications Listener
        const q = query(
            collection(db, `users/${user.uid}/notifications`),
            orderBy('timestamp', 'desc')
        );
        const unsubNotes = onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notes);
            setUnreadCount(notes.filter(n => !n.read).length);
        });

        // Attendance Status Listener (Today's latest)
        const todayStart = startOfDay(new Date());

        const qAttendance = query(
            collection(db, "attendance"),
            where("uid", "==", user.uid),
            where("timestamp", ">=", todayStart),
            orderBy("timestamp", "desc"),
            limit(1)
        );

        const unsubAttendance = onSnapshot(qAttendance, (snap) => {
            if (!snap.empty) {
                const latest = snap.docs[0].data();
                setAttendanceStatus(latest.type);
            } else {
                setAttendanceStatus('out'); // Default to out if no record today
            }
        });

        return () => {
            unsubXP();
            unsubNotes();
            unsubAttendance();
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            window.location.href = "/";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    // --- HR LOGIC ---

    const getLocationName = async (lat: number, lon: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            return data.address?.suburb || data.address?.city || data.address?.town || data.display_name?.split(',')[0] || "Unknown Location";
        } catch (e) {
            console.error("Geocoding failed", e);
            return "Unknown Location";
        }
    };

    const handleHrClick = () => {
        if (attendanceStatus === 'loading') return;

        if (attendanceStatus === 'out') {
            performCheckIn();
        } else {
            setCheckOutModalOpen(true);
        }
    };

    const performCheckIn = () => {
        if (!user) return;
        setIsHrLoading(true);

        if (!navigator.geolocation) {
            alert("Geolocation supported needed for check-in.");
            setIsHrLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const locationName = await getLocationName(latitude, longitude);

                await addDoc(collection(db, "attendance"), {
                    uid: user.uid,
                    timestamp: serverTimestamp(),
                    type: 'in',
                    location: { lat: latitude, lng: longitude },
                    locationName
                });

                await grantXP(user.uid, 20, "Daily Check-In");

            } catch (e) {
                console.error("Check-in failed", e);
                alert("Check-in failed. Please try again.");
            } finally {
                setIsHrLoading(false);
            }
        }, (err) => {
            console.error("Geo error", err);
            alert("Location access required for attendance.");
            setIsHrLoading(false);
        });
    };

    const performCheckOut = async (report: string) => {
        if (!user) return;
        setIsHrLoading(true);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const locationName = await getLocationName(latitude, longitude);

                await addDoc(collection(db, "attendance"), {
                    uid: user.uid,
                    timestamp: serverTimestamp(),
                    type: 'out',
                    location: { lat: latitude, lng: longitude },
                    locationName,
                    workReport: report
                });

                await grantXP(user.uid, 50, "Daily Work Report");
                setCheckOutModalOpen(false);

            } catch (e) {
                console.error("Check-out failed", e);
                alert("Check-out failed.");
            } finally {
                setIsHrLoading(false);
            }
        }, (err) => {
            console.error("Geo error", err);
            alert("Location access required.");
            setIsHrLoading(false);
        });
    };

    const { profile } = useTitanAuth();
    const isSiteSuper = profile?.role === 'site_super';

    const xpProgress = (xpData.currentXP % 1000) / 10;

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                {/* Main Dock */}
                <div className="relative flex items-center gap-1 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl shadow-black/50 overflow-hidden">

                    {/* Embedded XP Progress Bar (Bottom) */}
                    {user && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800">
                            <div
                                className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] transition-all duration-1000 ease-out"
                                style={{ width: `${xpProgress}%` }}
                            />
                        </div>
                    )}

                    {isSiteSuper ? (
                        /* SITE SUPER DOCK (Simplified) */
                        <>
                            {/* 1. Home */}
                            <Link
                                to="/"
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    location.pathname === "/" ? "bg-white/5 text-yellow-500" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                )}
                            >
                                <Home className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", location.pathname === "/" && "drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]")} />
                                {location.pathname === "/" && <span className="absolute bottom-2 w-1 h-1 bg-yellow-500 rounded-full shadow-[0_0_4px_rgba(234,179,8,0.8)]" />}
                            </Link>

                            {/* 2. Tasks (Global) */}
                            <Link
                                to="/command/global-tasks"
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    location.pathname === "/command/global-tasks" ? "bg-white/5 text-blue-400" : "text-zinc-500 hover:text-blue-300 hover:bg-white/5"
                                )}
                            >
                                <Target className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", location.pathname === "/command/global-tasks" && "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]")} />
                                {location.pathname === "/command/global-tasks" && <span className="absolute bottom-2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_4px_rgba(96,165,250,0.8)]" />}
                            </Link>

                            {/* 3. Profile / Logout (Simple Logout for now as profile page doesn't exist yet) */}
                            {/* User requested Link to /profile OR logout menu. Since /profile is missing, I'll use a User icon that triggers Logout for now to satisfy UX intent of "Profile/User Actions" */}
                            <button
                                onClick={handleLogout}
                                className="relative flex items-center justify-center w-12 h-12 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                            </button>
                        </>
                    ) : (
                        /* FOUNDER / DEFAULT DOCK */
                        <>
                            {/* Command Deck */}
                            <Link
                                to="/"
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    location.pathname === "/" ? "bg-white/5 text-yellow-500" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                )}
                                title="Command Deck"
                            >
                                <Home className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", location.pathname === "/" && "drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]")} />
                                {location.pathname === "/" && <span className="absolute bottom-2 w-1 h-1 bg-yellow-500 rounded-full shadow-[0_0_4px_rgba(234,179,8,0.8)]" />}
                            </Link>

                            {/* GLOBAL COMMAND */}
                            <Link
                                to="/command/global-tasks"
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    location.pathname === "/command/global-tasks" ? "bg-white/5 text-blue-400" : "text-zinc-500 hover:text-blue-300 hover:bg-white/5"
                                )}
                                title="Global Command"
                            >
                                <Target className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", location.pathname === "/command/global-tasks" && "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]")} />
                                {location.pathname === "/command/global-tasks" && <span className="absolute bottom-2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_4px_rgba(96,165,250,0.8)]" />}
                            </Link>

                            {/* Command Grid Launcher */}
                            <button
                                onClick={() => setShowLauncher(!showLauncher)}
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    showLauncher ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                )}
                                title="Command Grid"
                            >
                                <LayoutGrid className={cn("w-6 h-6 transition-transform duration-300 group-hover:scale-110", showLauncher && "rotate-45")} />
                            </button>

                            {/* Notification Bell */}
                            <button
                                onClick={() => setShowNotifications(true)}
                                className="relative flex items-center justify-center w-12 h-12 rounded-full text-zinc-500 hover:text-yellow-400 hover:bg-white/5 transition-all duration-300 group"
                                title="Notifications"
                            >
                                <Bell className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900 shadow-sm animate-pulse" />
                                )}
                            </button>

                            {/* Separator */}
                            <div className="w-px h-8 bg-white/10 mx-1" />

                            {/* Check-In (MapPin) */}
                            <button
                                onClick={handleHrClick}
                                disabled={isHrLoading}
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group",
                                    attendanceStatus === 'in'
                                        ? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                )}
                                title={attendanceStatus === 'in' ? "Checked In (Click to Leave)" : "Check In"}
                            >
                                <MapPin className={cn(
                                    "w-6 h-6 transition-transform duration-300 group-hover:scale-110",
                                    attendanceStatus === 'in' && "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]",
                                    isHrLoading && "animate-pulse opacity-50"
                                )} />
                                {attendanceStatus === 'in' && <span className="absolute bottom-2 w-1 h-1 bg-green-500 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.8)]" />}
                            </button>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="relative flex items-center justify-center w-12 h-12 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                            </button>
                        </>
                    )}
                </div>

            </div>

            {/* Command Launcher Overlay */}
            <CommandLauncher isOpen={showLauncher} onClose={() => setShowLauncher(false)} />

            {/* Notification Center */}
            {user && (
                <NotificationCenter
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    notifications={notifications}
                    userId={user.uid}
                />
            )}

            {/* Check Out Modal */}
            {checkOutModalOpen && (
                <CheckOutModal
                    onClose={() => setCheckOutModalOpen(false)}
                    onConfirm={performCheckOut}
                    isLoading={isHrLoading}
                />
            )}
        </>
    );
}

function CheckOutModal({ onClose, onConfirm, isLoading }: { onClose: () => void, onConfirm: (report: string) => void, isLoading: boolean }) {
    const [report, setReport] = useState("");

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-lg">Daily Wrap Up</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-zinc-400 text-sm mb-4">
                    Great work today! Briefly summarize what you accomplished to check out and earn your XP.
                </p>

                <textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    placeholder="- Completed site inspection&#10;- Fixed plumbing issue&#10;- Ordered cement"
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none mb-4"
                    autoFocus
                />

                <div className="flex gap-3">
                    <BananaButton variant="ghost" className="flex-1" onClick={onClose}>
                        Cancel
                    </BananaButton>
                    <BananaButton
                        className="flex-1"
                        disabled={!report.trim() || isLoading}
                        isLoading={isLoading}
                        onClick={() => onConfirm(report)}
                    >
                        Submit & Check Out
                    </BananaButton>
                </div>
            </div>
        </div>
    );
}
