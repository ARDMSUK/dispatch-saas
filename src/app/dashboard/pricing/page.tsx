
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TariffsTab from "./_components/TariffsTab";
import FixedPricesTab from "./_components/FixedPricesTab";
import SurchargesTab from "./_components/SurchargesTab";

export default function PricingPage() {
    return (
        <div className="h-full flex flex-col p-4 bg-white gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Pricing Management</h1>
            <p className="text-slate-500 -mt-2 mb-2">Configure tariffs, fixed prices, and surcharges.</p>

            <Tabs defaultValue="tariffs" className="w-full">
                <TabsList className="bg-slate-100 border border-slate-200">
                    <TabsTrigger value="tariffs" className="data-[state=active]:bg-white shadow-sm border border-slate-200 data-[state=active]:text-slate-900 text-slate-500">General Tariffs</TabsTrigger>
                    <TabsTrigger value="fixed" className="data-[state=active]:bg-white shadow-sm border border-slate-200 data-[state=active]:text-slate-900 text-slate-500">Fixed Prices</TabsTrigger>
                    <TabsTrigger value="surcharges" className="data-[state=active]:bg-white shadow-sm border border-slate-200 data-[state=active]:text-slate-900 text-slate-500">Surcharges</TabsTrigger>
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
