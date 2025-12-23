/**
 * useClientData.ts - The Firewall Hook
 * PROTOCOL OMEGA + TITAN PROTOCOL V3: Security abstraction layer for Client Portal
 * 
 * This hook ONLY exposes client-safe data:
 * - Project metadata (title, totalContractValue, stats)
 * - Variations (pending OR approved only)
 * - Incoming payments (type: 'in' from expenses collection)
 * - Public site logs (isPublic === true)
 * - Public files (isPublic === true)
 * 
 * NEVER exposes:
 * - Tasks, Inventory, Labor Logs
 * - Private site photos
 * - Internal expenses (outgoing)
 */

import { useState, useEffect } from "react";
import { doc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Project, Variation, SiteLog, PaymentStage, ProjectFile } from "../types";

interface ClientFinancials {
    totalContractValue: number;
    totalPaid: number;
    balance: number;
}

interface Payment {
    id: string;
    amount: number;
    type: 'in' | 'out';
    category?: string;
    description?: string;
    date?: any;
    createdAt?: any;
}

interface UseClientDataReturn {
    project: Project | null;
    clientFinancials: ClientFinancials;
    pendingApprovals: Variation[];
    approvedVariations: Variation[];
    publicGallery: SiteLog[];
    publicFiles: ProjectFile[];
    timeline: PaymentStage[];
    loading: boolean;
}

export function useClientData(projectId: string | undefined): UseClientDataReturn {
    const [project, setProject] = useState<Project | null>(null);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [publicLogs, setPublicLogs] = useState<SiteLog[]>([]);
    const [publicFiles, setPublicFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribers: (() => void)[] = [];

        // 1. Fetch Project Document
        const projectRef = doc(db, "projects", projectId);
        const unsubProject = onSnapshot(projectRef, (snap) => {
            if (snap.exists()) {
                setProject({ id: snap.id, ...snap.data() } as Project);
            } else {
                setProject(null);
            }
        });
        unsubscribers.push(unsubProject);

        // 2. Fetch Variations (pending OR approved only - client shouldn't see internal rejected ones initially)
        const variationsRef = collection(db, "projects", projectId, "variations");
        const qVariations = query(
            variationsRef,
            where("status", "in", ["pending", "approved"]),
            orderBy("createdAt", "desc")
        );
        const unsubVariations = onSnapshot(qVariations, (snap) => {
            setVariations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Variation)));
        });
        unsubscribers.push(unsubVariations);

        // 3. Fetch Incoming Payments (Expenses with type 'in')
        // FIXED: Changed from 'transactions' to 'expenses' collection
        const expensesRef = collection(db, "projects", projectId, "expenses");
        const qPayments = query(
            expensesRef,
            where("type", "==", "in"),
            orderBy("createdAt", "desc")
        );
        const unsubPayments = onSnapshot(qPayments, (snap) => {
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });
        unsubscribers.push(unsubPayments);

        // 4. Fetch Public Site Logs (Gallery - ONLY isPublic === true)
        const logsRef = collection(db, "projects", projectId, "site_logs");
        const qLogs = query(
            logsRef,
            where("isPublic", "==", true),
            orderBy("timestamp", "desc")
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            setPublicLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteLog)));
        });
        unsubscribers.push(unsubLogs);

        // 5. Fetch Public Files (Design Studio - ONLY isPublic === true)
        const filesRef = collection(db, "projects", projectId, "files");
        const qFiles = query(
            filesRef,
            where("isPublic", "==", true),
            orderBy("createdAt", "desc")
        );
        const unsubFiles = onSnapshot(qFiles, (snap) => {
            setPublicFiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFile)));
            setLoading(false);
        });
        unsubscribers.push(unsubFiles);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [projectId]);

    // Compute client-safe financials
    const totalContractValue = project?.totalContractValue || 0;
    const totalPaid = project?.totalPaid || payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const balance = totalContractValue - totalPaid;

    const clientFinancials: ClientFinancials = {
        totalContractValue,
        totalPaid,
        balance
    };

    // Separate pending from approved variations
    const pendingApprovals = variations.filter(v => v.status === 'pending');
    const approvedVariations = variations.filter(v => v.status === 'approved');

    // Timeline from project
    const timeline: PaymentStage[] = project?.paymentTimeline || [];

    return {
        project,
        clientFinancials,
        pendingApprovals,
        approvedVariations,
        publicGallery: publicLogs,
        publicFiles,
        timeline,
        loading
    };
}
