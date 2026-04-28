'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

type EntityType = 'customers' | 'drivers' | 'vehicles' | null;

const ENTITY_SCHEMAS = {
    customers: [
        { key: 'name', label: 'Full Name', required: true },
        { key: 'phone', label: 'Phone Number', required: true },
        { key: 'email', label: 'Email Address', required: false },
        { key: 'notes', label: 'Notes/Comments', required: false },
    ],
    drivers: [
        { key: 'name', label: 'Full Name', required: true },
        { key: 'phone', label: 'Phone Number', required: true },
        { key: 'callsign', label: 'Callsign / ID', required: true },
        { key: 'email', label: 'Email Address', required: false },
    ],
    vehicles: [
        { key: 'reg', label: 'Registration Plate', required: true },
        { key: 'make', label: 'Make', required: true },
        { key: 'model', label: 'Model', required: true },
        { key: 'type', label: 'Type (e.g. Saloon)', required: false },
    ]
};

export default function DataMigrationHub() {
    const [step, setStep] = useState(1);
    const [entityType, setEntityType] = useState<EntityType>(null);
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isImporting, setIsImporting] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);

        Papa.parse(uploadedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast.error("Error parsing CSV file");
                    console.error(results.errors);
                    return;
                }
                if (results.meta.fields) {
                    setCsvHeaders(results.meta.fields);
                    setCsvData(results.data);
                    toast.success(`Loaded ${results.data.length} rows`);
                    setStep(2);
                }
            }
        });
    };

    const handleMappingChange = (systemField: string, csvHeader: string) => {
        setMapping(prev => ({
            ...prev,
            [systemField]: csvHeader
        }));
    };

    const validateMapping = () => {
        if (!entityType) return false;
        const schema = ENTITY_SCHEMAS[entityType];
        for (const field of schema) {
            if (field.required && !mapping[field.key]) {
                return false;
            }
        }
        return true;
    };

    const handleImport = async () => {
        if (!entityType) return;
        setIsImporting(true);

        try {
            // Transform the data according to the mapping
            const payload = csvData.map(row => {
                const newRow: any = {};
                for (const [systemKey, csvHeader] of Object.entries(mapping)) {
                    if (csvHeader && row[csvHeader]) {
                        newRow[systemKey] = row[csvHeader];
                    }
                }
                return newRow;
            });

            const res = await fetch('/api/settings/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityType, data: payload })
            });

            if (res.ok) {
                const result = await res.json();
                toast.success(`Successfully imported ${result.count} records!`);
                setStep(4);
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to import data");
            }
        } catch (error) {
            toast.error("A network error occurred during import.");
        } finally {
            setIsImporting(false);
        }
    };

    const resetWizard = () => {
        setStep(1);
        setEntityType(null);
        setFile(null);
        setCsvHeaders([]);
        setCsvData([]);
        setMapping({});
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Data Migration Hub</h1>
                    <p className="text-slate-500">Smart CSV Mapper for iCabbi, Autocab, or generic exports.</p>
                </div>
                {step > 1 && step < 4 && (
                    <Button variant="outline" onClick={resetWizard}>Cancel Import</Button>
                )}
            </div>

            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Upload Export File</CardTitle>
                        <CardDescription>Upload a CSV file containing the data you wish to migrate.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                            <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Click or drag a CSV file here</h3>
                            <p className="text-slate-500 text-sm">Make sure the file includes a header row.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Select Entity Type</CardTitle>
                        <CardDescription>What kind of data does this file contain?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select onValueChange={(value) => setEntityType(value as EntityType)}>
                            <SelectTrigger className="w-full text-lg h-12">
                                <SelectValue placeholder="Select Data Type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customers">Passengers / Customers</SelectItem>
                                <SelectItem value="drivers">Drivers</SelectItem>
                                <SelectItem value="vehicles">Vehicles</SelectItem>
                            </SelectContent>
                        </Select>
                        {entityType && (
                            <div className="pt-4 flex justify-end">
                                <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                                    Next: Map Columns <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {step === 3 && entityType && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 3: Smart Mapper</CardTitle>
                        <CardDescription>Match your CSV columns to the CABAI system fields.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <p className="text-sm">
                                We detected <strong>{csvHeaders.length} columns</strong> and <strong>{csvData.length} rows</strong>. Please map the required fields below. Unmapped columns will be ignored.
                            </p>
                        </div>

                        <div className="border rounded-md divide-y">
                            <div className="grid grid-cols-2 bg-slate-50 p-3 font-semibold text-sm">
                                <div>CABAI System Field</div>
                                <div>Your CSV Column</div>
                            </div>
                            {ENTITY_SCHEMAS[entityType].map((field) => (
                                <div key={field.key} className="grid grid-cols-2 p-3 items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{field.label}</span>
                                        {field.required && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Required</span>}
                                    </div>
                                    <div>
                                        <Select onValueChange={(val) => handleMappingChange(field.key, val)} value={mapping[field.key] || ''}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Ignore this field" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IGNORE">-- Ignore this field --</SelectItem>
                                                {csvHeaders.map(header => (
                                                    <SelectItem key={header} value={header}>{header}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                        <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button 
                            onClick={handleImport} 
                            disabled={!validateMapping() || isImporting} 
                            className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
                        >
                            {isImporting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                            ) : (
                                <><UploadCloud className="w-4 h-4 mr-2" /> Start Bulk Import</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 4 && (
                <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center space-y-4">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        <h2 className="text-2xl font-bold text-emerald-800">Migration Complete!</h2>
                        <p className="text-emerald-700 max-w-md">
                            Your data has been successfully imported into the CABAI platform and is now ready to use.
                        </p>
                        <Button onClick={resetWizard} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                            Import Another File
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
