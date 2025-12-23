import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collectionGroup, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
// import type { SiteLog } from "../../types";
import { formatDistanceToNow } from "date-fns";
import { ScrollText, User as UserIcon } from "lucide-react";

// FeedItem interface removed as it was unused

export function GlobalFeed() {
    const [logs, setLogs] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Query ALL site_logs across ALL projects
        const q = query(
            collectionGroup(db, 'site_logs'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                // Extract project ID from ref path: projects/PROJECT_ID/site_logs/LOG_ID
                const pathSegments = doc.ref.path.split('/');
                const projectId = pathSegments[1];

                return {
                    id: doc.id,
                    ...data,
                    projectId,
                    // We could fetch project name here if we had a cache, but for now ID is okay or we skip it
                };
            });
            setLogs(items);
        });

        return () => unsub();
    }, []);

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <ScrollText className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-white">Live Operations Feed</h2>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700 animate-pulse">
                    LIVE
                </span>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <div className="text-zinc-500 text-sm text-center py-4">No recent activity.</div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => navigate('/project/' + log.projectId)}
                            className="flex gap-4 items-start relative group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                        >
                            {/* Timeline Line */}
                            <div className="absolute left-2.5 top-8 bottom-[-20px] w-px bg-zinc-800 group-last:hidden" />

                            <div className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-zinc-700 flex-shrink-0 flex items-center justify-center z-10 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            </div>

                            <div className="flex-1 pb-4">
                                <div className="flex items-center flex-wrap gap-2 text-xs">
                                    {/* TIME */}
                                    <span className="font-mono text-zinc-500">
                                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                                    </span>

                                    <span className="text-zinc-700">•</span>

                                    {/* USER */}
                                    <span className="font-bold text-zinc-300 flex items-center gap-1">
                                        <UserIcon className="w-3 h-3" />
                                        User {log.authorUid?.substring(0, 4)}
                                    </span>

                                    <span className="text-zinc-700">•</span>

                                    {/* ACTION */}
                                    <span className="text-zinc-200">
                                        {log.imageUrl ? "Uploaded Photo" : "Added Note"}
                                    </span>

                                    <span className="text-zinc-700">•</span>

                                    {/* PROJECT */}
                                    <span className="font-bold text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                        Project {log.projectId?.substring(0, 5)}
                                    </span>
                                </div>

                                {/* Content Preview */}
                                <div className="mt-2 bg-zinc-900/80 border border-white/5 p-2 rounded-lg flex gap-3">
                                    {log.imageUrl && (
                                        <img src={log.imageUrl} alt="Log" className="w-10 h-10 rounded object-cover border border-white/10" />
                                    )}
                                    <p className="text-xs text-zinc-400 italic line-clamp-2 self-center">
                                        "{log.description}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
