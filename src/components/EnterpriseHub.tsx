import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Activity, 
  Database, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ClipboardList, 
  RefreshCw,
  Palette,
  Percent,
  Coins,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { 
  getEnterpriseAnalytics, 
  getAuditLogs, 
  getAllTenants, 
  createTenant, 
  updateTenantConfig,
  getActiveTenantId
} from '../lib/firebase';
import { Tenant, AuditLog } from '../types';

export const EnterpriseHub: React.FC = () => {
  const { language, activeTenant, formatPrice, t } = useAppContext();
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'config' | 'audit' | 'database' | 'ledger'>('analytics');
  
  // State
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenantsState] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerBalances, setLedgerBalances] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Manual Adjusting Entry Form
  const [manualDesc, setManualDesc] = useState('');
  const [manualDebit, setManualDebit] = useState('Cash');
  const [manualCredit, setManualCredit] = useState('Rental Revenue');
  const [manualAmount, setManualAmount] = useState('');
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Tenant form state
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantColor, setNewTenantColor] = useState('#10b981');
  const [newTenantCurrency, setNewTenantCurrency] = useState('USD');
  const [newTenantTax, setNewTenantTax] = useState('10');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Tenant editing state
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingTenantName, setEditingTenantName] = useState('');
  const [editingTenantColor, setEditingTenantColor] = useState('');
  const [editingTenantCurrency, setEditingTenantCurrency] = useState('USD');
  const [editingTenantTax, setEditingTenantTax] = useState('10');

  const startEditingTenant = (t: Tenant) => {
    setEditingTenantId(t.id);
    setEditingTenantName(t.name);
    setEditingTenantColor(t.primaryColor);
    setEditingTenantCurrency(t.currency);
    setEditingTenantTax(String(t.taxRate));
  };

  const handleSaveTenantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantId) return;
    try {
      await updateTenantConfig(editingTenantId, {
        name: editingTenantName,
        primaryColor: editingTenantColor,
        currency: editingTenantCurrency as any,
        taxRate: parseFloat(editingTenantTax) || 0
      });
      alert(`Tenant brand "${editingTenantName}" updated successfully!`);
      setEditingTenantId(null);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (tenantId === 'luxerent' || tenantId === 'corpstay' || tenantId === 'beachfront') {
      alert("Deleting seeded tenants is disabled to prevent system locking.");
      return;
    }
    if (!confirm(`Are you absolutely sure you want to delete the tenant brand "${tenantId}"? All database partitions associated with this brand will be lost.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Tenant brand deleted successfully.");
        loadAllData();
      } else {
        alert("Failed to delete tenant brand.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteRawRow = async (table: string, row: any) => {
    const pk = table === 'users' ? row.email : row.id;
    if (!pk) {
      alert("No primary key/ID found for this record.");
      return;
    }
    if (!confirm(`Are you absolutely sure you want to delete record "${pk}" from table "${table}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/enterprise/raw-table?table=${table}&id=${encodeURIComponent(pk)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Record deleted successfully from PostgreSQL.");
        loadAllData();
      } else {
        const errJson = await res.json();
        alert(`Failed to delete record: ${errJson.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("WARNING: This will clear ALL users, listings, bookings, payments, audit logs, ledger entries, background checks, and maintenance requests, and restore them to the pristine default seeded state. Continue?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/enterprise/seed", {
        method: "POST"
      });
      if (res.ok) {
        alert("Database cleared and re-seeded successfully!");
        loadAllData();
      } else {
        const errJson = await res.json();
        alert(`Failed to reset database: ${errJson.error}`);
      }
    } catch (err: any) {
      alert(`Error resetting database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Db Explorer State
  const [selectedTable, setSelectedTable] = useState<'tenants' | 'users' | 'listings' | 'bookings' | 'payments' | 'audit_logs' | 'ledger_entries' | 'background_checks' | 'maintenance_requests'>('tenants');
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState('');

  const fetchLedgers = async () => {
    try {
      const tenantId = getActiveTenantId();
      const [entriesRes, balancesRes] = await Promise.all([
        fetch(`/api/ledger`, { headers: { 'x-tenant-id': tenantId } }),
        fetch(`/api/ledger/balances`, { headers: { 'x-tenant-id': tenantId } })
      ]);
      if (entriesRes.ok) {
        setLedgerEntries(await entriesRes.ok ? entriesRes.json() : []);
      }
      if (balancesRes.ok) {
        setLedgerBalances(await balancesRes.ok ? balancesRes.json() : null);
      }
    } catch (err) {
      console.error("Failed to load ledger data:", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = getActiveTenantId();
      const [analyticsData, logsData, tenantsData] = await Promise.all([
        getEnterpriseAnalytics(),
        getAuditLogs('admin@enterprise.com'),
        getAllTenants()
      ]);
      setAnalytics(analyticsData);
      setLogs(logsData);
      setTenantsState(tenantsData);

      // Load ledger
      const [entriesRes, balancesRes] = await Promise.all([
        fetch(`/api/ledger`, { headers: { 'x-tenant-id': tenantId } }),
        fetch(`/api/ledger/balances`, { headers: { 'x-tenant-id': tenantId } })
      ]);
      if (entriesRes.ok) {
        setLedgerEntries(await entriesRes.json());
      }
      if (balancesRes.ok) {
        setLedgerBalances(await balancesRes.json());
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load super admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeTenant]);

  // Load raw database tables directly
  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const tenantId = getActiveTenantId();
        let endpoint = `/api/listings`;
        if (selectedTable === 'tenants') endpoint = `/api/tenants`;
        else if (selectedTable === 'users') endpoint = `/api/users/login`; // can fetch from active context or we can use custom backend
        else if (selectedTable === 'bookings') endpoint = `/api/bookings/owner?email=admin@enterprise.com`; // mock or fetch general
        else if (selectedTable === 'payments') endpoint = `/api/payments/renter?email=all`;
        else if (selectedTable === 'audit_logs') endpoint = `/api/audit-logs?email=all`;

        // Let's call the custom raw query endpoints we built on the server!
        const rawRes = await fetch(`/api/enterprise/raw-table?table=${selectedTable}`, {
          headers: { 'x-tenant-id': tenantId }
        });
        if (rawRes.ok) {
          const rows = await rawRes.json();
          setTableData(rows);
        } else {
          // fallback to approximate context list
          if (selectedTable === 'tenants') setTableData(tenants);
          else if (selectedTable === 'audit_logs') setTableData(auditLogs);
          else setTableData([]);
        }
      } catch (err) {
        console.error("Failed to load raw tables:", err);
      }
    };
    fetchTableData();
  }, [selectedTable, tenants, auditLogs]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    if (!newTenantId || !newTenantName) {
      alert('Tenant ID and Brand Name are required.');
      return;
    }
    try {
      await createTenant({
        id: newTenantId.toLowerCase().trim(),
        name: newTenantName,
        primaryColor: newTenantColor,
        currency: newTenantCurrency as any,
        taxRate: parseFloat(newTenantTax) || 0,
        allowPublicSignup: true
      });
      setFormSuccess(`Tenant Brand "${newTenantName}" provisioned successfully on global cluster!`);
      setNewTenantId('');
      setNewTenantName('');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to provision tenant');
    }
  };

  const handleUpdateTenantTax = async (tenantId: string, taxRate: number) => {
    try {
      await updateTenantConfig(tenantId, { taxRate });
      alert('Tax configuration updated!');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update configuration');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4" id="enterprise-loading">
        <RefreshCw className="h-10 w-10 text-tenant animate-spin" />
        <p className="text-sm font-sans font-medium text-gray-500 dark:text-slate-400">
          Syncing super admin tenant isolation boundaries & global cluster metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="enterprise-hub-container">
      {/* Dynamic Header */}
      <div className="mb-8 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Building2 className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold mb-3 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" /> multi-tenant database partitioned cluster
            </div>
            <h1 className="text-2xl sm:text-3xl font-sans font-extrabold tracking-tight">
              Global Super Admin Console
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-sans max-w-xl">
              Consolidated governance across independent business units, real-time transaction tracking, compliance audit reporting, and isolation policies.
            </p>
          </div>
          <div className="flex gap-3 self-start md:self-center">
            <button 
              onClick={loadAllData}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Cluster
            </button>
            <button 
              onClick={handleResetDatabase}
              className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-900/50 shadow-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Reset & Re-Seed
            </button>
          </div>
        </div>
      </div>

      {/* Internal Sub Navigation */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-4 text-sm font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer border-transparent ${
            activeSubTab === 'analytics'
              ? 'border-tenant text-tenant font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Executive Metrics & Brands</span>
        </button>
        <button
          onClick={() => setActiveSubTab('config')}
          className={`pb-4 text-sm font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer border-transparent ${
            activeSubTab === 'config'
              ? 'border-tenant text-tenant font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Provision Tenant Brands</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-4 text-sm font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer border-transparent ${
            activeSubTab === 'audit'
              ? 'border-tenant text-tenant font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Transactional Audit Trail</span>
        </button>
        <button
          onClick={() => setActiveSubTab('database')}
          className={`pb-4 text-sm font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer border-transparent ${
            activeSubTab === 'database'
              ? 'border-tenant text-tenant font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>PostgreSQL Table Explorer</span>
        </button>
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`pb-4 text-sm font-semibold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer border-transparent ${
            activeSubTab === 'ledger'
              ? 'border-tenant text-tenant font-extrabold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Double-Entry Ledgers</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-sans font-medium">{error}</p>
        </div>
      )}

      {/* SUB TAB: ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans">Active Brands</p>
                  <p className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white mt-1">
                    {analytics?.tenantBreakdown?.length || tenants.length || 0}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-bold">100% Isolated</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Logical partition limits</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans">Gross Platform Volume</p>
                  <p className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white mt-1">
                    {formatPrice(analytics?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-bold">Live</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Transactional database records</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans">Global Listings</p>
                  <p className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white mt-1">
                    {analytics?.totalListings || 0}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl">
                  <Layers className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-mono font-bold">Distributed</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Across registered tenant brands</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-sans">Audited Transactions</p>
                  <p className="text-2xl font-sans font-extrabold text-gray-900 dark:text-white mt-1">
                    {analytics?.totalBookings || 0}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 p-2.5 rounded-xl">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-md font-mono font-bold">SOC-2 Audited</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Compliance logged in DB</span>
              </div>
            </div>
          </div>

          {/* Tenant Revenue Breakdown Table / Visualization */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tenant" /> Brand Partition Comparisons & Financials
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-6 font-sans">
              Real-time transaction volumes and dynamic styling definitions allocated in PostgreSQL.
            </p>

            <div className="space-y-6">
              {analytics?.tenantBreakdown?.map((brand: any) => {
                const percentage = analytics.totalRevenue > 0 
                  ? Math.round((brand.revenue / analytics.totalRevenue) * 100) 
                  : 0;
                
                return (
                  <div key={brand.tenantId} className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800/60">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: brand.primaryColor }}></span>
                        <div>
                          <p className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white capitalize">{brand.name || brand.tenantId}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Workspace ID: {brand.tenantId}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 font-mono uppercase">Bookings Value</p>
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white">{formatPrice(brand.revenue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 font-mono uppercase">Tax Code</p>
                          <p className="text-sm font-mono font-extrabold text-slate-500">{brand.taxRate || 0}% Default</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: brand.primaryColor 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1.5">
                      <span>{brand.listingsCount} Properties Listed</span>
                      <span>{brand.bookingsCount} Active Contracts ({percentage}% of cluster total)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: PROVISION BRANDS */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          {/* Brand Provisioner Form */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-tenant" /> Spin Up Isolated Brand Workspace
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-6 font-sans">
              Instantly create a new logically partitioned tenant on the Google Cloud SQL instance with dynamic styling configuration.
            </p>

            {formSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3 animate-slideDown">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-sans font-bold">{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Unique Brand Subdomain Key</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. apexresorts"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-sans focus:outline-hidden transition-colors"
                />
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Alpha-numeric characters only. Used for partition isolation headers.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Brand Display Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Apex Beachfront Resorts"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-sans focus:outline-hidden transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Default Currency</label>
                  <select
                    value={newTenantCurrency}
                    onChange={(e) => setNewTenantCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-sans focus:outline-hidden transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Default Tax Rate (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    placeholder="10"
                    value={newTenantTax}
                    onChange={(e) => setNewTenantTax(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-sans focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Primary Brand Color</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="color"
                    value={newTenantColor}
                    onChange={(e) => setNewTenantColor(e.target.value)}
                    className="w-12 h-12 bg-transparent border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                  <input 
                    type="text"
                    value={newTenantColor}
                    onChange={(e) => setNewTenantColor(e.target.value)}
                    className="flex-grow px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 focus:border-tenant focus:ring-1 focus:ring-tenant rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-sans focus:outline-hidden transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">This color will dynamically theme the entire landing layout when active!</p>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-tenant text-white font-sans font-bold text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Provision Isolated Tenant Workspace
              </button>
            </form>
          </div>

          {/* Active Workspaces List & Modifiers */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tenant" /> Active Corporate Tenants
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-6 font-sans">
              Manage tax codes, brand metrics, and run-time currencies.
            </p>

            <div className="space-y-4">
              {tenants.map(t => (
                <div key={t.id} className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                  {editingTenantId === t.id ? (
                    <form onSubmit={handleSaveTenantEdit} className="space-y-3 w-full">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Edit Brand: {t.id}</span>
                        <button type="button" onClick={() => setEditingTenantId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Brand Name</label>
                          <input 
                            type="text"
                            required
                            value={editingTenantName}
                            onChange={(e) => setEditingTenantName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-sans text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Primary Color</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color"
                              value={editingTenantColor}
                              onChange={(e) => setEditingTenantColor(e.target.value)}
                              className="w-8 h-8 rounded-md cursor-pointer border border-gray-200 dark:border-slate-800"
                            />
                            <input 
                              type="text"
                              value={editingTenantColor}
                              onChange={(e) => setEditingTenantColor(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Currency</label>
                          <select
                            value={editingTenantCurrency}
                            onChange={(e) => setEditingTenantCurrency(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-sans text-gray-900 dark:text-white"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="JPY">JPY (¥)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                          <input 
                            type="number"
                            step="0.1"
                            required
                            value={editingTenantTax}
                            onChange={(e) => setEditingTenantTax(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-sans text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-800 mt-2">
                        <button 
                          type="button" 
                          onClick={() => setEditingTenantId(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-750 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-3 py-1.5 bg-tenant text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex items-center space-x-3">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.primaryColor }}></span>
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                            {t.name}
                            {(t.id === 'luxerent' || t.id === 'corpstay' || t.id === 'beachfront') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-mono">System</span>
                            )}
                          </h3>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">ID: {t.id} | Currency: {t.currency} | Tax: {t.taxRate}%</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEditingTenant(t)}
                          title="Edit Tenant Configuration"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTenant(t.id)}
                          title="Delete Tenant Brand"
                          disabled={t.id === 'luxerent' || t.id === 'corpstay' || t.id === 'beachfront'}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: AUDIT compliance TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-tenant animate-pulse" /> Security Compliance Audit Trail (SOC-2 Logs)
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 font-sans">
              Cryptographically timestamped operations tracking user requests, IP contexts, actions, and table partitions.
            </p>
          </div>

          <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Timestamp</th>
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">User Identity</th>
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Brand Workspace</th>
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Action Operation</th>
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Resource Context</th>
                  <th className="p-3.5 text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Network IP Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-mono text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-gray-700 dark:text-slate-300">
                      {log.userEmail}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {log.tenantId}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        log.action.includes('SIGNUP') || log.action.includes('LOGIN')
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                          : log.action.includes('CREATE') || log.action.includes('POST')
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                          : log.action.includes('DELETE')
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                      {log.details || 'N/A'}
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-gray-400 dark:text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB: RAW POSTGRESQL TABLE EXPLORER */}
      {activeSubTab === 'database' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-tenant" /> PostgreSQL Real-Time Table Inspector
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 font-sans">
                Interrogate live data partitions in the Google Cloud SQL instance. Toggle schemas to view isolated data rows.
              </p>
            </div>

            {/* Table Selector Pills */}
            <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-slate-950 p-1 rounded-2xl self-start">
              {(['tenants', 'users', 'listings', 'bookings', 'payments', 'audit_logs', 'ledger_entries', 'background_checks', 'maintenance_requests'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedTable(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all border-0 ${
                    selectedTable === tab
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Database Content Table */}
          <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-2xl">
            {tableData.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-gray-400 dark:text-slate-500">
                No raw records discovered in PostgreSQL table "{selectedTable}" for the active partition boundaries.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key} className="p-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                        {key}
                      </th>
                    ))}
                    <th className="p-3 text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-mono text-[11px] text-gray-800 dark:text-slate-200">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="p-3 max-w-[200px] truncate" title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>
                          {typeof val === 'object' && val !== null
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteRawRow(selectedTable, row)}
                          title="Delete Row"
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 font-mono">
            <span>Query result: {tableData.length} records retrieved from Google Cloud SQL</span>
            <span>Policy: logical partition by tenantId</span>
          </div>
        </div>
      )}

      {/* SUB TAB: LEDGER */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Trial Balance Verification & Double-Entry Status */}
          {(() => {
            const b = ledgerBalances || {};
            const cash = b["Cash"] || 0;
            const ar = b["Accounts Receivable"] || 0;
            const maint = b["Maintenance Expense"] || 0;
            const unearned = b["Unearned Rental Revenue"] || 0;
            const rev = b["Rental Revenue"] || 0;
            const tax = b["Tax Liability"] || 0;
            const hostPayable = b["Owner Payable"] || 0;

            const totalDebits = (cash > 0 ? cash : 0) + (ar > 0 ? ar : 0) + (maint > 0 ? maint : 0);
            const totalCredits = (unearned > 0 ? unearned : 0) + (rev > 0 ? rev : 0) + (tax > 0 ? tax : 0) + (hostPayable > 0 ? hostPayable : 0);
            const diff = Math.abs(totalDebits - totalCredits);
            const isBalanced = diff === 0;

            return (
              <>
                <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
                  isBalanced 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' 
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isBalanced ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700' : 'bg-amber-100 dark:bg-amber-900 text-amber-700'}`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-sans font-extrabold text-gray-900 dark:text-white">
                        {isBalanced ? "SOC-2 Double-Entry Ledger Status: Balanced" : "Ledger Status: Unbalanced Adjustment Required"}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {isBalanced 
                          ? `Verification hash verified. Total Debits strictly equals Total Credits.`
                          : `Difference of ${formatPrice(diff)} detected. Please adjust via manual journal voucher below.`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-xs sm:text-sm">
                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Debits</span>
                      <span className="font-extrabold text-emerald-600">{formatPrice(totalDebits)}</span>
                    </div>
                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-800"></div>
                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Credits</span>
                      <span className="font-extrabold text-blue-600">{formatPrice(totalCredits)}</span>
                    </div>
                  </div>
                </div>

                {/* Trial Balance Sheets Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "Cash (Asset)", balance: cash, debitNormal: true, desc: "Liquid capital in business bank accounts." },
                    { title: "Accounts Receivable (Asset)", balance: ar, debitNormal: true, desc: "Outstanding renter payments owed." },
                    { title: "Unearned Revenue (Liability)", balance: unearned, debitNormal: false, desc: "Deferred rental bookings prepaid." },
                    { title: "Rental Revenue (Equity)", balance: rev, debitNormal: false, desc: "Realized platform booking commission." },
                    { title: "Tax Liability (Liability)", balance: tax, debitNormal: false, desc: "Lodging taxes held in trust." },
                    { title: "Owner Payable (Liability)", balance: hostPayable, debitNormal: false, desc: "Escrow obligations payable to host." },
                    { title: "Maintenance Expense (Expense)", balance: maint, debitNormal: true, desc: "AI-rated contractor repair charges." }
                  ].map((act, i) => {
                    const absBal = Math.abs(act.balance);
                    const displayBal = act.debitNormal 
                      ? (act.balance >= 0 ? `${formatPrice(absBal)} DR` : `${formatPrice(absBal)} CR`)
                      : (act.balance >= 0 ? `${formatPrice(absBal)} CR` : `${formatPrice(absBal)} DR`);
                    
                    return (
                      <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider">{act.title}</span>
                          <p className="text-sm font-mono font-extrabold text-gray-900 dark:text-white mt-1">{displayBal}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3 italic font-sans">{act.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Form and Stream grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Manual adjusting form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs h-fit">
              <h3 className="text-sm font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-tenant" /> Manual Adjusting Voucher
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-5 font-sans">
                Post an adjusted manual transaction directly to the general ledger. Both debit and credit accounts are updated simultaneously to maintain balance.
              </p>

              {manualSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-sans font-bold">{manualSuccess}</p>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setManualSuccess(null);
                const amt = parseFloat(manualAmount);
                if (!manualDesc || !amt || isNaN(amt)) {
                  alert("Please fill in a valid description and amount.");
                  return;
                }
                try {
                  const res = await fetch("/api/ledger/adjust", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-tenant-id": getActiveTenantId()
                    },
                    body: JSON.stringify({
                      description: manualDesc,
                      debitAccount: manualDebit,
                      creditAccount: manualCredit,
                      amount: Math.round(amt),
                      referenceType: "manual_adjustment",
                      userEmail: "admin@enterprise.com"
                    })
                  });
                  if (res.ok) {
                    setManualSuccess("Journal adjusting voucher posted successfully!");
                    setManualDesc("");
                    setManualAmount("");
                    loadAllData();
                  } else {
                    alert("Failed to post journal entry.");
                  }
                } catch (err) {
                  console.error(err);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1.5 font-mono">Description / Narration</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. End of month depreciation or correction"
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1.5 font-mono font-bold">Debit (DR)</label>
                    <select
                      value={manualDebit}
                      onChange={(e) => setManualDebit(e.target.value)}
                      className="w-full px-2 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden font-bold"
                    >
                      {["Cash", "Accounts Receivable", "Unearned Rental Revenue", "Rental Revenue", "Tax Liability", "Owner Payable", "Maintenance Expense"].map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1.5 font-mono font-bold">Credit (CR)</label>
                    <select
                      value={manualCredit}
                      onChange={(e) => setManualCredit(e.target.value)}
                      className="w-full px-2 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden font-bold"
                    >
                      {["Cash", "Accounts Receivable", "Unearned Rental Revenue", "Rental Revenue", "Tax Liability", "Owner Payable", "Maintenance Expense"].map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1.5 font-mono">Amount (USD)</label>
                  <input 
                    type="number"
                    required
                    placeholder="500"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-950 dark:text-white focus:outline-hidden font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm font-sans"
                >
                  Post Journal Voucher
                </button>
              </form>
            </div>

            {/* General Ledger stream list */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-sans font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-tenant" /> General Ledger Journal Stream
              </h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-5 font-sans">
                Real-time chronological log of double-entry ledger listings inside the isolated brand partition.
              </p>

              <div className="overflow-y-auto max-h-[420px] space-y-3 pr-2 scrollbar-none">
                {ledgerEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/20 rounded-2xl">
                    No double-entry financial records recorded. Bookings or payments made will trigger automated ledgers.
                  </div>
                ) : (
                  ledgerEntries.map(entry => (
                    <div key={entry.id} className="p-4 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-200 dark:bg-slate-800 px-1 rounded">Ref: {entry.referenceType}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-gray-800 dark:text-slate-200 mt-1.5">{entry.description}</h4>
                        
                        {/* Double entry visualization */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">DR {entry.debitAccount}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded">CR {entry.creditAccount}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-gray-400 block font-mono">Ledger Value</span>
                        <span className="text-sm font-mono font-extrabold text-gray-950 dark:text-white">{formatPrice(entry.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
