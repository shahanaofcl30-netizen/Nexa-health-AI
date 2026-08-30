import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileCheck,
  FileText,
  Filter,
  FlaskConical,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { LabOrder, Patient, Doctor } from '../../types/shared';

// Standard Lab Test Catalog
const STANDARD_TESTS = [
  { name: 'Complete Blood Count (CBC)', category: 'Hematology', defaultRange: '4.5 - 11.0 x10^3/uL', unit: 'x10^3/uL' },
  { name: 'Blood Glucose (Fasting)', category: 'Biochemistry', defaultRange: '70 - 99 mg/dL', unit: 'mg/dL' },
  { name: 'HbA1c (Glycated Hemoglobin)', category: 'Diabetes / Endocrine', defaultRange: '< 5.7 %', unit: '%' },
  { name: 'Lipid Profile (Full Panel)', category: 'Lipid Panel', defaultRange: 'Desirable < 200 mg/dL', unit: 'mg/dL' },
  { name: 'Liver Function Test (LFT)', category: 'Hepatic Function', defaultRange: 'ALT: 7-56, AST: 10-40 U/L', unit: 'U/L' },
  { name: 'Kidney Function Test (KFT)', category: 'Renal Function', defaultRange: 'Creatinine: 0.6 - 1.2 mg/dL', unit: 'mg/dL' },
  { name: 'Thyroid Function Test (TSH / Free T4)', category: 'Endocrinology', defaultRange: '0.4 - 4.0 mIU/L', unit: 'mIU/L' },
  { name: 'Urinalysis (Routine & Microscopic)', category: 'Urology', defaultRange: 'Normal / Negative', unit: 'Index' },
  { name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'Biochemistry', defaultRange: 'Na: 135-145, K: 3.5-5.0 mEq/L', unit: 'mEq/L' },
  { name: 'Vitamin D (25-Hydroxy)', category: 'Nutrition / Endocrinology', defaultRange: '30 - 100 ng/mL', unit: 'ng/mL' },
  { name: 'C-Reactive Protein (CRP)', category: 'Inflammatory Marker', defaultRange: '< 3.0 mg/L', unit: 'mg/L' },
];

