import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, collectionGroup } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { User } from '../../types';
import { Trophy, Medal, MapPin, Activity } from 'lucide-react';

export function IntelligenceSidebar() {
    const [deployedCount, setDeployedCount] = useState(0);
    const [leaders, setLeaders] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Muster Roll (Attendance)
        // Get start of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Note: 'site_logs' might be a subcollection of projects or a top level one. 
        // Using collectionGroup to be safe as per instructions "collectionGroup('site_logs')"
        // Assuming 'timestamp' field. Instructions say "createdAt > TodayStart" but types say "timestamp"

        const qAttendance = query(
            collectionGroup(db, 'site_logs'),
            where('type', '==', 'attendance'),
            where('timestamp', '>=', startOfDay) // Assuming timestamp is a Firestore Timestamp or Date compatible
        );

        const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
            // Count unique users if possible, or just logs
            // Ideally we filter by unique authorUid
            const uniqueUsers = new Set(snapshot.docs.map(doc => doc.data().authorUid));
            setDeployedCount(uniqueUsers.size);
        });

        // 2. Hall of Fame (Leaderboard)
        const qLeaders = query(
            collection(db, 'users'),
            orderBy('currentXP', 'desc'),
            limit(3)
        );

        const unsubLeaders = onSnapshot(qLeaders, (snapshot) => {
            const topUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            setLeaders(topUsers);
            setLoading(false);
        });

        return () => {
            unsubAttendance();
            unsubLeaders();
        };
    }, []);

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return 'border-yellow-500/50 shadow-yellow-500/20 text-yellow-500'; // Gold
            case 1: return 'border-zinc-400/50 shadow-zinc-400/20 text-zinc-300';   // Silver
            case 2: return 'border-orange-700/50 shadow-orange-700/20 text-orange-400'; // Bronze
            default: return 'border-zinc-800 text-zinc-500';
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
            case 1: return <Medal className="w-4 h-4 text-zinc-300" />;
            case 2: return <Medal className="w-4 h-4 text-orange-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            {/* Muster Roll Card */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Muster Roll
                    </h3>

                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-white glow-text-emerald">
                            {deployedCount}
                        </span>
                        <div className="mb-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-emerald-400 font-medium text-sm">Titans Deployed</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hall of Fame Card */}
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-50">
                    <Activity className="w-24 h-24 text-white/5 rotate-12" />
                </div>

                <div className="relative z-10">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Trophy className="w-3 h-3" />
                        Hall of Fame
                    </h3>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl" />)}
                            </div>
                        ) : (
                            leaders.map((user, index) => (
                                <div
                                    key={user.uid}
                                    className="flex items-center gap-3 group"
                                >
                                    <div className={`
                                        w-10 h-10 rounded-full border-2 flex items-center justify-center bg-black
                                        ${getRankStyle(index)} relative
                                    `}>
                                        <img
                                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                                            alt={user.displayName}
                                            className="w-full h-full rounded-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-white/10">
                                            {getRankIcon(index)}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate max-w-[150px]">
                                            {user.displayName}
                                        </div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                                            <span className="text-yellow-500 font-medium">Lvl {user.level || 1}</span>
                                            <span>•</span>
                                            <span>{user.designation || 'Architect'}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs font-mono text-zinc-600">
                                        {(user.currentXP || 0).toLocaleString()} XP
                                    </div>
                                </div>
                            ))
                        )}

                        {leaders.length === 0 && !loading && (
                            <div className="text-zinc-500 text-sm italic">
                                No XP data available.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
