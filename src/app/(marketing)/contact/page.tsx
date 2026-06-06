import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function CorporateContactPage() {
    return (
        <div className="w-full bg-white">
            <section className="pt-20 pb-16 bg-slate-50 border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Contact Sales</h1>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                        Ready to upgrade your dispatch system? Our team is here to help.
                    </p>
                </div>
            </section>

            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16">
                    {/* Contact Form */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a message</h2>
                        <form className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">First Name</label>
                                    <Input placeholder="John" className="h-12 bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Last Name</label>
                                    <Input placeholder="Smith" className="h-12 bg-slate-50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Work Email</label>
                                <Input type="email" placeholder="john@yourfleet.co.uk" className="h-12 bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Company Name</label>
                                <Input placeholder="Smith Taxis Ltd" className="h-12 bg-slate-50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Fleet Size</label>
                                <select className="flex h-12 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950">
                                    <option>1 - 10 vehicles</option>
                                    <option>11 - 50 vehicles</option>
                                    <option>51 - 100 vehicles</option>
                                    <option>100+ vehicles</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">How can we help?</label>
                                <textarea className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950" placeholder="Tell us about your current setup and what you're looking for..."></textarea>
                            </div>
                            <Button type="button" className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-base">
                                Submit Request
                            </Button>
                        </form>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">Get in Touch</h2>
                            <p className="text-lg text-slate-600 font-medium mb-8">
                                Whether you have a question about features, pricing, or need a technical demo, our UK-based team is ready to answer all your questions.
                            </p>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Phone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Sales & Support</h3>
                                        <a href="tel:02034321381" className="text-slate-600 hover:text-slate-900 text-lg">0203 432 1381</a>
                                        <p className="text-sm text-slate-500 mt-1">Mon-Fri from 9am to 6pm GMT.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Email Us</h3>
                                        <a href="mailto:hello@cabai.co.uk" className="text-slate-600 hover:text-slate-900 text-lg">hello@cabai.co.uk</a>
                                        <p className="text-sm text-slate-500 mt-1">We aim to respond within 24 hours.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Corporate Headquarters</h3>
                                        <p className="text-slate-600 text-lg">71-75 Shelton Street<br/>Covent Garden<br/>London, WC2H 9JQ</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="w-full h-80 bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden relative shadow-md">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.9050201659773!2d-0.12644268407421115!3d51.51494547963638!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604cc79d5df65%3A0xc3910543e33b6641!2s71-75%20Shelton%20St%2C%20London%20WC2H%209JQ%2C%20UK!5e0!3m2!1sen!2sus!4v1715091763116!5m2!1sen!2sus" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen={false} 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