export const LabManagementPage: React.FC = () => {
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<LabOrder | null>(null);

  // New Order Form
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    testCategory: 'General Pathology',
    selectedTestName: 'Complete Blood Count (CBC)',
    priority: 'routine',
    clinicalNotes: 'Routine clinical health evaluation',
    orderDate: new Date().toISOString().split('T')[0],
    orderingDoctor: 'Dr. Sophia Chen (Attending Physician)',
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
      const allPatients = (patRes.data || []).filter((p: any) => {
        const name = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
        return name !== 'emily davis' && name !== 'robert johnson' && name !== 'patient' && name !== 'patient name' && name.length > 0;
      });

      const validLabs = (labRes.data || []).filter((lab: any) => {
        const patient = allPatients.find((p: any) => p.id === lab.patientId || p.userId === lab.patientId);
        if (patient) {
          const fullName = `${patient.firstName} ${patient.lastName || ''}`.toLowerCase();
          if (fullName.includes('emily davis') || fullName.includes('robert johnson')) return false;
        }
        return true;
      });

      setLabOrders(validLabs);
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

  // Selected Patient for New Order Form
  const currentSelectedPatient = patients.find((p) => p.id === orderForm.patientId) || patients[0];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.patientId) return;

    try {
      const testDef = STANDARD_TESTS.find((t) => t.name === orderForm.selectedTestName) || {
        name: orderForm.selectedTestName,
        category: orderForm.testCategory || 'General Pathology',
        defaultRange: 'Standard Reference',
        unit: '',
      };

      const tests = [
        {
          testName: testDef.name,
          testCategory: testDef.category,
          referenceRange: testDef.defaultRange,
          unit: testDef.unit,
        },
      ];

      await api.post('/labs', {
        patientId: orderForm.patientId,
        doctorId: '40000000-0000-0000-0000-000000000001',
        clinicalNotes: `${orderForm.clinicalNotes} [Priority: ${orderForm.priority.toUpperCase()}]`,
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

  const handleOpenReportModal = (order: LabOrder) => {
    setActiveOrder(order);
    setIsReportModalOpen(true);
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

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this laboratory order?')) return;
    try {
      await api.put(`/labs/${orderId}/status`, { status: 'cancelled' });
      fetchLabs();
    } catch (err) {
      console.error('Failed to cancel lab order:', err);
    }
  };

  // Metrics Calculation
  const totalOrders = labOrders.length;
  const pendingCount = labOrders.filter((l) => l.status === 'ordered' || l.status === 'sample_collected').length;
  const processingCount = labOrders.filter((l) => l.status === 'processing').length;
  const completedCount = labOrders.filter((l) => l.status === 'completed').length;
  const abnormalCount = labOrders.filter((l) =>
    l.tests?.some((t) => t.isAbnormal) || (l.aiAnalysis?.abnormalFindings && l.aiAnalysis.abnormalFindings.length > 0)
  ).length;

  // Filtered Orders List
  const filteredOrders = labOrders.filter((order) => {
    const patient = patients.find((p) => p.id === order.patientId || p.userId === order.patientId) || order.patient;
    const pName = patient ? `${patient.firstName} ${patient.lastName || ''}`.toLowerCase() : '';
    const pMrn = (patient?.mrn || '').toLowerCase();
    const testNames = (order.tests || []).map((t) => t.testName.toLowerCase()).join(' ');

    const matchesSearch =
      pName.includes(searchQuery.toLowerCase()) ||
      pMrn.includes(searchQuery.toLowerCase()) ||
      testNames.includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? order.status === 'ordered' || order.status === 'sample_collected'
        : order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laboratory & Diagnostics</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              LabReportAgent Active
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Diagnostic test orders, specimen tracking, biomarker analysis & electronic diagnostic reporting
          </p>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Lab Test Order</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Lab Orders</span>
            <FlaskConical className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalOrders}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Processing</span>
            <RefreshCw className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-cyan-700 mt-2">{processingCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{completedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Abnormal Results</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{abnormalCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, MRN, or test name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-secondary bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {[
            { id: 'all', label: 'All' },
            { id: 'ordered', label: 'Ordered' },
            { id: 'sample_collected', label: 'Sample Collected' },
            { id: 'processing', label: 'Processing' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-600 border-secondary hover:bg-secondary/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lab Order List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-secondary">
            Loading laboratory orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-secondary">
            No laboratory orders match your current filter criteria. Click "+ New Lab Test Order" to create one.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const patient = patients.find((p) => p.id === order.patientId || p.userId === order.patientId) || order.patient;
            const patientName = patient
              ? `${patient.firstName} ${patient.lastName || ''}`.trim()
              : (order as any).patientName || 'Thulasi';

            const isAbnormalOrder =
              order.tests?.some((t) => t.isAbnormal) ||
              (order.aiAnalysis?.abnormalFindings && order.aiAnalysis.abnormalFindings.length > 0);

            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-white border border-secondary shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-secondary">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/30 text-primary border border-secondary flex items-center justify-center font-bold">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-900">{patientName}</h3>
                        <span className="text-xs font-mono text-slate-500">({patient?.mrn || 'NX-2026-001'})</span>
                        {isAbnormalOrder && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Abnormal</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ordered: {new Date(order.orderedAt).toLocaleDateString()} • Ordering Doctor: Dr. Sophia Chen • Priority:{' '}
                        <span className="font-semibold text-slate-700">
                          {order.clinicalNotes?.includes('URGENT') ? 'URGENT' : 'Routine'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded font-mono uppercase font-bold ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : order.status === 'processing'
                          ? 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                          : order.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.status}
                    </span>

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => handleOpenResultModal(order)}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary/90 transition-all flex items-center space-x-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Enter Results</span>
                      </button>
                    )}

                    {order.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleOpenResultModal(order)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-secondary text-slate-700 font-bold text-xs hover:bg-secondary/20 transition-all flex items-center space-x-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenReportModal(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary/90 transition-all flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Report</span>
                        </button>
                      </>
                    )}

                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all"
                        title="Cancel Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Tests Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {order.tests?.map((test) => (
                    <div
                      key={test.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        test.isAbnormal
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : 'bg-secondary/10 border-secondary text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate">{test.testName}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">{test.testCategory}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-sm font-bold font-mono ${
                            test.isAbnormal ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {test.resultValue ? `${test.resultValue} ${test.unit}` : 'Pending Result'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Ref: {test.referenceRange}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clinical Notes / AI Synopsis */}
                {order.clinicalNotes && (
                  <p className="text-xs text-slate-600 bg-secondary/10 p-2 rounded-xl border border-secondary">
                    <strong className="text-slate-800">Clinical Indication:</strong> {order.clinicalNotes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Lab Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-secondary p-6 space-y-4 text-xs shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-secondary pb-3">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-slate-900">New Laboratory Test Order</h3>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Patient</label>
                <select
                  value={orderForm.patientId}
                  onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white focus:outline-none focus:border-primary font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn}) — DOB: {p.dateOfBirth}, {p.gender}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-loaded Patient Demographics Card */}
              {currentSelectedPatient && (
                <div className="p-3 bg-secondary/10 rounded-xl border border-secondary grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Patient Name</span>
                    <strong className="text-slate-900">
                      {currentSelectedPatient.firstName} {currentSelectedPatient.lastName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">MRN / ID</span>
                    <strong className="text-slate-900">{currentSelectedPatient.mrn}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">DOB</span>
                    <strong className="text-slate-900">{currentSelectedPatient.dateOfBirth}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Gender</span>
                    <strong className="text-slate-900 capitalize">{currentSelectedPatient.gender}</strong>
                  </div>
                </div>
              )}

              {/* Select Test Category & Test */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Diagnostic Test</label>
                  <select
                    value={orderForm.selectedTestName}
                    onChange={(e) => {
                      const sel = STANDARD_TESTS.find((t) => t.name === e.target.value);
                      setOrderForm({
                        ...orderForm,
                        selectedTestName: e.target.value,
                        testCategory: sel?.category || 'General Pathology',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white focus:outline-none focus:border-primary font-medium"
                  >
                    {STANDARD_TESTS.map((test) => (
                      <option key={test.name} value={test.name}>
                        {test.name} ({test.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Priority</label>
                  <select
                    value={orderForm.priority}
                    onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white focus:outline-none focus:border-primary font-medium"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent / STAT</option>
                  </select>
                </div>
              </div>

              {/* Clinical Indication / Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Clinical Indication / Reason</label>
                <input
                  type="text"
                  value={orderForm.clinicalNotes}
                  onChange={(e) => setOrderForm({ ...orderForm, clinicalNotes: e.target.value })}
                  placeholder="e.g. Diagnostic evaluation, pre-operative screening, routine checkup"
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Ordering Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Order Date</label>
                  <input
                    type="date"
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ordering Doctor</label>
                  <input
                    type="text"
                    readOnly
                    value={orderForm.orderingDoctor}
                    className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-700 bg-secondary/10 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-secondary flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-secondary text-slate-700 font-bold hover:bg-secondary/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm transition-all"
                >
                  Create Lab Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result Entry Modal */}
      {isResultModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-2xl border border-secondary p-6 space-y-4 text-xs shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-secondary pb-3">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-slate-900">Enter Laboratory Test Results</h3>
              </div>
              <button onClick={() => setIsResultModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {testResults.map((test, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-secondary/10 border border-secondary space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{test.testName}</span>
                    <label className="flex items-center space-x-1.5 text-slate-700 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={test.isAbnormal}
                        onChange={(e) => {
                          const next = [...testResults];
                          next[idx].isAbnormal = e.target.checked;
                          setTestResults(next);
                        }}
                        className="rounded accent-rose-600 w-4 h-4"
                      />
                      <span className={test.isAbnormal ? 'text-rose-600' : ''}>Flag as Abnormal</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Result Value</span>
                      <input
                        type="text"
                        placeholder="e.g. 14.2"
                        value={test.resultValue}
                        onChange={(e) => {
                          const next = [...testResults];
                          next[idx].resultValue = e.target.value;
                          setTestResults(next);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-secondary bg-white text-slate-900 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Unit</span>
                      <input
                        type="text"
                        placeholder="e.g. g/dL"
                        value={test.unit}
                        onChange={(e) => {
                          const next = [...testResults];
                          next[idx].unit = e.target.value;
                          setTestResults(next);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-secondary bg-white text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Reference Range</span>
                      <input
                        type="text"
                        placeholder="e.g. 12.0 - 16.0"
                        value={test.referenceRange}
                        onChange={(e) => {
                          const next = [...testResults];
                          next[idx].referenceRange = e.target.value;
                          setTestResults(next);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-secondary bg-white text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-secondary flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsResultModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-secondary text-slate-700 font-bold hover:bg-secondary/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResults}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
              >
                Save & Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Lab Report Modal */}
      {isReportModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl border border-secondary p-8 space-y-6 text-xs shadow-2xl overflow-y-auto">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-secondary pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Official Diagnostic Laboratory Report</h2>
                  <p className="text-xs text-slate-500 font-mono">Report ID: LAB-{activeOrder.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-slate-700 transition-all"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-slate-700 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Patient & Doctor Demographics */}
            {(() => {
              const patient = patients.find((p) => p.id === activeOrder.patientId || p.userId === activeOrder.patientId) || activeOrder.patient;
              const patientName = patient
                ? `${patient.firstName} ${patient.lastName || ''}`.trim()
                : (activeOrder as any).patientName || 'Thulasi';

              return (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/10 border border-secondary text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Patient Demographics</span>
                    <p className="font-bold text-sm text-slate-900">{patientName}</p>
                    <p className="text-slate-600">MRN: <strong className="text-slate-800">{patient?.mrn || 'NX-2026-001'}</strong></p>
                    <p className="text-slate-600">DOB: <strong className="text-slate-800">{patient?.dateOfBirth || '2000-05-15'}</strong> • Gender: <strong className="text-slate-800 capitalize">{patient?.gender || 'Female'}</strong></p>
                  </div>

                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ordering Clinician & Facility</span>
                    <p className="font-bold text-sm text-slate-900">Dr. Sophia Chen, MD</p>
                    <p className="text-slate-600">Facility: <strong>Apollo Health & Diagnostic Center</strong></p>
                    <p className="text-slate-600">Sample Date: <strong>{new Date(activeOrder.orderedAt).toLocaleDateString()}</strong></p>
                  </div>
                </div>
              );
            })()}

            {/* Test Results Table */}
            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-2">Test Findings & Biomarker Matrix</h3>
              <div className="rounded-2xl border border-secondary overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/20 text-slate-700 font-bold border-b border-secondary">
                    <tr>
                      <th className="p-3">Test Name</th>
                      <th className="p-3">Result</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {activeOrder.tests?.map((t, idx) => (
                      <tr key={idx} className={t.isAbnormal ? 'bg-rose-50/50' : 'bg-white'}>
                        <td className="p-3 font-semibold text-slate-900">
                          {t.testName}
                          <span className="block text-[10px] text-slate-500 font-normal">{t.testCategory}</span>
                        </td>
                        <td className="p-3 font-bold font-mono text-slate-900">
                          {t.resultValue ? `${t.resultValue} ${t.unit}` : 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{t.referenceRange}</td>
                        <td className="p-3">
                          {t.isAbnormal ? (
                            <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Abnormal
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doctor's Interpretation & Clinical Notes */}
            <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Clinical Interpretation & Notes</span>
              <p className="text-slate-800 leading-relaxed font-medium">
                {activeOrder.clinicalNotes || 'Diagnostic tests evaluated in accordance with standard medical laboratory protocol.'}
              </p>
            </div>

            {/* Sign-off footer */}
            <div className="flex items-center justify-between pt-4 border-t border-secondary text-slate-500 text-[11px]">
              <span>Electronically signed by attending pathologist and primary physician.</span>
              <span className="font-bold text-emerald-600 uppercase">Status: Final Diagnostic Report</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
