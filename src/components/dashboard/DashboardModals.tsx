import { X, ArrowRight, DollarSign, MapPin, User, AlertTriangle, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project, Task, MaterialRequest } from '../../types';
import { useNavigate } from 'react-router-dom';

interface Decision {
    id: string;
    title: string;
    priority?: 'normal' | 'urgent';
    createdBy?: string;
    createdAt: any;
}


interface DashboardModalsProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'pipeline' | 'collections' | 'supply' | 'sites' | 'hotfix' | null;
    projects: Project[];
    hotfixes: Task[];
    materialRequests: MaterialRequest[];
    rfis: Decision[];
}

export function DashboardModals({ isOpen, onClose, type, projects, hotfixes, materialRequests, rfis }: DashboardModalsProps) {
    const navigate = useNavigate();

    // Helper: Format Currency
    const formatINR = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    // ACTION HANDLERS
    const handleApproveRequest = async (reqId: string) => {
        try {
            console.log("Approving request...", reqId);
        } catch (e) {
            console.error("Failed to approve", e);
        }
    };

    const ModalContent = () => {
        switch (type) {
            case 'pipeline':
                const pipelineProjects = [...projects].sort((a, b) => (b.totalContractValue || b.budgetTotal || 0) - (a.totalContractValue || a.budgetTotal || 0));
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-green-400" />
                                Project Pipeline
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {pipelineProjects.map(p => (
                                <div key={p.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-green-500/20 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">{p.title}</span>
                                        <span className="text-xs text-zinc-500">{p.status.toUpperCase()}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-400 font-bold font-mono">{formatINR(p.totalContractValue || p.budgetTotal || 0)}</div>
                                        <div className="w-24 h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-green-500"
                                                style={{ width: `${Math.min(((p.totalPaid || 0) / (p.totalContractValue || p.budgetTotal || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'collections':
                const dueProjects = projects
                    .filter(p => ((p.totalContractValue || p.budgetTotal || 0) - (p.totalPaid || 0)) > 0)
                    .sort((a, b) => ((b.totalContractValue || b.budgetTotal || 0) - (b.totalPaid || 0)) - ((a.totalContractValue || a.budgetTotal || 0) - (a.totalPaid || 0)));

                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-red-500" />
                                Collections Due (Defaulters)
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {dueProjects.map(p => {
                                const due = (p.totalContractValue || p.budgetTotal || 0) - (p.totalPaid || 0);
                                return (
                                    <div key={p.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-red-500/20 transition-colors">
                                        <div>
                                            <div className="text-white font-medium">{p.title}</div>
                                            <div className="text-xs text-zinc-500">Client: {p.clientEmail || 'Unknown'}</div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="text-xs text-green-500">Paid: {formatINR(p.totalPaid || 0)}</div>
                                            <div className="text-red-500 font-bold font-mono">Due: {formatINR(due)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {dueProjects.length === 0 && <p className="text-zinc-500 text-center py-8">All Clear! No pending dues.</p>}
                        </div>
                    </div>
                );

            case 'supply':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Package className="w-6 h-6 text-yellow-500" />
                                Supply Chain Log
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {materialRequests.map(req => (
                                <div key={req.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="text-white font-medium">{req.item} <span className="text-zinc-500 text-sm">({req.quantity})</span></div>
                                        <div className="text-xs text-zinc-500">Requested by User: {req.requestedBy.slice(0, 5)}...</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs uppercase border ${req.priority === 'urgent' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                                            {req.priority}
                                        </span>
                                        <button
                                            onClick={() => handleApproveRequest(req.id)}
                                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 px-3 py-1 rounded text-xs font-bold transition-colors"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {materialRequests.length === 0 && <p className="text-zinc-500 text-center py-8">No pending material requests.</p>}
                        </div>
                    </div>
                );

            case 'sites':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <MapPin className="w-6 h-6 text-blue-400" />
                                Active Sites (Rolodex)
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {projects.filter(p => p.status === 'active').map(p => (
                                <div key={p.id} className="glass-card p-4 rounded-xl border border-white/10 hover:border-blue-400/30 transition-all group cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{p.title}</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2 text-zinc-400 text-sm">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span className="line-clamp-2">{p.location || 'No Address Logged'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                                            <User className="w-3 h-3" />
                                            <span>{p.clientEmail || 'Client Info Missing'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'hotfix':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                                The War Room (Critical Hotfixes)
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {/* RFIs Section */}
                            {rfis && rfis.length > 0 && (
                                <div className="mb-6 space-y-2">
                                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">Pending RFIs</h3>
                                    {rfis.map(rfi => (
                                        <div key={rfi.id} className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/20 flex items-center justify-between hover:border-purple-500/50 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-purple-200 font-bold">{rfi.title}</span>
                                                    {rfi.priority === 'urgent' && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded uppercase animate-pulse">URGENT</span>}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    Asked by {rfi.createdBy ? 'User' : 'Unknown'} • {new Date(rfi.createdAt?.seconds * 1000).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <button className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors">
                                                Resolve
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Critical Tasks</h3>
                            {hotfixes.map(task => (
                                <div
                                    key={task.id}
                                    className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 flex items-center justify-between hover:bg-red-500/10 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/command/global-tasks?filter=critical`)}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-200 font-bold">{task.title}</span>
                                            {task.isDelayed && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded uppercase">Delayed</span>}
                                        </div>
                                        <div className="text-xs text-red-300/50 mt-1">
                                            {task.delayReason || "Critical Priority Task"}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-red-500/50" />
                                </div>
                            ))}
                            {hotfixes.length === 0 && (!rfis || rfis.length === 0) && <p className="text-zinc-500 text-center py-8">War Room Empty. Good work.</p>}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
                        >
                            {/* Glass Effect Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                            <div className="relative z-10">
                                <ModalContent />
                            </div>

                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
