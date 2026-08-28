import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Invoice, Patient, InsuranceClaim } from '../../types/shared';

export const BillingManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'claims'>('invoices');
  const [loading, setLoading] = useState(true);

  // Payment Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  // AI Invoice Generation Modal
  const [isAgentInvoiceOpen, setIsAgentInvoiceOpen] = useState(false);
  const [agentPatientId, setAgentPatientId] = useState('');
  const [agentEncounterDetails, setAgentEncounterDetails] = useState(
    'Specialist Cardiology Consultation + Comprehensive Metabolic Panel + EKG Interpretation'
  );
  const [agentRunning, setAgentRunning] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [invRes, claimsRes, patRes] = await Promise.all([
        api.get('/billing/invoices'),
        api.get('/billing/claims'),
        api.get('/patients'),
      ]);
      setInvoices(invRes.data);
      setClaims(claimsRes.data);
      setPatients(patRes.data);
      if (patRes.data.length > 0 && !agentPatientId) {
        setAgentPatientId(patRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    try {
      await api.post(`/billing/invoices/${selectedInvoice.id}/pay`, { paymentMethod });
      setSelectedInvoice(null);
      fetchBillingData();
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  const handleRunBillingAgent = async () => {
    setAgentRunning(true);
    try {
      await api.post('/billing/invoices/generate-from-encounter', {
        patientId: agentPatientId,
        encounterDetails: agentEncounterDetails,
      });
      setIsAgentInvoiceOpen(false);
      fetchBillingData();
    } catch (err) {
      console.error('Billing agent execution failed:', err);
    } finally {
      setAgentRunning(false);
    }
  };

  const totalCollected = invoices.filter((i) => i.status === 'paid').reduce((acc, cur) => acc + cur.patientPayable, 0);
  const totalPending = invoices.filter((i) => i.status !== 'paid').reduce((acc, cur) => acc + cur.patientPayable, 0);
  const totalInsurance = invoices.reduce((acc, cur) => acc + cur.insuranceDiscount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Revenue Cycle</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Billing Agent Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Itemized invoicing, co-pay calculation, automated charge capture, and insurance claim settlement
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsAgentInvoiceOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all"
          >
            <Bot className="w-4 h-4 text-purple-400" />
            <span>Generate Invoice with AI</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Revenue Collected</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">₹{totalCollected.toFixed(2)}</p>
          <span className="text-[11px] text-slate-500 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            Settled via card, cash & portal
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Patient Co-Pays</span>
          <p className="text-2xl font-black text-amber-400 font-mono">₹{totalPending.toFixed(2)}</p>
          <span className="text-[11px] text-slate-500 flex items-center">
            <Clock className="w-3.5 h-3.5 text-amber-400 mr-1" />
            Due within 30 days
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Insurance Coverage Claimed</span>
          <p className="text-2xl font-black text-cyan-400 font-mono">₹{totalInsurance.toFixed(2)}</p>
          <span className="text-[11px] text-slate-500 flex items-center">
            <Shield className="w-3.5 h-3.5 text-cyan-400 mr-1" />
            Across partner payers
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'invoices'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Invoices & Payments ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'claims'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Insurance Claims ({claims.length})
        </button>
      </div>

      {/* Invoices View */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 && (
            <div className="p-8 text-center rounded-2xl glass-card border border-slate-800/60">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-slate-500" />
              </div>
              <h3 className="text-slate-300 font-semibold mb-1">No completed treatments to bill</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Invoices will be automatically generated here once a patient's treatment or clinical consultation is completed.
              </p>
            </div>
          )}
          {invoices.map((inv) => {
            const patient = patients.find((p) => p.id === inv.patientId) || inv.patient;
            return (
              <div
                key={inv.id}
                className="p-5 rounded-2xl glass-card border border-slate-800 glass-card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{inv.invoiceNumber}</span>
                    <span className="text-xs text-slate-400">
                      • {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded font-mono uppercase font-bold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300 animate-pulse'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  {/* Line items list */}
                  <div className="space-y-1 text-xs text-slate-300">
                    {inv.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <span className="text-slate-500">•</span>
                        <span>{item.description}</span>
                        <span className="font-mono text-slate-400">(₹{item.totalPrice.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4 text-[11px] font-mono pt-1 text-slate-400">
                    <span>Subtotal: ₹{inv.subtotal.toFixed(2)}</span>
                    <span className="text-cyan-400">Insurance: -₹{inv.insuranceDiscount.toFixed(2)}</span>
                    <span className="text-white font-bold">Payable: ₹{inv.patientPayable.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-auto">
                  {inv.status !== 'paid' ? (
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                    >
                      Collect Payment
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 font-bold flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Paid on {new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claims View */}
      {activeTab === 'claims' && (
        <div className="space-y-3">
          {claims.length === 0 && (
            <div className="p-8 text-center rounded-2xl glass-card border border-slate-800/60">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <h3 className="text-slate-300 font-semibold mb-1">No insurance claims</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Insurance claims will appear here once an invoice with insurance coverage is generated.
              </p>
            </div>
          )}
          {claims.map((claim) => (
            <div key={claim.id} className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-white">{claim.insuranceProvider}</span>
                  <span className="text-xs font-mono text-slate-400">Policy: {claim.policyNumber}</span>
                  <span className="text-[9px] px-2 py-0.2 rounded font-mono uppercase bg-cyan-500/20 text-cyan-300">
                    {claim.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</p>
              </div>

              <span className="text-base font-bold font-mono text-white">₹{claim.claimedAmount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Collect Patient Payment</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400">Invoice: {selectedInvoice.invoiceNumber}</span>
              <p className="text-xl font-black text-brand-400 font-mono">
                Amount Due: ₹{selectedInvoice.patientPayable.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
              >
                <option value="credit_card">Credit / Debit Card (Stripe Terminal)</option>
                <option value="cash">Cash Payment</option>
                <option value="insurance">Insurance Co-Pay Settlement</option>
                <option value="online">Online Patient Portal Transfer</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md"
              >
                Confirm & Issue Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Billing Agent Modal */}
      {isAgentInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-purple-500/40 p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Autonomous Billing Agent</h3>
              </div>
              <button onClick={() => setIsAgentInvoiceOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Patient</label>
                <select
                  value={agentPatientId}
                  onChange={(e) => setAgentPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Encounter & Procedure Notes</label>
                <textarea
                  rows={4}
                  value={agentEncounterDetails}
                  onChange={(e) => setAgentEncounterDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAgentInvoiceOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunBillingAgent}
                  disabled={agentRunning}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                >
                  {agentRunning ? 'Auto-Generating Invoice...' : 'Generate Itemized Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
