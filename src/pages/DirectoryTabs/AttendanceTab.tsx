import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { BananaCard } from "../../components/ui/BananaCard";
import { User, Calendar, Clock, MapPin, FileUser } from "lucide-react";

interface AttendanceRecord {
    id: string;
    uid: string;
    type: 'in' | 'out';
    timestamp: any;
    locationName?: string;
    workReport?: string;
}

export function AttendanceTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [logs, setLogs] = useState<AttendanceRecord[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

    // Fetch Users
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

            // PURGE EXTERNAL ROLES
            const EXCLUDED_ROLES = ['client', 'sub contractor', 'sub_contractor'];
            const validUsers = allUsers.filter((user: any) => {
                const userRole = user.role?.toLowerCase() || '';
                return !EXCLUDED_ROLES.includes(userRole);
            });

            setUsers(validUsers);
        });
        return () => unsub();
    }, []);

    // Fetch Logs based on Month & User
    useEffect(() => {
        const date = new Date(selectedMonth + "-01"); // First day of month
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        // Base Query: Date Range
        let q = query(
            collection(db, "attendance"),
            orderBy("timestamp", "desc")
        );

        // Note: Firestore requires composite indexes for range filters on different fields combined with equality.
        // To avoid index creation delays, we'll fetch wider and filter in client (since attendance logs aren't massive yet).
        // Or at least fetch all for the user/month if possible.
        // Let's just fetch ALL attendance for now and filter client side. Reliability > Optimization for this sprint.

        const unsub = onSnapshot(q, (snap) => {
            const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));

            // Client Filter
            const filtered = allLogs.filter(log => {
                const logDate = log.timestamp?.toDate();
                if (!logDate) return false;

                const inMonth = logDate >= start && logDate <= end;
                const userMatch = selectedUser === "all" || log.uid === selectedUser;

                // SECURITY CHECK: Ensure user is in our valid internal list
                const isValidUser = users.some(u => u.uid === log.uid);

                return inMonth && userMatch && isValidUser;


            });

            setLogs(filtered);
        });

        return () => unsub();
    }, [selectedUser, selectedMonth]);

    // PROCESS DATA: Group by Date & User
    // We want a list of "Days" where we show In/Out/Hours
    // If "All Users" selected -> List all events or group by user?
    // User requested: Table Columns: Date | Check In | Check Out | Total Hours | Location | Work Report.
    // This implies a linear list of "Day Records".
    // If multiple users are selected, we should probably show "User" column too or grouping.
    // Let's assume linear table, sorted by Date desc.

    const processedRows = logs.reduce((acc: any[], log) => {
        const dateKey = format(log.timestamp.toDate(), "yyyy-MM-dd");
        // Key needs to be unique per USER per DAY
        const key = `${dateKey}_${log.uid}`;

        if (!acc[key as any]) {
            acc[key as any] = {
                date: log.timestamp.toDate(),
                uid: log.uid,
                inTime: null,
                outTime: null,
                location: null,
                report: null,
                xp: 0
            };
        }

        const entry = acc[key as any];
        if (log.type === 'in') {
            // Keep the EARLIEST check in if multiple? Or latest? Usually First In.
            if (!entry.inTime || log.timestamp.toDate() < entry.inTime) {
                entry.inTime = log.timestamp.toDate();
                if (log.locationName) entry.location = log.locationName;
            }
            entry.xp += 20; // Estimated from our rule
        } else if (log.type === 'out') {
            // Keep LATEST check out
            if (!entry.outTime || log.timestamp.toDate() > entry.outTime) {
                entry.outTime = log.timestamp.toDate();
                if (log.workReport) entry.report = log.workReport;
                // Update location if out has it and in doesn't, or just overwrite
                if (log.locationName) entry.location = log.locationName;
            }
            entry.xp += 50;
        }
        return acc;
    }, {} as any);

    const tableRows = Object.values(processedRows).sort((a: any, b: any) => b.date - a.date);

    // Stats
    const totalDays = Object.keys(processedRows).length;
    const totalXP = tableRows.reduce((sum: number, r: any) => sum + r.xp, 0);
    const totalMinutes = tableRows.reduce((sum: number, r: any) => {
        if (r.inTime && r.outTime) {
            return sum + differenceInMinutes(r.outTime, r.inTime);
        }
        return sum;
    }, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const getUserName = (uid: string) => users.find(u => u.uid === uid)?.displayName || uid.substring(0, 5);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Team Member</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:border-yellow-500/50"
                        >
                            <option value="all">All Team Members</option>
                            {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Month</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BananaCard className="p-4 flex items-center gap-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalDays}</div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">Days Present</div>
                    </div>
                </BananaCard>

                <BananaCard className="p-4 flex items-center gap-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalHours} <span className="text-sm text-zinc-600 font-normal">hrs</span></div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">Total Time</div>
                    </div>
                </BananaCard>

                <BananaCard className="p-4 flex items-center gap-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <FileUser className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalXP} <span className="text-sm text-zinc-600 font-normal">xp</span></div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">Value Earned</div>
                    </div>
                </BananaCard>
            </div>

            {/* Attendance Table */}
            <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-950/50 text-xs text-zinc-500 uppercase border-b border-white/5">
                            <th className="p-4 font-medium">Date / User</th>
                            <th className="p-4 font-medium">Timeline</th>
                            <th className="p-4 font-medium">Work Report</th>
                            <th className="p-4 font-medium text-right">Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {tableRows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">
                                    No attendance records found for this selection.
                                </td>
                            </tr>
                        ) : (
                            tableRows.map((row: any) => (
                                <tr key={`${row.date}_${row.uid}`} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 align-top">
                                        <div className="font-bold text-zinc-200">
                                            {format(row.date, "MMM dd, yyyy")}
                                        </div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                            <User className="w-3 h-3" /> {getUserName(row.uid)}
                                        </div>
                                        {row.location && (
                                            <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <MapPin className="w-3 h-3" /> {row.location}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="space-y-1">
                                            {row.inTime && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-green-500 font-mono font-bold">IN</span>
                                                    <span className="text-zinc-300">{format(row.inTime, "h:mm a")}</span>
                                                </div>
                                            )}
                                            {row.outTime && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-zinc-500 font-mono font-bold">OUT</span>
                                                    <span className="text-zinc-300">{format(row.outTime, "h:mm a")}</span>
                                                </div>
                                            )}
                                            {!row.outTime && row.inTime && (
                                                <div className="text-[10px] text-green-500 animate-pulse mt-1">
                                                    Currently Active
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        {row.report ? (
                                            <p className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-white/5 italic">
                                                "{row.report}"
                                            </p>
                                        ) : (
                                            <span className="text-xs text-zinc-600 italic">No report filed.</span>
                                        )}
                                    </td>
                                    <td className="p-4 align-top text-right">
                                        {row.inTime && row.outTime ? (
                                            <div className="font-mono text-zinc-200 font-bold">
                                                {(differenceInMinutes(row.outTime, row.inTime) / 60).toFixed(1)}h
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600">--</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
