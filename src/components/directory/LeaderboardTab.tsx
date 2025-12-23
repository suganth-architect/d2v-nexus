import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

export function LeaderboardTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("currentXP", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter external roles
            const validUsers = usersData.filter((user: any) =>
                !['client', 'sub_contractor'].includes(user.role)
            );
            setUsers(validUsers);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading Rankings...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-white">Top Performers</h2>
            </div>
            <div className="space-y-3">
                {users.map((user, index) => (
                    <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                        className={`relative flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-zinc-900/50 border-zinc-800'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 flex items-center justify-center font-bold text-lg ${index === 0 ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                {index === 0 ? <Crown className="w-6 h-6 fill-yellow-500" /> : `#${index + 1}`}
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{user.displayName || user.email?.split('@')[0]}</h3>
                                <p className="text-xs text-zinc-500 uppercase">{user.role}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-white font-mono">Lvl {user.level || 1}</div>
                            <div className="text-xs text-zinc-500">{user.currentXP || 0} XP</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
