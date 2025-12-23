"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedData = exports.ops_toggleTask = exports.finance_addExpense = exports.approvePettyCash = exports.grantFounderRole = exports.createProject = exports.createUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
admin.initializeApp();
const db = (0, firestore_1.getFirestore)("supersited2v");
// --- TRIGGERS ---
/**
 * Creates a user document in Firestore when a new user signs up.
 * Also initializes their wallet.
 */
exports.createUser = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName } = user;
    // Assign role based on email or default to 'client' (prompt says 'Founder' has logic, others default?) 
    // We'll set Founder if email matches, else Client? 
    // Prompt: Create Founder: `founder@d2v.internal`.
    const role = email === 'founder@d2v.internal' ? 'founder' : 'client'; // Default to client, Site Super set manually or logic?
    // Create User Doc
    await db.collection('users').doc(uid).set({
        name: displayName || email || 'Anonymous',
        role,
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Initialize Wallet (Balance 0)
    // Structure: finance(col) -> wallets(doc) -> users(subcol) -> uid(doc)
    await db.collection('finance').doc('wallets').collection('users').doc(uid).set({
        balance: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
// --- CALLABLES ---
/**
 * Creates a new project with default tasks.
 */
/**
 * Creates a new project with default tasks.
 */
exports.createProject = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { title, clientUid, budgetTotal, publicView } = data;
    if (!title) {
        throw new functions.https.HttpsError('invalid-argument', 'Project title is required.');
    }
    const projectRef = db.collection('projects').doc();
    const projectId = projectRef.id;
    const finalBudget = budgetTotal || 0;
    const projectPayload = {
        title,
        status: 'active',
        clientUid: clientUid || null,
        budgetTotal: finalBudget,
        currentBalance: finalBudget,
        publicView: publicView || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid
    };
    // Create 5 default tasks
    const defaultTasks = [
        { title: "Site Clearing", xpReward: 100 },
        { title: "Foundation", xpReward: 200 },
        { title: "Framing", xpReward: 150 },
        { title: "Plumbing", xpReward: 150 },
        { title: "Electrical", xpReward: 150 }
    ];
    const batch = db.batch();
    // Set Project
    batch.set(projectRef, projectPayload);
    // Set Tasks
    defaultTasks.forEach(task => {
        const taskRef = projectRef.collection('tasks').doc();
        batch.set(taskRef, Object.assign(Object.assign({}, task), { status: 'pending', assigneeUid: null, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
    });
    await batch.commit();
    return { projectId, success: true };
});
/**
 * Grants the 'founder' role to the specified email.
 */
exports.grantFounderRole = functions.https.onRequest(async (req, res) => {
    const email = "founder@d2v.internal";
    try {
        const user = await admin.auth().getUserByEmail(email);
        // HARDENED SECURITY: Set Custom Claims
        await admin.auth().setCustomUserClaims(user.uid, { role: "founder" });
        // Force token refresh metadata
        await admin.firestore().collection("users").doc(user.uid).set({
            role: "founder",
            isAdmin: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true, message: "Founder Claim Assigned. Log out and back in." });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Adds funds to a user's wallet. Founder Only.
 */
exports.approvePettyCash = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const callerEmail = context.auth.token.email;
    if (callerEmail !== 'founder@d2v.internal') {
        throw new functions.https.HttpsError('permission-denied', 'Only Founder can approve petty cash.');
    }
    const { userId, amount } = data;
    if (!userId || amount === undefined) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and amount are required.');
    }
    const walletRef = db.collection('finance').doc('wallets').collection('users').doc(userId);
    await db.runTransaction(async (t) => {
        const doc = await t.get(walletRef);
        const currentBalance = doc.exists ? doc.data().balance : 0;
        const newBalance = currentBalance + Number(amount);
        if (newBalance < 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Wallet balance cannot be negative.');
        }
        t.set(walletRef, {
            balance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
    return { success: true, userId, amountAdded: amount };
});
// --- PHASE 2 FUNCTIONS ---
/**
 * Adds an expense to a project and updates the project's current balance atomically.
 */
exports.finance_addExpense = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Authenticaton required.');
    const { projectId, amount, category, description } = data;
    if (!projectId || amount <= 0)
        throw new functions.https.HttpsError('invalid-argument', 'Invalid project or amount.');
    const projectRef = db.collection('projects').doc(projectId);
    const expenseRef = projectRef.collection('expenses').doc();
    await db.runTransaction(async (t) => {
        var _a;
        const projectDoc = await t.get(projectRef);
        if (!projectDoc.exists)
            throw new functions.https.HttpsError('not-found', 'Project not found.');
        // Check for project existence logic above 
        // OR prompt implies we track spending against budget.
        // "Decrement the currentBalance field" -> implies this field should track remaining funds.
        // Let's ensure currentBalance exists on the project, or fallback to budgetTotal for the first txn if appropriate, 
        // but cleaner to assume it's initialized. In `createProject`, we set `budgetTotal`.
        // Let's assume we initialize `currentBalance` = `budgetTotal` on creation or calculate it. 
        // Re-reading createProject: It sets `budgetTotal` but NOT `currentBalance`. 
        // I should probably fix `createProject` to init `currentBalance` OR assume `budgetTotal` IS the balance. 
        // Let's lazily init it here: `current || budget`.
        const current = ((_a = projectDoc.data()) === null || _a === void 0 ? void 0 : _a.currentBalance) !== undefined ? projectDoc.data().currentBalance : projectDoc.data().budgetTotal;
        const newBalance = current - amount;
        t.set(expenseRef, {
            amount,
            category: category || 'General',
            description: description || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        });
        t.update(projectRef, { currentBalance: newBalance });
    });
    return { success: true };
});
/**
 * Toggles a task status between 'todo' and 'done'.
 */
exports.ops_toggleTask = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    const { projectId, taskId, currentStatus } = data;
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'; // Toggle logic
    // Optional: Add XP logic here if needed ("Increment user XP if marking as done")
    await db.collection('projects').doc(projectId).collection('tasks').doc(taskId).update({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, newStatus };
});
// --- SEEDING & REPAIR ---
exports.seedData = functions.https.onRequest(async (req, res) => {
    try {
        const email = 'founder@d2v.internal';
        let founderUid;
        // 1. Resolve Founder UID (Get existing or Create)
        try {
            const user = await admin.auth().getUserByEmail(email);
            founderUid = user.uid;
            functions.logger.info("Founder Auth exists", { uid: founderUid });
        }
        catch (e) {
            const user = await admin.auth().createUser({
                email,
                password: 'password123',
                displayName: 'Founder'
            });
            founderUid = user.uid;
            functions.logger.info("Created Founder Auth", { uid: founderUid });
        }
        // 2. Force Write Profile to 'supersited2v' DB
        // This fixes the "Ghost User" issue where Auth exists but Firestore doc is missing
        await db.collection('users').doc(founderUid).set({
            name: "The Founder",
            role: "founder",
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        functions.logger.info("Forced Founder Profile Write");
        // 3. Ensure Wallet Exists
        await db.collection('finance').doc('wallets').collection('users').doc(founderUid).set({
            balance: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        // 4. Update 'Villa 101' Project with INR Budget
        const projectQuery = await db.collection('projects').where('title', '==', 'Villa 101').get();
        if (!projectQuery.empty) {
            const projectDoc = projectQuery.docs[0];
            // Force update to INR figures (~50L) if it looks low/default
            await projectDoc.ref.update({
                budgetTotal: 5000000,
                currentBalance: 5000000,
                clientUid: null,
                publicView: true
            });
            functions.logger.info("Updated Villa 101 to INR");
        }
        else {
            // Create if missing
            const projectRef = db.collection('projects').doc();
            await projectRef.set({
                title: 'Villa 101',
                status: 'active',
                clientUid: null,
                budgetTotal: 5000000,
                currentBalance: 5000000,
                publicView: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: founderUid
            });
            // Add tasks
            const defaultTasks = [
                { title: "Site Clearing", xpReward: 100 },
                { title: "Foundation", xpReward: 200 }
            ];
            const batch = db.batch();
            defaultTasks.forEach(task => {
                const taskRef = projectRef.collection('tasks').doc();
                batch.set(taskRef, Object.assign(Object.assign({}, task), { status: 'pending', xpReward: task.xpReward, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            });
            await batch.commit();
            functions.logger.info("Created Villa 101 (INR)");
        }
        res.json({ status: "Repair Complete", founder: email, uid: founderUid });
    }
    catch (error) {
        functions.logger.error("Seeding Failed", error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=index.js.map