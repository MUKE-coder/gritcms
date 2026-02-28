"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  Check,
  Ban,
  Play,
  ChevronLeft,
  ChevronRight,
  Link,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "@/lib/icons";
import {
  useAffiliateDashboard,
  useAffiliatePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  useAffiliateAccounts,
  useCreateAccount,
  useUpdateAccountStatus,
  useCommissions,
  useApproveCommission,
  useRejectCommission,
  usePayouts,
  useCreatePayout,
  useProcessPayout,
} from "@/hooks/use-affiliates";
import { useConfirm } from "@/hooks/use-confirm";
import type {
  AffiliateProgram,
  AffiliateAccount,
  Commission,
  Payout,
} from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type MainTab = "dashboard" | "affiliates" | "commissions" | "payouts";

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "affiliates", label: "Affiliates" },
  { key: "commissions", label: "Commissions" },
  { key: "payouts", label: "Payouts" },
];

const ACCOUNT_STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
] as const;

const COMMISSION_STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
] as const;

const PAYOUT_STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
] as const;

const accountStatusBadge: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  active: "bg-green-500/10 text-green-400",
  suspended: "bg-red-500/10 text-red-400",
};

const commissionStatusBadge: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-blue-500/10 text-blue-400",
  paid: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

const payoutStatusBadge: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  processing: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-green-500/10 text-green-400",
};

