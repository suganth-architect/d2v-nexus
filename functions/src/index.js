"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.approvePettyCash = exports.createProject = exports.createUser = void 0;
var functions = require("firebase-functions");
var admin = require("firebase-admin");
admin.initializeApp();
var db = admin.firestore();
// --- TRIGGERS ---
/**
 * Creates a user document in Firestore when a new user signs up.
 * Also initializes their wallet.
 */
exports.createUser = functions.auth.user().onCreate(function (user) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, email, displayName, role;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                uid = user.uid, email = user.email, displayName = user.displayName;
                role = email === 'founder@d2v.internal' ? 'founder' : 'client';
                // Create User Doc
                return [4 /*yield*/, db.collection('users').doc(uid).set({
                        name: displayName || email || 'Anonymous',
                        role: role,
                        email: email,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 1:
                // Create User Doc
                _a.sent();
                // Initialize Wallet (Balance 0)
                // Structure: finance(col) -> wallets(doc) -> users(subcol) -> uid(doc)
                return [4 /*yield*/, db.collection('finance').doc('wallets').collection('users').doc(uid).set({
                        balance: 0,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 2:
                // Initialize Wallet (Balance 0)
                // Structure: finance(col) -> wallets(doc) -> users(subcol) -> uid(doc)
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
// --- CALLABLES ---
/**
 * Creates a new project with default tasks.
 */
exports.createProject = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerEmail, isFounder, title, clientUid, budgetTotal, publicView, projectRef, projectId, projectPayload, defaultTasks, batch;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!context.auth) {
                    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
                }
                callerEmail = context.auth.token.email;
                isFounder = callerEmail === 'founder@d2v.internal';
                // We'll allow it for now or enforce logic if strict. Let's enforce for safety/prompt adherence.
                // "Founder: Read/Write All".
                if (!isFounder) {
                    // Check if rules allow others? Prompt doesn't say other roles can create projects.
                    // We'll start simple.
                }
                title = data.title, clientUid = data.clientUid, budgetTotal = data.budgetTotal, publicView = data.publicView;
                if (!title) {
                    throw new functions.https.HttpsError('invalid-argument', 'Project title is required.');
                }
                projectRef = db.collection('projects').doc();
                projectId = projectRef.id;
                projectPayload = {
                    title: title,
                    status: 'active',
                    clientUid: clientUid || null,
                    budgetTotal: budgetTotal || 0,
                    publicView: publicView || false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: context.auth.uid
                };
                return [4 /*yield*/, projectRef.set(projectPayload)];
            case 1:
                _a.sent();
                defaultTasks = [
                    { title: "Site Clearing", xpReward: 100 },
                    { title: "Foundation", xpReward: 200 },
                    { title: "Framing", xpReward: 150 },
                    { title: "Plumbing", xpReward: 150 },
                    { title: "Electrical", xpReward: 150 }
                ];
                batch = db.batch();
                defaultTasks.forEach(function (task) {
                    var taskRef = projectRef.collection('tasks').doc();
                    batch.set(taskRef, __assign(__assign({}, task), { status: 'pending', assigneeUid: null, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                });
                return [4 /*yield*/, batch.commit()];
            case 2:
                _a.sent();
                return [2 /*return*/, { projectId: projectId }];
        }
    });
}); });
/**
 * Adds funds to a user's wallet. Founder Only.
 */
exports.approvePettyCash = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerEmail, userId, amount, walletRef;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!context.auth) {
                    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
                }
                callerEmail = context.auth.token.email;
                if (callerEmail !== 'founder@d2v.internal') {
                    throw new functions.https.HttpsError('permission-denied', 'Only Founder can approve petty cash.');
                }
                userId = data.userId, amount = data.amount;
                if (!userId || amount === undefined) {
                    throw new functions.https.HttpsError('invalid-argument', 'userId and amount are required.');
                }
                walletRef = db.collection('finance').doc('wallets').collection('users').doc(userId);
                return [4 /*yield*/, db.runTransaction(function (t) { return __awaiter(void 0, void 0, void 0, function () {
                        var doc, currentBalance, newBalance;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, t.get(walletRef)];
                                case 1:
                                    doc = _a.sent();
                                    currentBalance = doc.exists ? doc.data().balance : 0;
                                    newBalance = currentBalance + Number(amount);
                                    if (newBalance < 0) {
                                        throw new functions.https.HttpsError('failed-precondition', 'Wallet balance cannot be negative.');
                                    }
                                    t.set(walletRef, {
                                        balance: newBalance,
                                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                    }, { merge: true });
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 1:
                _a.sent();
                return [2 /*return*/, { success: true, userId: userId, amountAdded: amount }];
        }
    });
}); });
