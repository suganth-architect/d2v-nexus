
import { BananaCard } from "../ui/BananaCard";
import { BananaButton } from "../ui/BananaButton";
import { FileText, Download, Plus } from "lucide-react";

export function InvoicesSection() {
    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Invoices</h3>
                <BananaButton className="text-xs px-3 py-1 h-8"><Plus className="w-4 h-4 mr-2" /> Generate Invoice</BananaButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mock Invoice 1 */}
                <BananaCard className="p-4 flex items-center justify-between group cursor-pointer hover:border-yellow-500/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-yellow-500/10 group-hover:text-yellow-500 transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">INV-2024-001</h4>
                            <p className="text-xs text-zinc-500">Paid on Oct 15, 2024</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-mono font-bold">₹5,00,000</div>
                        <BananaButton variant="ghost" className="h-6 px-2 text-xs text-zinc-500 hover:text-white mt-1">
                            <Download className="w-3 h-3 mr-1" /> PDF
                        </BananaButton>
                    </div>
                </BananaCard>

                {/* Mock Invoice 2 */}
                <BananaCard className="p-4 flex items-center justify-between group cursor-pointer hover:border-yellow-500/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-yellow-500/10 group-hover:text-yellow-500 transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">INV-2024-002</h4>
                            <p className="text-xs text-zinc-500">Due Dec 20, 2024</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-white font-mono font-bold">₹12,00,000</div>
                        <BananaButton variant="ghost" className="h-6 px-2 text-xs text-zinc-500 hover:text-white mt-1">
                            <Download className="w-3 h-3 mr-1" /> PDF
                        </BananaButton>
                    </div>
                </BananaCard>
            </div>
        </div>
    );
}
