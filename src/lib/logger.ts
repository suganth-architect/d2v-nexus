import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type ActivityType = 'photo' | 'task' | 'stock' | 'attendance' | 'project' | 'incident' | 'decision';

interface ActivityLogMeta {
    taskId?: string;
    imageUrl?: string;
    location?: string;
    userRole?: string;
    stockItem?: string;
    quantity?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    [key: string]: any;
}

export const logActivity = async (
    projectId: string,
    type: ActivityType,
    description: string,
    meta: ActivityLogMeta = {},
    authorUid?: string
) => {
    try {
        const docRef = await addDoc(collection(db, `projects/${projectId}/site_logs`), {
            type,
            description,
            metadata: meta,
            projectId, // Redundant but useful for Collection Group Queries if needed to filter post-fetch or debug
            authorUid: authorUid || 'system',
            timestamp: serverTimestamp(),
            // Helper fields for easier querying/display if needed at root level
            imageUrl: meta.imageUrl || null,
            isImportant: meta.severity === 'high' || meta.severity === 'critical',
        });
        console.log(`[LOGGER] Activity logged: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("[LOGGER] Failed to log activity:", error);
    }
};