function formatMoney(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AffiliatesPage() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");

  // Programs state
  const [programsExpanded, setProgramsExpanded] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<AffiliateProgram | null>(
    null
  );
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    commission_type: "percentage" as "percentage" | "fixed",
    commission_amount: 0,
    cookie_days: 30,
    min_payout_amount: 5000,
    auto_approve: false,
  });

  // Affiliates tab state
  const [accountStatusFilter, setAccountStatusFilter] = useState("");
  const [accountPage, setAccountPage] = useState(1);
  const [showAddAffiliateModal, setShowAddAffiliateModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    contact_id: "",
    program_id: "",
  });

  // Commissions tab state
  const [commissionStatusFilter, setCommissionStatusFilter] = useState("");
  const [commissionPage, setCommissionPage] = useState(1);

  // Payouts tab state
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [payoutPage, setPayoutPage] = useState(1);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    account_id: "",
    amount: "",
  });

  // Data hooks
  const { data: dashboard, isLoading: loadingDashboard } =
    useAffiliateDashboard();
  const { data: programs, isLoading: loadingPrograms } =
    useAffiliatePrograms();
  const { mutate: createProgram } = useCreateProgram();
  const { mutate: updateProgram } = useUpdateProgram();
  const { mutate: deleteProgram } = useDeleteProgram();

  const { data: accountsData, isLoading: loadingAccounts } =
    useAffiliateAccounts(accountPage, accountStatusFilter);
  const accounts = accountsData?.data ?? [];
  const accountsMeta = accountsData?.meta;
  const { mutate: createAccount } = useCreateAccount();
  const { mutate: updateAccountStatus } = useUpdateAccountStatus();

  const { data: commissionsData, isLoading: loadingCommissions } =
    useCommissions(commissionPage, commissionStatusFilter);
  const commissions = commissionsData?.data ?? [];
  const commissionsMeta = commissionsData?.meta;
  const { mutate: approveCommission } = useApproveCommission();
  const { mutate: rejectCommission } = useRejectCommission();

  const { data: payoutsData, isLoading: loadingPayouts } = usePayouts(
    payoutPage,
    payoutStatusFilter
  );
  const payouts = payoutsData?.data ?? [];
  const payoutsMeta = payoutsData?.meta;
  const { mutate: createPayout } = useCreatePayout();
  const { mutate: processPayout } = useProcessPayout();

  // Handlers -- Programs
  const openCreateProgram = () => {
    setEditingProgram(null);
    setProgramForm({
      name: "",
      description: "",
      commission_type: "percentage",
      commission_amount: 0,
      cookie_days: 30,
      min_payout_amount: 5000,
      auto_approve: false,
    });
    setShowProgramModal(true);
  };

  const openEditProgram = (p: AffiliateProgram) => {
    setEditingProgram(p);
    setProgramForm({
      name: p.name,
      description: p.description,
      commission_type: p.commission_type,
      commission_amount: p.commission_type === "fixed" ? p.commission_amount / 100 : p.commission_amount,
      cookie_days: p.cookie_days,
      min_payout_amount: p.min_payout_amount / 100,
      auto_approve: p.auto_approve,
    });
    setShowProgramModal(true);
  };

  const handleSaveProgram = () => {
    const submitData = {
      ...programForm,
      commission_amount: programForm.commission_type === "fixed" ? Math.round(programForm.commission_amount * 100) : programForm.commission_amount,
      min_payout_amount: Math.round(programForm.min_payout_amount * 100),
    };
    if (editingProgram) {
      updateProgram(
        { id: editingProgram.id, ...submitData },
        { onSuccess: () => setShowProgramModal(false) }
      );
    } else {
      createProgram(submitData, {
        onSuccess: () => setShowProgramModal(false),
      });
    }
  };

  const handleDeleteProgram = async (id: number) => {
    const ok = await confirm({
      title: "Delete Program",
      description: "Delete this program? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      deleteProgram(id);
    }
  };

  // Handlers -- Accounts
  const handleCreateAccount = () => {
    const contactId = parseInt(newAccountForm.contact_id);
    const programId = parseInt(newAccountForm.program_id);
    if (!contactId || !programId) return;
    createAccount(
      { contact_id: contactId, program_id: programId },
      {
        onSuccess: () => {
          setShowAddAffiliateModal(false);
          setNewAccountForm({ contact_id: "", program_id: "" });
        },
      }
    );
  };

  // Handlers -- Payouts
  const handleCreatePayout = () => {
    const accountId = parseInt(payoutForm.account_id);
    const amount = Math.round(parseFloat(payoutForm.amount) * 100);
    if (!accountId || !amount || amount <= 0) return;
    createPayout(
      { account_id: accountId, amount },
      {
        onSuccess: () => {
          setShowPayoutModal(false);
          setPayoutForm({ account_id: "", amount: "" });
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Affiliates</h1>
          <p className="text-text-secondary mt-1">
            Manage affiliate programs, accounts, commissions, and payouts.
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* PROGRAMS SECTION (collapsible)                                      */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-border bg-bg-secondary">
        <button
          onClick={() => setProgramsExpanded(!programsExpanded)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Link className="h-5 w-5 text-accent" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-foreground">
                Affiliate Programs
              </h2>
              <p className="text-xs text-text-muted">
                {programs?.length ?? 0} program
                {(programs?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => {
                e.stopPropagation();
                openCreateProgram();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Program
            </span>
            {programsExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </div>
        </button>

        {programsExpanded && (
          <div className="border-t border-border">
            {loadingPrograms ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : !programs || programs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                No programs yet. Create your first affiliate program to get
                started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated">
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Commission
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Cookie Days
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Auto-Approve
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Accounts
                      </th>
                      <th className="px-5 py-3 text-right font-medium text-text-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {p.name}
                            </p>
                            {p.description && (
                              <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {p.commission_type === "percentage"
                            ? `${p.commission_amount}%`
                            : formatMoney(p.commission_amount)}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {p.cookie_days} days
                        </td>
                        <td className="px-5 py-3">
                          {p.auto_approve ? (
                            <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-medium text-text-muted">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {p.account_count ?? 0}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProgram(p)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProgram(p.id)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MAIN TABS                                                           */}
      {/* =================================================================== */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* =================================================================== */}
      {/* DASHBOARD TAB                                                       */}
      {/* =================================================================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {loadingDashboard ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : dashboard ? (
            <>
              {/* Stats cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-bg-secondary p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <p className="text-sm text-text-muted">Total Affiliates</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboard.total_affiliates}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-bg-secondary p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <p className="text-sm text-text-muted">
                      Active Affiliates
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboard.active_affiliates}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-bg-secondary p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                      <DollarSign className="h-5 w-5 text-yellow-400" />
                    </div>
                    <p className="text-sm text-text-muted">
                      Pending Commissions
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatMoney(dashboard.pending_commissions)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-bg-secondary p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-sm text-text-muted">Total Paid Out</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatMoney(dashboard.total_paid)}
                  </p>
                </div>
              </div>

              {/* Top affiliates */}
              <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Top Affiliates
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated">
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Rank
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Total Earned
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-text-muted">
                        Conversions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.top_affiliates &&
                    dashboard.top_affiliates.length > 0 ? (
                      dashboard.top_affiliates.map((aff, idx) => (
                        <tr
                          key={aff.account_id}
                          className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                        >
                          <td className="px-5 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium text-foreground">
                            {aff.name}
                          </td>
                          <td className="px-5 py-3 text-text-secondary">
                            {formatMoney(aff.total_earned)}
                          </td>
                          <td className="px-5 py-3 text-text-secondary">
                            {aff.conversions}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-text-muted"
                        >
                          No affiliate data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No dashboard data
              </h3>
              <p className="text-sm text-text-muted">
                Create an affiliate program and add accounts to see analytics
                here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* AFFILIATES TAB                                                      */}
      {/* =================================================================== */}
      {activeTab === "affiliates" && (
        <div className="space-y-4">
          {/* Filters + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
              {ACCOUNT_STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setAccountStatusFilter(opt.value);
                    setAccountPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    accountStatusFilter === opt.value
                      ? "bg-accent text-white"
                      : "text-text-muted hover:text-foreground hover:bg-bg-hover"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddAffiliateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Affiliate
            </button>
          </div>

          {/* Accounts table */}
          {loadingAccounts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Referral Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Total Earned
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {acc.contact
                              ? `${acc.contact.first_name} ${acc.contact.last_name}`
                              : `Contact #${acc.contact_id}`}
                          </p>
                          {acc.contact?.email && (
                            <p className="text-xs text-text-muted truncate">
                              {acc.contact.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {acc.program?.name ?? `Program #${acc.program_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
                          {acc.referral_code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatMoney(acc.balance)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatMoney(acc.total_earned)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            accountStatusBadge[acc.status] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {acc.status === "pending" && (
                            <button
                              onClick={() =>
                                updateAccountStatus({
                                  id: acc.id,
                                  status: "active",
                                })
                              }
                              className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {acc.status === "active" && (
                            <button
                              onClick={() =>
                                updateAccountStatus({
                                  id: acc.id,
                                  status: "suspended",
                                })
                              }
                              className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Suspend"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {acc.status === "suspended" && (
                            <button
                              onClick={() =>
                                updateAccountStatus({
                                  id: acc.id,
                                  status: "active",
                                })
                              }
                              className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                              title="Activate"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No affiliate accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {accountsMeta && accountsMeta.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-text-muted">
                    {accountsMeta.total} total
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setAccountPage((p) => Math.max(1, p - 1))
                      }
                      disabled={accountPage <= 1}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from(
                      { length: accountsMeta.pages },
                      (_, i) => i + 1
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAccountPage(p)}
                        className={`rounded-lg px-3 py-1 text-sm ${
                          p === accountPage
                            ? "bg-accent text-white"
                            : "text-text-muted hover:bg-bg-hover"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setAccountPage((p) =>
                          Math.min(accountsMeta.pages, p + 1)
                        )
                      }
                      disabled={accountPage >= accountsMeta.pages}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* COMMISSIONS TAB                                                     */}
      {/* =================================================================== */}
      {activeTab === "commissions" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1 w-fit">
            {COMMISSION_STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setCommissionStatusFilter(opt.value);
                  setCommissionPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  commissionStatusFilter === opt.value
                    ? "bg-accent text-white"
                    : "text-text-muted hover:text-foreground hover:bg-bg-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Commissions table */}
          {loadingCommissions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Affiliate
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {c.account?.contact
                          ? `${c.account.contact.first_name} ${c.account.contact.last_name}`
                          : `Account #${c.account_id}`}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatMoney(c.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            commissionStatusBadge[c.status] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === "pending" && (
                            <>
                              <button
                                onClick={() => approveCommission(c.id)}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => rejectCommission(c.id)}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No commissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {commissionsMeta && commissionsMeta.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-text-muted">
                    {commissionsMeta.total} total
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCommissionPage((p) => Math.max(1, p - 1))
                      }
                      disabled={commissionPage <= 1}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from(
                      { length: commissionsMeta.pages },
                      (_, i) => i + 1
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCommissionPage(p)}
                        className={`rounded-lg px-3 py-1 text-sm ${
                          p === commissionPage
                            ? "bg-accent text-white"
                            : "text-text-muted hover:bg-bg-hover"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setCommissionPage((p) =>
                          Math.min(commissionsMeta.pages, p + 1)
                        )
                      }
                      disabled={commissionPage >= commissionsMeta.pages}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* PAYOUTS TAB                                                         */}
      {/* =================================================================== */}
      {activeTab === "payouts" && (
        <div className="space-y-4">
          {/* Filter + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
              {PAYOUT_STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPayoutStatusFilter(opt.value);
                    setPayoutPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    payoutStatusFilter === opt.value
                      ? "bg-accent text-white"
                      : "text-text-muted hover:text-foreground hover:bg-bg-hover"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Payout
            </button>
          </div>

          {/* Payouts table */}
          {loadingPayouts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Affiliate
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {p.account?.contact
                          ? `${p.account.contact.first_name} ${p.account.contact.last_name}`
                          : `Account #${p.account_id}`}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary capitalize">
                        {p.method || "---"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            payoutStatusBadge[p.status] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === "pending" && (
                            <button
                              onClick={() => processPayout(p.id)}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                              title="Process"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No payouts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {payoutsMeta && payoutsMeta.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-text-muted">
                    {payoutsMeta.total} total
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setPayoutPage((p) => Math.max(1, p - 1))
                      }
                      disabled={payoutPage <= 1}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from(
                      { length: payoutsMeta.pages },
                      (_, i) => i + 1
                    ).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPayoutPage(p)}
                        className={`rounded-lg px-3 py-1 text-sm ${
                          p === payoutPage
                            ? "bg-accent text-white"
                            : "text-text-muted hover:bg-bg-hover"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setPayoutPage((p) =>
                          Math.min(payoutsMeta.pages, p + 1)
                        )
                      }
                      disabled={payoutPage >= payoutsMeta.pages}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* PROGRAM CREATE / EDIT MODAL                                         */}
      {/* =================================================================== */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingProgram ? "Edit Program" : "Create Program"}
              </h2>
              <button
                onClick={() => setShowProgramModal(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Default Affiliate Program"
                value={programForm.name}
                onChange={(e) =>
                  setProgramForm({ ...programForm, name: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="Optional description..."
                value={programForm.description}
                onChange={(e) =>
                  setProgramForm({
                    ...programForm,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Commission Type
                </label>
                <select
                  value={programForm.commission_type}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      commission_type: e.target.value as
                        | "percentage"
                        | "fixed",
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Commission Amount
                  {programForm.commission_type === "percentage"
                    ? " (%)"
                    : " ($)"}
                </label>
                <input
                  type="number"
                  placeholder={programForm.commission_type === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                  step={programForm.commission_type === "fixed" ? "0.01" : "1"}
                  value={programForm.commission_amount || ""}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      commission_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Cookie Days
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={programForm.cookie_days || ""}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      cookie_days: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Min Payout ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  value={programForm.min_payout_amount || ""}
                  onChange={(e) =>
                    setProgramForm({
                      ...programForm,
                      min_payout_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setProgramForm({
                    ...programForm,
                    auto_approve: !programForm.auto_approve,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  programForm.auto_approve ? "bg-accent" : "bg-bg-hover"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    programForm.auto_approve ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <label className="text-sm font-medium text-text-secondary">
                Auto-approve commissions
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowProgramModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgram}
                disabled={!programForm.name.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {editingProgram ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ADD AFFILIATE MODAL                                                 */}
      {/* =================================================================== */}
      {showAddAffiliateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Add Affiliate
              </h2>
              <button
                onClick={() => setShowAddAffiliateModal(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contact ID
              </label>
              <input
                type="number"
                placeholder="Enter contact ID"
                value={newAccountForm.contact_id}
                onChange={(e) =>
                  setNewAccountForm({
                    ...newAccountForm,
                    contact_id: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Program
              </label>
              <select
                value={newAccountForm.program_id}
                onChange={(e) =>
                  setNewAccountForm({
                    ...newAccountForm,
                    program_id: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Select a program</option>
                {programs?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddAffiliateModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={
                  !newAccountForm.contact_id || !newAccountForm.program_id
                }
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Add Affiliate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CREATE PAYOUT MODAL                                                 */}
      {/* =================================================================== */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Payout
              </h2>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Account ID
              </label>
              <input
                type="number"
                placeholder="Enter affiliate account ID"
                value={payoutForm.account_id}
                onChange={(e) =>
                  setPayoutForm({
                    ...payoutForm,
                    account_id: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payoutForm.amount}
                onChange={(e) =>
                  setPayoutForm({
                    ...payoutForm,
                    amount: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePayout}
                disabled={!payoutForm.account_id || !payoutForm.amount}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
