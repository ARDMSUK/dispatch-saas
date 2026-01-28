
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TariffsTab from "./_components/TariffsTab";
import FixedPricesTab from "./_components/FixedPricesTab";
import SurchargesTab from "./_components/SurchargesTab";

export default function PricingPage() {
    return (
        <div className="h-full flex flex-col p-4 bg-zinc-50 gap-4">
            <h1 className="text-2xl font-bold text-zinc-800">Pricing Management</h1>
            <p className="text-zinc-500 -mt-2 mb-2">Configure tariffs, fixed prices, and surcharges.</p>

            <Tabs defaultValue="tariffs" className="w-full">
                <TabsList className="bg-zinc-200">
                    <TabsTrigger value="tariffs">General Tariffs</TabsTrigger>
                    <TabsTrigger value="fixed">Fixed Prices</TabsTrigger>
                    <TabsTrigger value="surcharges">Surcharges</TabsTrigger>
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
