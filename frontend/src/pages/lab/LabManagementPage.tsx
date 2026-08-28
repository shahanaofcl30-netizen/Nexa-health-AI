import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileText,
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { LabOrder, Patient, Doctor } from '../../types/shared';

export const LabManagementPage: React.FC = () => {
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<LabOrder | null>(null);

  // New Order Form
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    clinicalNotes: 'Routine comprehensive metabolic panel and lipid profile',
    testNames: ['Serum Creatinine', 'Serum Potassium', 'Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol'],
  });

  // Result Entry Form
  const [testResults, setTestResults] = useState<any[]>([]);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const [labRes, patRes] = await Promise.all([
        api.get('/labs'),
        api.get('/patients'),
      ]);
      const allPatients = patRes.data;
      
      const filteredLabs = labRes.data.filter((lab: any) => {
        const patient = allPatients.find((p: any) => p.id === lab.patientId);
        if (patient) {
          const fullName = `${patient.firstName} ${patient.lastName || ''}`.toLowerCase();
          if (fullName.includes('emily davis')) return false;
        }
        return true;
      });

      setLabOrders(filteredLabs);
      setPatients(allPatients);
      if (allPatients.length > 0 && !orderForm.patientId) {
        setOrderForm((prev) => ({ ...prev, patientId: allPatients[0].id }));
      }
    } catch (err) {
      console.error('Failed to load lab orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tests = orderForm.testNames.map((name) => ({
        testName: name,
        testCategory: name.includes('Cholesterol') || name.includes('HDL') || name.includes('LDL') ? 'Lipid Panel' : 'Biochemistry',
        referenceRange: name === 'HDL Cholesterol' ? '> 50 mg/dL' : name === 'Serum Creatinine' ? '0.60 - 1.10 mg/dL' : '< 200 mg/dL',
      }));

      await api.post('/labs', {
        patientId: orderForm.patientId,
        doctorId: '40000000-0000-0000-0000-000000000001',
        clinicalNotes: orderForm.clinicalNotes,
        tests,
      });

      setIsOrderModalOpen(false);
      fetchLabs();
    } catch (err) {
      console.error('Failed to create lab order:', err);
    }
  };

  const handleOpenResultModal = (order: LabOrder) => {
    setActiveOrder(order);
    setTestResults(
      order.tests.map((t) => ({
        id: t.id,
        testName: t.testName,
        testCategory: t.testCategory,
        resultValue: t.resultValue || '',
        unit: t.unit || 'mg/dL',
        referenceRange: t.referenceRange || 'Standard',
        isAbnormal: Boolean(t.isAbnormal),
      }))
    );
    setIsResultModalOpen(true);
  };

  const handleSaveResults = async () => {
    if (!activeOrder) return;
    try {
      await api.put(`/labs/${activeOrder.id}/results`, {
        tests: testResults,
        status: 'completed',
      });
      setIsResultModalOpen(false);
      fetchLabs();
    } catch (err) {
      console.error('Failed to save test results:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Laboratory & Diagnostics</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              LabReportAgent Enabled
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Diagnostic test orders, specimen processing, AI abnormal biomarker detection & plain-language patient explanations
          </p>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Lab Test Order</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {labOrders.map((order) => {
          const patient = patients.find((p) => p.id === order.patientId) || order.patient;
          return (
            <div key={order.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}{' '}
                      <span className="text-xs font-mono text-slate-400 font-normal">({patient?.mrn || 'NX-2026'})</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ordered: {new Date(order.orderedAt).toLocaleString()} • Notes: {order.clinicalNotes || 'None'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                      order.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : order.status === 'processing'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {order.status}
                  </span>

                  <button
                    onClick={() => handleOpenResultModal(order)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    {order.status === 'completed' ? 'Edit Results' : 'Enter Test Results'}
                  </button>
                </div>
              </div>

              {/* AI Lab Analysis Synthesis Banner */}
              {order.aiAnalysis && (
                <div className="p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-300 flex items-center space-x-1.5">
                      <Bot className="w-4 h-4 text-brand-400" />
                      <span>LabReportAgent Clinical Synthesis</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Autonomous Evaluation</span>
                  </div>

                  <p className="text-slate-200 leading-relaxed">{order.aiAnalysis.plainLanguageSummary}</p>

                  {order.aiAnalysis.abnormalFindings?.length > 0 && (
                    <div className="pt-1 flex items-center space-x-2 text-rose-400 font-medium text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Abnormal Findings: {order.aiAnalysis.abnormalFindings.join('; ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Individual Tests Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {order.tests?.map((test) => (
                  <div
                    key={test.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      test.isAbnormal
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">{test.testName}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">{test.testCategory}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-sm font-bold font-mono ${
                          test.isAbnormal ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {test.resultValue ? `${test.resultValue} ${test.unit}` : 'Pending Result'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Ref: {test.referenceRange}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Lab Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Order Laboratory Diagnostics</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Patient</label>
                <select
                  value={orderForm.patientId}
                  onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
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
                <label className="block text-slate-400 mb-1">Clinical Indication / Reason</label>
                <input
                  type="text"
                  value={orderForm.clinicalNotes}
                  onChange={(e) => setOrderForm({ ...orderForm, clinicalNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tests Included in Panel</label>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-slate-300">
                  {orderForm.testNames.map((t, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Create Lab Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result Entry & AI Evaluation Modal */}
      {isResultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Enter Laboratory Specimen Results</h3>
              </div>
              <button onClick={() => setIsResultModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {testResults.map((test, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{test.testName}</span>
                    <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={test.isAbnormal}
                        onChange={(e) => {
                          const next = [...testResults];
                          next[idx].isAbnormal = e.target.checked;
                          setTestResults(next);
                        }}
                        className="rounded accent-rose-500"
                      />
                      <span className={test.isAbnormal ? 'text-rose-400 font-bold' : ''}>Flag Abnormal</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Result value (e.g. 182)"
                      value={test.resultValue}
                      onChange={(e) => {
                        const next = [...testResults];
                        next[idx].resultValue = e.target.value;
                        setTestResults(next);
                      }}
                      className="px-3 py-1.5 rounded-lg glass-input text-white text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g. mg/dL)"
                      value={test.unit}
                      onChange={(e) => {
                        const next = [...testResults];
                        next[idx].unit = e.target.value;
                        setTestResults(next);
                      }}
                      className="px-3 py-1.5 rounded-lg glass-input text-white text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Reference range"
                      value={test.referenceRange}
                      onChange={(e) => {
                        const next = [...testResults];
                        next[idx].referenceRange = e.target.value;
                        setTestResults(next);
                      }}
                      className="px-3 py-1.5 rounded-lg glass-input text-white text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Saving will trigger autonomous <strong className="text-brand-400">LabReportAgent</strong> evaluation.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResultModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveResults}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Save & Trigger AI Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
