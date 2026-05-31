
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TariffsTab from "./_components/TariffsTab";
import FixedPricesTab from "./_components/FixedPricesTab";
import SurchargesTab from "./_components/SurchargesTab";

export default function PricingPage() {
    return (
        <div className="h-full flex flex-col p-6 bg-background text-foreground gap-4 overflow-y-auto">
            <h1 className="text-2xl font-bold text-foreground">Pricing Management</h1>
            <p className="text-muted-foreground -mt-2 mb-2">Configure tariffs, fixed prices, and surcharges.</p>

            <Tabs defaultValue="tariffs" className="w-full">
                <TabsList className="bg-muted border border-border">
                    <TabsTrigger value="tariffs" className="data-[state=active]:bg-card shadow-sm border border-border data-[state=active]:text-foreground text-muted-foreground">General Tariffs</TabsTrigger>
                    <TabsTrigger value="fixed" className="data-[state=active]:bg-card shadow-sm border border-border data-[state=active]:text-foreground text-muted-foreground">Fixed Prices</TabsTrigger>
                    <TabsTrigger value="surcharges" className="data-[state=active]:bg-card shadow-sm border border-border data-[state=active]:text-foreground text-muted-foreground">Surcharges</TabsTrigger>
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
