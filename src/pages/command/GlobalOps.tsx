import { useTitanAuth } from '../../hooks/useTitanAuth';
import { AlertOctagon } from 'lucide-react';

export function GlobalOps() {
    const { profile } = useTitanAuth();
    // const [tasks, setTasks] = useState<any[]>([]);
    // const [loading, setLoading] = useState(true);

    // Permission Check
    if (profile?.role !== 'founder' && profile?.role !== 'architect' && profile?.role !== 'site_super') {
        return <div className="p-8 text-center text-zinc-500">Access Denied: Command Staff Only</div>;
    }

    return (
        <div className="flex flex-col h-full bg-black text-white">
            {/* Header / Glass Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <AlertOctagon className="w-5 h-5 text-red-500" />
                        Global Command
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase">
                        Phase 2: Alpha
                    </div>
                </div>
            </div>

            {/* Content using Grid */}
            <div className="flex-1 overflow-auto p-4 space-y-2">
                <div className="text-zinc-500 text-sm italic text-center py-10">
                    Initializing Global Task Grid... (Collection Group Index Required)
                </div>
            </div>
        </div>
    );
}
