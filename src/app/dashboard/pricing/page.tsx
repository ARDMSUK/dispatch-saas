
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TariffsTab from "./_components/TariffsTab";
import FixedPricesTab from "./_components/FixedPricesTab";
import SurchargesTab from "./_components/SurchargesTab";

export default function PricingPage() {
    return (
        <div className="h-full flex flex-col p-4 bg-zinc-950 gap-4">
            <h1 className="text-2xl font-bold text-white">Pricing Management</h1>
            <p className="text-zinc-400 -mt-2 mb-2">Configure tariffs, fixed prices, and surcharges.</p>

            <Tabs defaultValue="tariffs" className="w-full">
                <TabsList className="bg-zinc-900 border border-white/10">
                    <TabsTrigger value="tariffs" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">General Tariffs</TabsTrigger>
                    <TabsTrigger value="fixed" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Fixed Prices</TabsTrigger>
                    <TabsTrigger value="surcharges" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Surcharges</TabsTrigger>
                </TabsList>

                <TabsContent value="tariffs">
                    <TariffsTab />
                </TabsContent>

                <TabsContent value="fixed">
                    <FixedPricesTab />
                </TabsContent>

                <TabsContent value="surcharges">
                    <SurchargesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
