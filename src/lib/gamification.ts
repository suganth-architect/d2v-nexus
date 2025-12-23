import { runTransaction, doc } from "firebase/firestore";
import { db } from "./firebase";

export const LEVELS = {
    XP_PER_LEVEL: 1000
};

export async function grantXP(uid: string, amount: number, reason: string) {
    if (!uid) return;

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error("User does not exist!");
            }

            const userData = userDoc.data();
            const currentXP = userData.currentXP || 0;
            const newXP = currentXP + amount;

            // Level Calculation: Level = Math.floor(XP / 1000) + 1
            const newLevel = Math.floor(newXP / LEVELS.XP_PER_LEVEL) + 1;

            transaction.update(userRef, {
                currentXP: newXP,
                level: newLevel
            });

            // Optional: Log the XP grant somewhere if needed, but for now just updating user is enough.
        });
        console.log(`Granted ${amount} XP to ${uid} for ${reason}`);
    } catch (e) {
        console.error("Failed to grant XP:", e);
    }
}
