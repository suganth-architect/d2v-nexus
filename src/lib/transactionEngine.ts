import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "./firebase";
import { grantXP } from "./gamification";
import { logActivity } from "./logger";
import type { Task } from "../types";

/**
 * Operation Convergence: The Neural Bridge
 * Centralized logic for complex state transitions.
 */

export const completeTask = async (
    taskId: string,
    projectId: string,
    userId: string,
    taskData: Partial<Task>
) => {
    if (!taskId || !projectId) {
        console.error("completeTask: Missing taskId or projectId");
        return;
    }

    try {
        console.log(`[NEURAL BRIDGE] Completing task ${taskId} for project ${projectId}...`);

        // 1. Calculate XP
        // Base 50. Priority Bonus: Critical (+50), High (+30), Medium (+10).
        let xpAmount = 50;
        const priority = taskData.priority || 'medium';
        if (priority === 'critical') xpAmount += 50;
        if (priority === 'high') xpAmount += 30;
        if (priority === 'medium') xpAmount += 10;

        // 2. Update Task Status
        const taskRef = doc(db, `projects/${projectId}/tasks`, taskId);
        await updateDoc(taskRef, {
            status: 'DONE',
            completedAt: serverTimestamp(),
            completedBy: userId
        });

        // 3. Grant XP
        if (userId) {
            await grantXP(userId, xpAmount, `Completed ${priority} priority task`);
        }

        // 4. Log Activity
        await logActivity(
            projectId,
            'task',
            `Completed task: ${taskData.title || 'Untitled Task'}`,
            { taskId, priority, xpEarned: xpAmount },
            userId
        );

        // 5. AUTO-DEDUCT INVENTORY (The Neural Bridge)
        const requestsRef = collection(db, `projects/${projectId}/material_requests`);
        const q = query(
            requestsRef,
            where("relatedTaskId", "==", taskId),
            where("status", "==", "approved") // Only processed if approved
        );
        const snapshot = await getDocs(q);

        for (const reqDoc of snapshot.docs) {
            const reqData = reqDoc.data();

            // Prevent Double Deduction
            if (reqData.stockDeducted) {
                console.log(`[NEURAL BRIDGE] Stock already deducted for request ${reqDoc.id}`);
                continue;
            }

            // Find matching item in Global Inventory
            // We assume 'item' field holds the name or we try to find by name. 
            // Better to have 'itemId' but legacy data might use name.
            // Let's try to query global_inventory by 'itemName' == reqData.item

            const inventoryRef = collection(db, 'global_inventory'); // Ensure this matches user's global inv collection
            const qInv = query(inventoryRef, where("itemName", "==", reqData.item));
            const invSnap = await getDocs(qInv);

            if (!invSnap.empty) {
                const invDoc = invSnap.docs[0];
                const invId = invDoc.id;
                const qtyToDeduct = parseFloat(reqData.quantity) || 0;

                if (qtyToDeduct > 0) {
                    // Decrement Global Stock
                    await updateDoc(doc(db, 'global_inventory', invId), {
                        quantity: increment(-qtyToDeduct),
                        lastUpdated: serverTimestamp()
                    });

                    // Mark Request as Deducted
                    await updateDoc(reqDoc.ref, {
                        stockDeducted: true,
                        deductedAt: serverTimestamp()
                    });

                    // Log Deduction
                    await logActivity(
                        projectId,
                        'stock',
                        `Auto-deducted ${qtyToDeduct} ${invDoc.data().unit} of ${reqData.item}`,
                        { type: 'consumption', taskId, requestId: reqDoc.id },
                        "SYSTEM"
                    );

                    console.log(`[NEURAL BRIDGE] Deducted ${qtyToDeduct} of ${reqData.item}`);
                }
            } else {
                console.warn(`[NEURAL BRIDGE] Could not find global stock for item: ${reqData.item}`);
            }
        }

        console.log(`[NEURAL BRIDGE] Task completion sequence finished. XP Granted: ${xpAmount}`);
        return true;

    } catch (error) {
        console.error("[NEURAL BRIDGE] Task completion failed:", error);
        throw error;
    }
};
