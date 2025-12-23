/**
 * ClientApprovalModal.tsx - The Digital Handshake
 * PROTOCOL OMEGA: Client-facing approval interface for Variations
 * 
 * Actions:
 * - APPROVE: Updates status, sets approvedAt, atomically increments totalContractValue
 * - REJECT: Updates status, sets rejectedAt
 */

import { useState } from "react";
import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { X, CheckCircle, XCircle, FileText, IndianRupee } from "lucide-react";
import type { Variation } from "../../types";

interface ClientApprovalModalProps {
    variation: Variation;
    projectId: string;
    onClose: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

export function ClientApprovalModal({ variation, projectId, onClose }: ClientApprovalModalProps) {
    const [comment, setComment] = useState("");
    const [processing, setProcessing] = useState(false);

    const handleApprove = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            const variationRef = doc(db, "projects", projectId, "variations", variation.id);
            const projectRef = doc(db, "projects", projectId);

            // Update variation status
            await updateDoc(variationRef, {
                status: 'approved',
                approvedAt: serverTimestamp(),
                clientComment: comment || null
            });

            // CRITICAL: Atomically increment totalContractValue
            await updateDoc(projectRef, {
                totalContractValue: increment(variation.amount)
            });

            onClose();
        } catch (error) {
            console.error("[ClientApprovalModal] Failed to approve variation:", error);
            alert("Approval failed. Please try again.");
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            const variationRef = doc(db, "projects", projectId, "variations", variation.id);

            await updateDoc(variationRef, {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                clientComment: comment || null
            });

            onClose();
        } catch (error) {
            console.error("[ClientApprovalModal] Failed to reject variation:", error);
            alert("Rejection failed. Please try again.");
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Review Request</h2>
                            <p className="text-xs text-zinc-500">Variation Approval</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Title & Description */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">{variation.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            {variation.description || "No description provided."}
                        </p>
                    </div>

                    {/* Amount Card */}
                    <div className="p-4 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20 rounded-xl">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                            <IndianRupee className="w-3 h-3" />
                            <span>ADDITIONAL AMOUNT</span>
                        </div>
                        <p className="text-3xl font-bold text-yellow-500 font-mono">
                            {formatCurrency(variation.amount)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-2">
                            This amount will be added to your Total Contract Value upon approval.
                        </p>
                    </div>

                    {/* Comment Input */}
                    <div>
                        <label className="block text-xs text-zinc-400 uppercase tracking-wider mb-2">
                            Your Comment (Optional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add any notes or feedback..."
                            className="w-full h-24 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 text-sm resize-none focus:outline-none focus:border-yellow-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-white/5 flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={processing}
                        className="flex-1 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <XCircle className="w-4 h-4" />
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex-1 h-12 rounded-xl bg-green-500 text-black font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {processing ? "Processing..." : "Approve"}
                    </button>
                </div>
            </div>
        </div>
    );
}
