import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
// import type { User } from "../../types"; 
import { Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

export function LeaderboardTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Query users ordered by XP desc
        const q = query(collection(db, "users"), orderBy("currentXP", "desc"), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // PURGE EXTERNAL ROLES
            const EXCLUDED_ROLES = ['client', 'sub contractor', 'sub_contractor'];
            const validUsers = usersData.filter((user: any) => {
                const userRole = user.role?.toLowerCase() || '';
                return !EXCLUDED_ROLES.includes(userRole);
            });

            setUsers(validUsers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading Rankings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-white">Top Performers</h2>
            </div>

            <div className="space-y-3">
                {users.map((user, index) => {
                    const isFirst = index === 0;
                    const isSecond = index === 1;
                    const isThird = index === 2;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`
                                relative flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm
                                ${isFirst ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' :
                                    isSecond ? 'bg-zinc-800/50 border-zinc-600/50' :
                                        isThird ? 'bg-orange-900/20 border-orange-800/50' :
                                            'bg-zinc-900/50 border-zinc-800'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-8 h-8 flex items-center justify-center font-bold text-lg
                                    ${isFirst ? 'text-yellow-500' : isSecond ? 'text-zinc-300' : isThird ? 'text-orange-400' : 'text-zinc-600'}
                                `}>
                                    {isFirst ? <Crown className="w-6 h-6 fill-yellow-500" /> : `#${index + 1}`}
                                </div>

                                <div className="flex flex-col">
                                    <span className={`font-bold ${isFirst ? 'text-white text-lg' : 'text-zinc-200'}`}>
                                        {user.displayName || user.email?.split('@')[0] || "Unknown"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900 px-1.5 rounded">{user.role}</span>
                                        {user.streak > 0 && (
                                            <span className="text-[10px] text-orange-500 flex items-center gap-1">
                                                🔥 {user.streak} Day Streak
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-bold text-white font-mono">Lvl {user.level || 1}</div>
                                <div className="text-xs text-zinc-500">{user.currentXP || 0} XP</div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
