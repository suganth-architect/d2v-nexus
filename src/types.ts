

// --- 1. IDENTITY & ROLES ---
// Consolidated: 'site_engineer' is merged into 'site_super'
export type UserRole = 'founder' | 'architect' | 'pm' | 'accountant' | 'site_super' | 'client' | 'sub_contractor' | 'procurement';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    photoURL?: string;
    companyName?: string;
    status: 'active' | 'archived' | 'invited' | 'pending';
    level: number;
    currentXP: number;
    tasksCompleted: number;
    streak: number;
    designation?: string;
    joiningDate?: any;
    phone?: string;
    phoneNumber?: string; // Alias for compatibility
    address?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    createdAt: any;
}

// --- 2. PROJECT CORE ---
export interface Project {
    id: string;
    title: string;
    status: 'active' | 'paused' | 'completed' | 'archived';

    // Financial Core (Unified totalContractValue Model)
    totalContractValue: number;
    totalPaid: number;
    currentBalance: number;

    // Legacy support (fallbacks)
    budgetTotal?: number;
    budget?: number;
    projectValue?: number;

    // Security & Access
    teamIds?: string[];
    clientUid?: string | null;
    clientEmail?: string;
    publicView: boolean;

    // Metadata & Dates
    location?: string;
    pincode?: string;
    description?: string;
    imageUrl?: string;
    createdAt: any;
    startDate?: any;
    handoverDate?: any;
    pausedReason?: string;

    // Denormalized Stats
    stats?: {
        totalTasks: number;
        completedTasks: number;
        progress: number;
        pendingStock: number;
        criticalHotfixes: number;
        pendingRFIs: number;
    };
    paymentTimeline?: PaymentStage[];
}

// --- 3. MISSION CONTROL (TASKS) ---
export type TaskStatus = 'TODO' | 'ACTIVE' | 'REVIEW' | 'DONE';

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    type?: 'GENERAL' | 'DESIGN' | 'BUILD' | 'PROCUREMENT';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string; // User UID
    xpReward: number;
    isDelayed?: boolean;
    isOnHold?: boolean;
    needsInfo?: boolean;
    isEmergency?: boolean;
    startDate?: any;
    endDate?: any;
    createdAt: any;
    completedAt?: any;
    projectId: string;

    // Material Linkage
    requiresMaterial?: boolean;
    materialStatus?: 'requested' | 'ordered' | 'on_site';

    // Organization
    location?: string;
    phaseId?: string;
    dependencyId?: string;
    delayReason?: string;
    commentCount?: number;
    attachedFileId?: string;
    attachedFileUrl?: string;
}

// --- 4. SUPPORTING ENTITIES ---

export interface Transaction {
    id: string;
    projectId: string;
    projectName?: string;
    type: 'in' | 'out';
    amount: number;
    category: string;
    description?: string;
    date: any;
    linkedStageId?: string;
    recordedBy: string;
    lastEditedAt?: any;
    lastEditedBy?: string;
}

export interface MaterialRequest {
    id: string;
    item: string;
    quantity: string;
    estimatedCost?: number;
    priority: 'normal' | 'urgent';
    status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'delivered';
    requestedBy: string;
    relatedTaskId?: string;
    createdAt: any;
}

export interface InventoryItem {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    minLevel: number;
    avgPrice: number;
    avgRate?: number;
    lastUpdated: any;
}

export interface ProjectFile {
    id: string;
    title: string;
    type: 'plan' | 'render' | 'video' | 'walkthrough' | 'contract';
    url: string;
    isPublic: boolean;
    sharedWith?: string[];
    uploadedBy: string;
    createdAt: any;
    version?: number;
}

export interface Variation {
    id: string;
    title: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'founder_review' | 'pending_review';
    description: string;
    createdAt: any;
}

export interface Invoice {
    id: string;
    title: string;
    amount: number;
    status: 'pending' | 'paid';
    dueDate: any;
    createdAt: any;
}

export interface AttendanceRecord {
    id: string;
    uid: string;
    type: 'in' | 'out';
    timestamp: any;
    locationName?: string;
    workReport?: string;
    userName?: string;
    projectId?: string;
}

export interface DailyLog {
    id: string;
    projectId: string;
    date: string;
    labor: { mason: number; helper: number; carpenter: number; other?: number; };
    inventoryCheck?: { itemsChecked: string[]; criticalItems: string[]; };
    plannedTasks: string[];
    status: 'open' | 'submitted';
    submittedBy: string;
    weather?: string;
    notes?: string;
    createdAt: any;
    updatedAt: any;
}

export interface PaymentStage {
    id: string;
    title: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    dueDate?: any;
    paidDate?: any;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    linkedProjectId?: string;
    designation?: string;
    currentAddress?: string;
    createdAt?: any;
}

export interface Vendor {
    id: string;
    name: string;
    service: string;
    contact: string;
    totalBilled: number;
    totalPaid: number;
    currentBalance: number;
    createdAt?: any;
}

export type StockItem = InventoryItem;

export interface SiteLog {
    id: string;
    message?: string;
    description?: string;
    type: string;
    createdAt: any;
    [key: string]: any;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: any;
    [key: string]: any;
}