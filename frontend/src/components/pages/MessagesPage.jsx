import { Mail, Package } from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';

export const MessagesPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {/* Header */}
          <div className="dash-header">
            <div>
              <h1 className="inbox-view-title mb-1">Direct Seller Communications</h1>
              <p className="dash-subtitle">
                Contact waste generators and buyers directly via verified email or deal sourcing requests.
              </p>
            </div>
          </div>

          {/* Honest Empty State */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm text-center flex flex-col items-center gap-5 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Mail size={32} />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Email-Based Communication</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Direct in-app messaging is not enabled. Seller contact information (email address and business details) is attached directly to every listing in the Waste Marketplace.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 w-full text-left font-medium space-y-2">
              <p className="font-bold text-slate-800">How to contact a seller:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Browse available waste streams in the <strong>Marketplace</strong>.</li>
                <li>Click <strong>View Details</strong> on any product listing.</li>
                <li>Click <strong>Email Seller</strong> or <strong>Request to Source</strong> to submit an official inquiry.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setCurrentPage('marketplace')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <Package size={16} /> Browse Marketplace
              </button>
              <a
                href="mailto:support@ecomatch.ai?subject=Support%20Enquiry"
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-2 no-underline"
              >
                <Mail size={16} /> Contact Support
              </a>
            </div>
          </div>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};

export default MessagesPage;
