
import { BananaCard } from "../ui/BananaCard";
import { BananaButton } from "../ui/BananaButton";
import { Plus, AlertTriangle } from "lucide-react";

export function VariationsSection() {
    return (
        <BananaCard className="p-6 mb-8 border-l-4 border-l-orange-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" /> Variations / Extras
                    </h3>
                    <p className="text-xs text-zinc-500">Approvals pending for additional works</p>
                </div>
                <BananaButton variant="secondary" className="text-xs px-3 py-1 h-8"><Plus className="w-4 h-4 mr-2" /> New Variation</BananaButton>
            </div>

            <div className="space-y-3">
                {/* Mock Item 1 */}
                <div className="bg-zinc-900/50 p-4 rounded-lg flex justify-between items-center border border-zinc-800">
                    <div>
                        <h4 className="text-white text-sm font-medium">Extra Electrical Points (Living Room)</h4>
                        <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded mt-1 inline-block">Pending Approval</span>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-mono">₹12,500</div>
                    </div>
                </div>

                {/* Mock Item 2 */}
                <div className="bg-zinc-900/50 p-4 rounded-lg flex justify-between items-center border border-zinc-800">
                    <div>
                        <h4 className="text-white text-sm font-medium">Premium Granite Upgrade (Kitchen)</h4>
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded mt-1 inline-block">Approved</span>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-mono">₹45,000</div>
                    </div>
                </div>
            </div>
        </BananaCard>
    );
}
