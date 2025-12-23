import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Package, MapPin, Camera, Building, Info, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedCardProps {
    item: any;
    // index for staggered animation if needed, passed by parent
    index?: number;
}

export function FeedCard({ item, index = 0 }: FeedCardProps) {
    const { type, description, metadata, timestamp, imageUrl, authorUid } = item;

    // Parse timestamp safely
    const timeAgo = timestamp?.toDate ? formatDistanceToNow(timestamp.toDate(), { addSuffix: true }) : 'Just now';

    // Type Config
    const getConfig = () => {
        switch (type) {
            case 'photo':
                return {
                    icon: <Camera className="w-4 h-4 text-white" />,
                    bg: 'bg-zinc-900',
                    border: 'border-zinc-800',
                    accent: 'bg-blue-500'
                };
            case 'task':
                return {
                    icon: <CheckCircle2 className="w-4 h-4 text-black" />,
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    accent: 'bg-green-500'
                };
            case 'stock':
                return {
                    icon: <Package className="w-4 h-4 text-black" />,
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/20',
                    accent: 'bg-yellow-500'
                };
            case 'attendance':
                return {
                    icon: <MapPin className="w-4 h-4 text-black" />,
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/20',
                    accent: 'bg-purple-500'
                };
            case 'incident':
                return {
                    icon: <AlertTriangle className="w-4 h-4 text-white" />,
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    accent: 'bg-red-600'
                };
            case 'project':
                return {
                    icon: <Building className="w-4 h-4 text-black" />,
                    bg: 'bg-zinc-800',
                    border: 'border-zinc-700',
                    accent: 'bg-white'
                };
            default:
                return {
                    icon: <Info className="w-4 h-4 text-white" />,
                    bg: 'bg-zinc-900',
                    border: 'border-zinc-800',
                    accent: 'bg-zinc-500'
                };
        }
    };

    const config = getConfig();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative break-inside-avoid mb-4 rounded-2xl overflow-hidden border ${config.border} ${config.bg} p-4 max-w-sm w-full mx-auto`}
        >
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.accent} shadow-lg`}>
                    {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                            {type}
                        </span>
                        <span className="text-[10px] opacity-40 whitespace-nowrap">{timeAgo}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200 mt-1 leading-snug">
                        {description}
                    </p>
                </div>
            </div>

            {/* Content Injection */}
            <div className="pl-11 mt-2 space-y-3">
                {/* Photo */}
                {type === 'photo' && imageUrl && (
                    <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10 group cursor-pointer">
                        <img src={imageUrl} alt="Site Update" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold border border-white/10">
                            Visible to Client
                        </div>
                    </div>
                )}

                {/* Stock Details */}
                {type === 'stock' && metadata?.quantity && (
                    <div className="flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/5 px-3 py-2 rounded-lg border border-yellow-500/10">
                        <Package className="w-3 h-3" />
                        <span>Moved <b>{metadata.quantity}</b> Units</span>
                    </div>
                )}

                {/* Attendance Details */}
                {type === 'attendance' && metadata?.location && (
                    <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/5 px-3 py-2 rounded-lg border border-purple-500/10">
                        <MapPin className="w-3 h-3" />
                        <span>{metadata.location}</span>
                    </div>
                )}

                {/* Incident Details */}
                {type === 'incident' && metadata?.severity && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wide">
                        <AlertTriangle className="w-3 h-3" />
                        {metadata.severity} Severity
                    </div>
                )}
            </div>

            {/* Footer Metadata */}
            {authorUid && (
                <div className="pl-11 mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Avatar placeholder - later fetch actual avatar */}
                        <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                            <User className="w-2 h-2 text-zinc-400" />
                        </div>
                        <span className="text-[10px] text-zinc-500">ID: {authorUid.slice(0, 5)}...</span>
                    </div>
                    {metadata?.taskId && <span className="text-[10px] text-zinc-600 font-mono">#{metadata.taskId.slice(-4)}</span>}
                </div>
            )}

        </motion.div>
    );
}
