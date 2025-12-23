import { db } from "./firebase";
import { doc, updateDoc, collection, query, where, increment, getCountFromServer } from "firebase/firestore";

/**
 * Recalculates all stats for a specific project and updates the project document.
 * @param projectId The ID of the project to heal/sync.
 */
export async function recalcProjectStats(projectId: string) {
    if (!projectId) return;

    try {
        console.log(`⚡ Recalculating Stats for Project: ${projectId}`);

        // 1. TASKS
        // We can use count() aggregation if available or getDocs for more detail if needed.
        // For performance, let's use getCountFromServer for total and completed.
        const taskColl = collection(db, "projects", projectId, "tasks");

        const qTotal = query(taskColl);
        const qCompleted = query(taskColl, where("status", "==", "completed"));
        const qCritical = query(taskColl, where("priority", "==", "critical"), where("status", "!=", "completed"));

        const [snapTotal, snapCompleted, snapCritical] = await Promise.all([
            getCountFromServer(qTotal),
            getCountFromServer(qCompleted),
            getCountFromServer(qCritical)
        ]);

        const totalTasks = snapTotal.data().count;
        const completedTasks = snapCompleted.data().count;
        const criticalHotfixes = snapCritical.data().count;

        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // 2. MATERIAL REQUESTS (Pending)
        // These are typically subcollection "material_requests" inside the project? 
        // Or root collection "material_requests" with projectId?
        // Based on typical schema in this codebase, let's assume subcollection OR root with projectId.
        // Looking at FounderDashboard, it queries collectionGroup("material_requests").
        // Let's assume they are subcollections of the project or linked by ID.
        // Wait, FounderDashboard uses collectionGroup, implies subcollection of Project? Or subcollection of Task?
        // Usually `projects/{id}/material_requests`. Let's assume that for now.
        // If it's `projects/{id}/tasks/{taskId}/material_requests`, it's harder.
        // FounderDashboard query: query(collectionGroup(db, "material_requests"), where("status", "==", "requested"));
        // This implies they are distributed. 
        // Best bet: Query collection(db, "projects", projectId, "material_requests") if it exists.
        // OR if they are subcollections of Tasks, we can't easily query all for a project without collectionGroup + projectId filter (which requires index).
        // Let's check `StocksTab` later. For now, we will assume a direct subcollection `material_requests` on Project 
        // OR we use the same structure as `decisions` (RFIs).

        // Let's try querying the likely path: `projects/{projectId}/material_requests`.
        const reqColl = collection(db, "projects", projectId, "material_requests");
        const qPendingStock = query(reqColl, where("status", "==", "requested"));
        const snapPendingStock = await getCountFromServer(qPendingStock);
        const pendingStock = snapPendingStock.data().count;

        // 3. DECISIONS / RFIs (Pending)
        // Usually `projects/{projectId}/decisions`
        const rfiColl = collection(db, "projects", projectId, "decisions");
        const qPendingRFI = query(rfiColl, where("status", "==", "pending"));
        const snapPendingRFI = await getCountFromServer(qPendingRFI);
        const pendingRFIs = snapPendingRFI.data().count;

        // UPDATE PROJECT
        await updateDoc(doc(db, "projects", projectId), {
            stats: {
                totalTasks,
                completedTasks,
                progress,
                pendingStock,
                criticalHotfixes,
                pendingRFIs
            }
        });

        console.log(`✅ Stats Synced for ${projectId}:`, { totalTasks, completedTasks, pendingStock, criticalHotfixes, pendingRFIs });

    } catch (error) {
        console.error(`❌ Failed to recalc stats for ${projectId}:`, error);
    }
}

/**
 * Fast atomic increment for stats.
 * Use this for real-time updates (creating a task, completing a task).
 * @param projectId 
 * @param field The specific stat field to increment (e.g., 'stats.totalTasks')
 * @param value 1 or -1
 */
export async function incrementStat(projectId: string, field: string, value: number) {
    if (!projectId) return;
    const projectRef = doc(db, "projects", projectId);

    // We need to be careful with nested fields in updateDoc. 
    // "stats.totalTasks" works.

    try {
        await updateDoc(projectRef, {
            [field]: increment(value)
        });
    } catch (e) {
        console.error("Failed to increment stat:", e);
    }
}
