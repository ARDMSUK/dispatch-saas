export default function CorporateAboutPage() {
    return (
        <div className="w-full bg-white">
            {/* Header */}
            <section className="pt-20 pb-16 bg-slate-50 border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">About CABAI</h1>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                        We are a technology company dedicated to modernizing the private hire and taxi industry through intelligent, cloud-based software.
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto space-y-12">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            The private hire industry has been historically underserved by modern technology, relying on outdated, legacy systems that are difficult to use and expensive to maintain. CABAI was founded with a singular mission: to provide operators of all sizes with enterprise-grade dispatch and management tools that are intuitive, scalable, and affordable.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">The CABAI Difference</h2>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                            Unlike traditional software providers that charge massive upfront fees and require localized servers, CABAI is 100% cloud-native. Our system updates seamlessly, handles massive spikes in demand automatically, and allows fleet owners to manage their business from a smartphone anywhere in the world.
                        </p>
                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                            We believe that by giving operators better tools, we ultimately create better experiences for drivers and passengers alike.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 mt-12">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Corporate Information</h3>
                        <dl className="space-y-4 text-slate-600 font-medium">
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-200 pb-2">
                                <dt className="text-slate-500">Company Name</dt>
                                <dd className="font-bold text-slate-900">CABAI Ltd</dd>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-200 pb-2">
                                <dt className="text-slate-500">Headquarters</dt>
                                <dd className="font-bold text-slate-900 text-right">71-75 Shelton Street, Covent Garden<br/>London, WC2H 9JQ</dd>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-200 pb-2">
                                <dt className="text-slate-500">Focus</dt>
                                <dd className="font-bold text-slate-900">B2B SaaS for Transportation</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </section>
        </div>
    );
}
