import { useState, useEffect } from "react";
import { collectionGroup, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { FeedCard } from "../../components/feed/FeedCard";
import { Activity } from "lucide-react";

export function SiteFeedPortal() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Query across ALL projects' site_logs
        // Requires a Firestore Index: site_logs (collection group) -> timestamp (desc)
        const q = query(
            collectionGroup(db, 'site_logs'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setActivities(items);
            setLoading(false);
        }, (error) => {
            console.error("Feed error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredActivities = filter === 'all'
        ? activities
        : activities.filter(a => a.type === filter);

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-32">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">God's Eye</h1>
                        <p className="text-zinc-500 font-medium">Global Activity Stream</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 max-w-full no-scrollbar">
                    {['all', 'photo', 'task', 'stock', 'incident', 'project'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === f
                                ? 'bg-white text-black'
                                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed Grid (Masonry Effect via Columns) */}
            {loading ? (
                <div className="text-center py-20 animate-pulse text-zinc-600">Syncing with Neural Network...</div>
            ) : (
                <div className="max-w-7xl mx-auto columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                    {filteredActivities.map((item, index) => (
                        <FeedCard key={item.id} item={item} index={index} />
                    ))}

                    {filteredActivities.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                            No activity detected in this sector.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
