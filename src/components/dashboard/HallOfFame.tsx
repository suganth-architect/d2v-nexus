import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { Trophy, Medal } from "lucide-react";

export function HallOfFame() {
    const [titans, setTitans] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTitans = async () => {
            try {
                // Note: Firestore requires an index for this query (role != client && orderBy currentXP).
                // If index is missing, it might fail. 
                // We'll trust the user has it or console error will show up.
                // Alternative: Client-side filter if collection is small, but prompt asked for query.
                // Prompt: "Query users collection, where('role', '!=', 'client'), orderBy('currentXP', 'desc'), limit(5)."
                const q = query(
                    collection(db, "users"),
                    where("role", "!=", "client"),
                    orderBy("currentXP", "desc"),
                    limit(5)
                );

                const snap = await getDocs(q);
                setTitans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Failed to fetch Hall of Fame", e);
            }
        };

        fetchTitans();
    }, []);

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return "border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] bg-yellow-500/10";
            case 1: return "border-zinc-400 text-zinc-300 bg-zinc-400/10";
            case 2: return "border-orange-700 text-orange-400 bg-orange-700/10";
            default: return "border-zinc-800 text-zinc-500 hover:bg-zinc-800/50";
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-4 h-4 text-yellow-500" />;
            case 1: return <Medal className="w-4 h-4 text-zinc-300" />;
            case 2: return <Medal className="w-4 h-4 text-orange-500" />;
            default: return <span className="font-mono font-bold text-xs w-4 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full flex flex-col">
            <div
                onClick={() => navigate('/command/directory')}
                className="flex items-center justify-between mb-6 cursor-pointer group"
            >
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold text-white group-hover:text-yellow-500 transition-colors">HALL OF FAME</h2>
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-white transition-colors">View All</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {titans.length === 0 ? (
                    <div className="text-center text-zinc-500 py-4 text-sm animate-pulse">Scanning for Titans...</div>
                ) : (
                    titans.map((user, index) => (
                        <div
                            key={user.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankStyle(index)}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-white/10">
                                {getRankIcon(index)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{user.displayName || "Unknown Titan"}</div>
                                <div className="text-[10px] uppercase tracking-wider opacity-80">{user.role || 'Member'}</div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-bold font-mono">{user.level || 1}</div>
                                <div className="text-[10px] opacity-60">Lvl</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
