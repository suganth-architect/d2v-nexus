/**
 * ClientProjectPortal.tsx - The God Level Dashboard
 * PROTOCOL OMEGA: Secure, premium client-facing project portal
 * 
 * "Nano Glass" aesthetic - Dark mode, elegant typography, glassmorphism
 * 
 * SECURITY MANDATE:
 * - NEVER show internal Tasks, Inventory, or Labor Logs
 * - ONLY show Site Photos marked isPublic
 * - ONLY show Contract Value, Paid Amount, Invoices (hide internal expenses)
 */

import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { useClientProjects } from "../../hooks/useClientProjects";
import { useClientData } from "../../hooks/useClientData";
import {
    Wallet,
    Clock,
    Image,
    FileSignature,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Eye,
    FileText,
    Download,
    Film,
    PenTool
} from "lucide-react";
import { ClientApprovalModal } from "../../components/dashboard/ClientApprovalModal";
import type { Variation } from "../../types";

// ============================================================================
// FORMATTERS
// ============================================================================

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientProjectPortal() {
    const { projectId } = useParams();
    const { profile } = useTitanAuth();
    const { projects, loading: projectsLoading } = useClientProjects(
        profile?.email || undefined,
        profile?.role || undefined,
        profile?.uid || undefined
    );

    // The Firewall Hook - Security Layer
    const {
        project,
        clientFinancials,
        pendingApprovals,
        publicGallery,
        publicFiles,
        timeline,
        loading: dataLoading
    } = useClientData(projectId);

    // Modal State
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Loading State
    if (projectsLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-white/5 border-t-yellow-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-yellow-500/30 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
            </div>
        );
    }

    // Authorization Check
    const authorizedProject = projects.find(p => p.id === projectId);
    if (!authorizedProject || !project) {
        return <Navigate to="/portal/client/portfolio" replace />;
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans">
            {/* ================================================================
                HEADER
            ================================================================ */}
            <header className="sticky top-0 z-50 h-20 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-black font-bold text-xl font-serif shadow-lg shadow-yellow-500/20">
                            {project.title.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">{project.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Client Portal</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                            {project.status === 'active' ? 'In Progress' : project.status}
                        </span>
                    </div>
                </div>
            </header>

            {/* ================================================================
                MAIN CONTENT
            ================================================================ */}
            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ============================================================
                    SECTION 1: THE STATEMENT (Financial Header)
                ============================================================ */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-white/5 p-8">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-6">
                            <Wallet className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Financial Statement</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Total Contract Value */}
                            <div className="p-6 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/5">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Total Contract Value</p>
                                <p className="text-4xl font-bold text-white font-mono tracking-tight">
                                    {formatCurrency(clientFinancials.totalContractValue)}
                                </p>
                            </div>

                            {/* Paid to Date */}
                            <div className="p-6 bg-black/30 backdrop-blur-sm rounded-2xl border border-green-500/20">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Paid to Date</p>
                                <p className="text-4xl font-bold text-green-400 font-mono tracking-tight">
                                    {formatCurrency(clientFinancials.totalPaid)}
                                </p>
                            </div>

                            {/* Balance Pending */}
                            <div className="p-6 bg-black/30 backdrop-blur-sm rounded-2xl border border-amber-500/20">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Balance Pending</p>
                                <p className="text-4xl font-bold text-amber-400 font-mono tracking-tight">
                                    {formatCurrency(clientFinancials.balance)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================================================
                    SECTION 2: THE SIGNATURE BOARD (Pending Approvals)
                ============================================================ */}
                <section className="rounded-3xl bg-neutral-900/50 backdrop-blur-sm border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                <FileSignature className="w-5 h-5 text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Pending Approvals</h2>
                                <p className="text-xs text-zinc-500">Variation requests requiring your signature</p>
                            </div>
                        </div>
                        {pendingApprovals.length > 0 && (
                            <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                                <span className="text-xs font-bold text-yellow-500">{pendingApprovals.length} Pending</span>
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {pendingApprovals.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">All Caught Up!</h3>
                                <p className="text-sm text-zinc-500">No pending approvals at this time.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingApprovals.map((variation) => (
                                    <div
                                        key={variation.id}
                                        className="p-4 bg-black/30 rounded-xl border border-yellow-500/10 hover:border-yellow-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                                    <h4 className="font-bold text-white truncate">{variation.title}</h4>
                                                </div>
                                                <p className="text-sm text-zinc-500 line-clamp-1">
                                                    {variation.description || "Additional work request"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-yellow-500 font-mono">
                                                        {formatCurrency(variation.amount)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedVariation(variation)}
                                                    className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
                                                >
                                                    Review
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ============================================================
                    SECTION 3: THE DREAM STREAM (Gallery - View Only)
                ============================================================ */}
                <section className="rounded-3xl bg-neutral-900/50 backdrop-blur-sm border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                <Image className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Project Gallery</h2>
                                <p className="text-xs text-zinc-500">Site progress photos</p>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-600">{publicGallery.length} Photos</span>
                    </div>

                    <div className="p-6">
                        {publicGallery.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                    <Image className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">No Photos Yet</h3>
                                <p className="text-sm text-zinc-500">Site photos will appear here as they're shared.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {publicGallery.map((log) => (
                                    <div
                                        key={log.id}
                                        onClick={() => setLightboxImage(log.imageUrl)}
                                        className="aspect-square bg-neutral-800 rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer"
                                    >
                                        <img
                                            src={log.imageUrl}
                                            alt={log.description || "Site Photo"}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                                <Eye className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        {/* Description */}
                                        {log.description && (
                                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-xs text-white/80 line-clamp-2">{log.description}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ============================================================
                    SECTION 4: DESIGN STUDIO (Files/Drawings)
                ============================================================ */}
                <section className="rounded-3xl bg-neutral-900/50 backdrop-blur-sm border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                <PenTool className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Design Studio</h2>
                                <p className="text-xs text-zinc-500">Plans, renders & documents</p>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-600">{publicFiles.length} Files</span>
                    </div>

                    <div className="p-6">
                        {publicFiles.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-zinc-600" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">No Documents Yet</h3>
                                <p className="text-sm text-zinc-500">Design documents will appear here as they're shared.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {publicFiles.map((file) => {
                                    // Determine icon based on file type
                                    const getFileIcon = () => {
                                        switch (file.type) {
                                            case 'video':
                                            case 'walkthrough':
                                                return <Film className="w-6 h-6 text-purple-400" />;
                                            case 'render':
                                                return <Image className="w-6 h-6 text-pink-400" />;
                                            case 'plan':
                                                return <PenTool className="w-6 h-6 text-cyan-400" />;
                                            default:
                                                return <FileText className="w-6 h-6 text-blue-400" />;
                                        }
                                    };

                                    return (
                                        <div
                                            key={file.id}
                                            className="p-4 bg-zinc-900 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                                    {getFileIcon()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-white truncate mb-1" title={file.title}>
                                                        {file.title}
                                                    </h4>
                                                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                                                        {file.type}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black border border-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* ============================================================
                    SECTION 5: TIMELINE (Payment Milestones)
                ============================================================ */}
                {timeline.length > 0 && (
                    <section className="rounded-3xl bg-neutral-900/50 backdrop-blur-sm border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Payment Timeline</h2>
                                <p className="text-xs text-zinc-500">Milestone progress</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="space-y-3">
                                {timeline.map((stage, index) => {
                                    const isPaid = stage.status === 'paid';
                                    return (
                                        <div
                                            key={stage.id || index}
                                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isPaid
                                                ? 'bg-green-500/5 border-green-500/20'
                                                : 'bg-black/20 border-white/5'
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${isPaid ? 'bg-green-500' : 'bg-zinc-700'}`} />
                                            <div className="flex-1">
                                                <p className={`font-medium ${isPaid ? 'text-white' : 'text-zinc-400'}`}>
                                                    {stage.title}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-mono font-bold ${isPaid ? 'text-green-400' : 'text-zinc-500'}`}>
                                                    {formatCurrency(stage.amount)}
                                                </p>
                                                {isPaid && (
                                                    <span className="text-[10px] text-green-500 uppercase tracking-wider">Paid</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

            </main>

            {/* ================================================================
                MODALS
            ================================================================ */}

            {/* Approval Modal */}
            {selectedVariation && projectId && (
                <ClientApprovalModal
                    variation={selectedVariation}
                    projectId={projectId}
                    onClose={() => setSelectedVariation(null)}
                />
            )}

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <img
                        src={lightboxImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
