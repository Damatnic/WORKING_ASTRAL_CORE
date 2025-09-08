'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  PrinterIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';

interface InsuranceProvider {
  id: string;
  name: string;
  type: 'commercial' | 'medicare' | 'medicaid' | 'eap' | 'cash_pay';
  contactInfo: {
    phone: string;
    email?: string;
    website?: string;
    address?: string;
  };
  claimsAddress: string;
  electronicSubmission: boolean;
  payerId?: string;
  contractedRates: { [cptCode: string]: number };
  reimbursementRate: number; // percentage
  averagePaymentDays: number;
  priorAuthRequired: string[]; // CPT codes requiring prior auth
  activeContract: boolean;
  contractExpiry?: Date;
  notes?: string;
}

interface Claim {
  id: string;
  clientId: string;
  clientName: string;
  sessionId: string;
  sessionDate: Date;
  providerId: string;
  providerName: string;
  insuranceProvider: InsuranceProvider;
  cptCode: string;
  cptDescription: string;
  diagnosisCodes: string[];
  chargedAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  patientResponsibility?: number;
  copayAmount?: number;
  deductibleAmount?: number;
  coinsuranceAmount?: number;
  submitDate: Date;
  processedDate?: Date;
  paidDate?: Date;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'denied' | 'paid' | 'partial_payment' | 'appealed';
  claimNumber?: string;
  denialReason?: string;
  appealDate?: Date;
  appealNotes?: string;
  remittanceAdvice?: string;
  notes?: string;
  followUpDate?: Date;
  daysPending?: number;
}

interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  services: ServiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'insurance';
  paymentDate?: Date;
  paymentReference?: string;
  notes?: string;
  remindersSent: number;
  lastReminderDate?: Date;
}

interface ServiceLineItem {
  id: string;
  sessionId: string;
  date: Date;
  cptCode: string;
  description: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  insuranceCovered: boolean;
  notes?: string;
}

interface BillingInsuranceManagementProps {
  className?: string;
}

const mockInsuranceProviders: InsuranceProvider[] = [
  {
    id: 'ins001',
    name: 'Blue Cross Blue Shield',
    type: 'commercial',
    contactInfo: {
      phone: '1-800-555-0123',
      email: 'provider.services@bcbs.com',
      website: 'www.bcbs.com/providers',
      address: '123 Insurance Ave, City, State 12345'
    },
    claimsAddress: 'PO Box 9999, Claims City, State 12345',
    electronicSubmission: true,
    payerId: 'BCBS001',
    contractedRates: {
      '90834': 120,
      '90837': 150,
      '90847': 140,
      '90853': 45
    },
    reimbursementRate: 85,
    averagePaymentDays: 14,
    priorAuthRequired: ['90837'],
    activeContract: true,
    contractExpiry: new Date('2024-12-31'),
    notes: 'Primary commercial payer, good reimbursement rates'
  },
  {
    id: 'ins002',
    name: 'Aetna',
    type: 'commercial',
    contactInfo: {
      phone: '1-800-555-0456',
      email: 'provider.relations@aetna.com',
      website: 'www.aetna.com/providers'
    },
    claimsAddress: 'Aetna Claims, PO Box 8888, Claims City, State 12345',
    electronicSubmission: true,
    payerId: 'AETNA01',
    contractedRates: {
      '90834': 115,
      '90837': 145,
      '90847': 135,
      '90853': 42
    },
    reimbursementRate: 82,
    averagePaymentDays: 18,
    priorAuthRequired: [],
    activeContract: true,
    contractExpiry: new Date('2025-06-30')
  },
  {
    id: 'ins003',
    name: 'Medicare',
    type: 'medicare',
    contactInfo: {
      phone: '1-800-MEDICARE',
      website: 'www.medicare.gov'
    },
    claimsAddress: 'Medicare Part B Claims',
    electronicSubmission: true,
    payerId: 'MEDICARE',
    contractedRates: {
      '90834': 95,
      '90837': 118,
      '90847': 110,
      '90853': 32
    },
    reimbursementRate: 80,
    averagePaymentDays: 21,
    priorAuthRequired: [],
    activeContract: true,
    notes: 'Federal insurance program'
  }
];

const mockClaims: Claim[] = [
  {
    id: 'claim001',
    clientId: 'cl001',
    clientName: 'Sarah Johnson',
    sessionId: 'session001',
    sessionDate: new Date('2024-01-15'),
    providerId: 'prov001',
    providerName: 'Dr. Emily Chen',
    insuranceProvider: mockInsuranceProviders[0],
    cptCode: '90834',
    cptDescription: 'Psychotherapy, 45 minutes',
    diagnosisCodes: ['F41.1', 'F32.1'],
    chargedAmount: 150,
    allowedAmount: 120,
    paidAmount: 102,
    patientResponsibility: 18,
    copayAmount: 20,
    deductibleAmount: 0,
    coinsuranceAmount: 18,
    submitDate: new Date('2024-01-16'),
    processedDate: new Date('2024-01-25'),
    paidDate: new Date('2024-01-30'),
    status: 'paid',
    claimNumber: 'BC2024011501',
    daysPending: 9
  },
  {
    id: 'claim002',
    clientId: 'cl002',
    clientName: 'Michael Rodriguez',
    sessionId: 'session002',
    sessionDate: new Date('2024-01-14'),
    providerId: 'prov001',
    providerName: 'Dr. Emily Chen',
    insuranceProvider: mockInsuranceProviders[1],
    cptCode: '90837',
    cptDescription: 'Psychotherapy, 60 minutes',
    diagnosisCodes: ['F43.10'],
    chargedAmount: 180,
    allowedAmount: 145,
    submitDate: new Date('2024-01-15'),
    status: 'pending',
    claimNumber: 'AE2024011401',
    daysPending: differenceInDays(new Date(), new Date('2024-01-15')),
    followUpDate: new Date('2024-02-15')
  },
  {
    id: 'claim003',
    clientId: 'cl003',
    clientName: 'Lisa Thompson',
    sessionId: 'session003',
    sessionDate: new Date('2024-01-13'),
    providerId: 'prov001',
    providerName: 'Dr. Emily Chen',
    insuranceProvider: mockInsuranceProviders[2],
    cptCode: '90847',
    cptDescription: 'Family therapy with patient present',
    diagnosisCodes: ['Z63.9'],
    chargedAmount: 160,
    allowedAmount: 110,
    submitDate: new Date('2024-01-14'),
    processedDate: new Date('2024-01-28'),
    status: 'denied',
    claimNumber: 'MC2024011301',
    denialReason: 'Services not medically necessary - requires additional documentation',
    daysPending: 14,
    notes: 'Need to submit treatment plan and progress notes for appeal'
  }
];

const mockInvoices: Invoice[] = [
  {
    id: 'inv001',
    clientId: 'cl004',
    clientName: 'David Wilson',
    invoiceNumber: 'INV-2024-001',
    issueDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-31'),
    services: [
      {
        id: 'svc001',
        sessionId: 'session004',
        date: new Date('2024-01-08'),
        cptCode: '90834',
        description: 'Individual Psychotherapy - 45 minutes',
        quantity: 1,
        unitRate: 150,
        totalAmount: 150,
        insuranceCovered: false
      },
      {
        id: 'svc002',
        sessionId: 'session005',
        date: new Date('2024-01-15'),
        cptCode: '90834',
        description: 'Individual Psychotherapy - 45 minutes',
        quantity: 1,
        unitRate: 150,
        totalAmount: 150,
        insuranceCovered: false
      }
    ],
    subtotal: 300,
    taxAmount: 0,
    totalAmount: 300,
    paidAmount: 150,
    balanceAmount: 150,
    status: 'partial_payment',
    paymentMethod: 'credit_card',
    paymentDate: new Date('2024-01-10'),
    paymentReference: 'CC-2024-001',
    remindersSent: 1,
    lastReminderDate: new Date('2024-01-20')
  },
  {
    id: 'inv002',
    clientId: 'cl005',
    clientName: 'Emma Davis',
    invoiceNumber: 'INV-2024-002',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-14'),
    services: [
      {
        id: 'svc003',
        sessionId: 'session006',
        date: new Date('2024-01-12'),
        cptCode: '90837',
        description: 'Individual Psychotherapy - 60 minutes',
        quantity: 1,
        unitRate: 180,
        totalAmount: 180,
        insuranceCovered: false
      }
    ],
    subtotal: 180,
    taxAmount: 0,
    totalAmount: 180,
    paidAmount: 0,
    balanceAmount: 180,
    status: 'sent',
    remindersSent: 0
  }
];

const cptCodes = [
  { code: '90791', description: 'Psychiatric diagnostic evaluation', rate: 200 },
  { code: '90834', description: 'Psychotherapy, 45 minutes', rate: 150 },
  { code: '90837', description: 'Psychotherapy, 60 minutes', rate: 180 },
  { code: '90847', description: 'Family therapy with patient present', rate: 160 },
  { code: '90853', description: 'Group psychotherapy', rate: 45 },
  { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services', rate: 220 }
];

export default function BillingInsuranceManagement({ className = "" }: BillingInsuranceManagementProps) {
  const [claims, setClaims] = useState<Claim[]>(mockClaims);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [insuranceProviders] = useState<InsuranceProvider[]>(mockInsuranceProviders);
  const [activeTab, setActiveTab] = useState<'claims' | 'invoices' | 'providers' | 'reports'>('claims');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Calculate billing statistics
  const billingStats = {
    totalBilled: claims.reduce((sum, claim) => sum + claim.chargedAmount, 0) + invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    totalPaid: claims.reduce((sum, claim) => sum + (claim.paidAmount || 0), 0) + invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    pendingClaims: claims.filter(c => c.status === 'pending').length,
    deniedClaims: claims.filter(c => c.status === 'denied').length,
    averageReimbursement: claims.filter(c => c.paidAmount).reduce((sum, c) => sum + (c.paidAmount! / c.chargedAmount), 0) / claims.filter(c => c.paidAmount).length * 100,
    overdueInvoices: invoices.filter(inv => inv.status === 'overdue' || (inv.balanceAmount > 0 && differenceInDays(new Date(), inv.dueDate) > 0)).length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'approved': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'submitted': return 'text-blue-600 bg-blue-50';
      case 'denied': return 'text-red-600 bg-red-50';
      case 'appealed': return 'text-purple-600 bg-purple-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'partial_payment': return 'text-orange-600 bg-orange-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'sent': return 'text-blue-600 bg-blue-50';
      case 'viewed': return 'text-indigo-600 bg-indigo-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowClaimModal(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleResubmitClaim = (claimId: string) => {
    setClaims(prev => prev.map(c => 
      c.id === claimId 
        ? { ...c, status: 'submitted', submitDate: new Date(), daysPending: 0 }
        : c
    ));
  };

  const handleAppealClaim = (claimId: string, appealNotes: string) => {
    setClaims(prev => prev.map(c => 
      c.id === claimId 
        ? { ...c, status: 'appealed', appealDate: new Date(), appealNotes, daysPending: 0 }
        : c
    ));
  };

  const handleSendReminder = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId 
        ? { ...inv, remindersSent: inv.remindersSent + 1, lastReminderDate: new Date() }
        : inv
    ));
  };

  const filteredClaims = claims.filter(claim => {
    if (searchTerm && !claim.clientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !claim.claimNumber?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedStatus && claim.status !== selectedStatus) return false;
    if (selectedProvider && claim.insuranceProvider.id !== selectedProvider) return false;
    if (dateRange.start && claim.sessionDate < new Date(dateRange.start)) return false;
    if (dateRange.end && claim.sessionDate > new Date(dateRange.end)) return false;
    return true;
  });

  const filteredInvoices = invoices.filter(invoice => {
    if (searchTerm && !invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedStatus && invoice.status !== selectedStatus) return false;
    if (dateRange.start && invoice.issueDate < new Date(dateRange.start)) return false;
    if (dateRange.end && invoice.issueDate > new Date(dateRange.end)) return false;
    return true;
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="h-6 w-6 text-indigo-600" />
              Billing & Insurance Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage insurance claims, invoices, and billing operations
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create {activeTab === 'claims' ? 'Claim' : 'Invoice'}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <BanknotesIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              ${billingStats.totalPaid.toLocaleString()}
            </p>
            <p className="text-sm text-green-600">
              {((billingStats.totalPaid / billingStats.totalBilled) * 100).toFixed(1)}% of billed
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Pending Claims</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{billingStats.pendingClaims}</p>
            <p className="text-sm text-yellow-600">Awaiting processing</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Denied Claims</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{billingStats.deniedClaims}</p>
            <p className="text-sm text-red-600">Require attention</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Avg Reimbursement</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {billingStats.averageReimbursement.toFixed(1)}%
            </p>
            <p className="text-sm text-blue-600">Of charged amount</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="flex space-x-8">
            {[
              { id: 'claims', label: 'Insurance Claims', icon: DocumentTextIcon },
              { id: 'invoices', label: 'Client Invoices', icon: CreditCardIcon },
              { id: 'providers', label: 'Insurance Providers', icon: BuildingOfficeIcon },
              { id: 'reports', label: 'Reports & Analytics', icon: ChartBarIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Filters */}
        {(activeTab === 'claims' || activeTab === 'invoices') && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Statuses</option>
                      {activeTab === 'claims' ? (
                        <>
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="denied">Denied</option>
                          <option value="submitted">Submitted</option>
                          <option value="appealed">Appealed</option>
                        </>
                      ) : (
                        <>
                          <option value="paid">Paid</option>
                          <option value="partial_payment">Partial Payment</option>
                          <option value="sent">Sent</option>
                          <option value="overdue">Overdue</option>
                          <option value="draft">Draft</option>
                        </>
                      )}
                    </select>
                  </div>

                  {activeTab === 'claims' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Providers</option>
                        {insuranceProviders.map(provider => (
                          <option key={provider.id} value={provider.id}>{provider.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="lg:col-span-4 flex justify-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedStatus('');
                        setSelectedProvider('');
                        setDateRange({ start: '', end: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Clear Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredClaims.map(claim => (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewClaim(claim)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium text-gray-900">{claim.clientName}</h3>
                        <span className="text-sm text-gray-600">•</span>
                        <span className="text-sm text-gray-600">{claim.cptDescription}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                        {claim.claimNumber && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {claim.claimNumber}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(claim.sessionDate, 'MMM d, yyyy')}
                        </div>
                        <div>
                          Insurance: {claim.insuranceProvider.name}
                        </div>
                        <div>
                          Charged: ${claim.chargedAmount}
                          {claim.paidAmount && ` • Paid: $${claim.paidAmount}`}
                        </div>
                        <div>
                          {claim.daysPending && claim.status === 'pending' && (
                            <span className="text-yellow-600">{claim.daysPending} days pending</span>
                          )}
                          {claim.status === 'denied' && (
                            <span className="text-red-600">Denied</span>
                          )}
                          {claim.status === 'paid' && (
                            <span className="text-green-600">Paid in {claim.daysPending} days</span>
                          )}
                        </div>
                      </div>

                      {claim.denialReason && (
                        <div className="mb-3">
                          <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
                            <strong>Denial Reason:</strong> {claim.denialReason}
                          </p>
                        </div>
                      )}

                      {claim.notes && (
                        <p className="text-sm text-gray-600 mb-3">{claim.notes}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 ml-4">
                      {claim.status === 'denied' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const appealNotes = prompt('Enter appeal notes:');
                            if (appealNotes) {
                              handleAppealClaim(claim.id, appealNotes);
                            }
                          }}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          Appeal
                        </button>
                      )}
                      {(claim.status === 'denied' || claim.status === 'draft') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResubmitClaim(claim.id);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Resubmit
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Print claim logic
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Print Claim"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredClaims.length === 0 && (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedStatus || selectedProvider || dateRange.start || dateRange.end
                    ? "Try adjusting your search criteria or filters."
                    : "Insurance claims will appear here."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredInvoices.map(invoice => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewInvoice(invoice)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <CreditCardIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                        <span className="text-sm text-gray-600">•</span>
                        <span className="text-sm text-gray-600">{invoice.invoiceNumber}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          Issued: {format(invoice.issueDate, 'MMM d, yyyy')}
                        </div>
                        <div>
                          Due: {format(invoice.dueDate, 'MMM d, yyyy')}
                          {differenceInDays(new Date(), invoice.dueDate) > 0 && invoice.balanceAmount > 0 && (
                            <span className="text-red-600 ml-1">
                              ({differenceInDays(new Date(), invoice.dueDate)} days overdue)
                            </span>
                          )}
                        </div>
                        <div>
                          Total: ${invoice.totalAmount}
                          {invoice.paidAmount > 0 && ` • Paid: $${invoice.paidAmount}`}
                        </div>
                        <div>
                          Balance: <span className={invoice.balanceAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            ${invoice.balanceAmount}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <span>{invoice.services.length} service{invoice.services.length !== 1 ? 's' : ''}</span>
                        {invoice.remindersSent > 0 && (
                          <span className="ml-4">
                            {invoice.remindersSent} reminder{invoice.remindersSent !== 1 ? 's' : ''} sent
                            {invoice.lastReminderDate && (
                              <span className="ml-1">
                                (last: {format(invoice.lastReminderDate, 'MMM d')})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 ml-4">
                      {invoice.balanceAmount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReminder(invoice.id);
                          }}
                          className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                          Send Reminder
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Print invoice logic
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Print Invoice"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12">
                <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedStatus || dateRange.start || dateRange.end
                    ? "Try adjusting your search criteria or filters."
                    : "Client invoices will appear here."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Insurance Providers Tab */}
        {activeTab === 'providers' && (
          <div className="grid gap-6">
            {insuranceProviders.map(provider => (
              <div key={provider.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <BuildingOfficeIcon className="h-6 w-6 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-900">{provider.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                        provider.type === 'commercial' ? 'bg-blue-100 text-blue-800' :
                        provider.type === 'medicare' ? 'bg-green-100 text-green-800' :
                        provider.type === 'medicaid' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {provider.type.replace('_', ' ')}
                      </span>
                      {provider.activeContract ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" title="Active Contract" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" title="No Active Contract" />
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4" />
                        {provider.contactInfo.phone}
                      </div>
                      {provider.contactInfo.email && (
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="h-4 w-4" />
                          {provider.contactInfo.email}
                        </div>
                      )}
                      <div>
                        Reimbursement: {provider.reimbursementRate}%
                      </div>
                      <div>
                        Avg Payment: {provider.averagePaymentDays} days
                      </div>
                      {provider.contractExpiry && (
                        <div>
                          Contract expires: {format(provider.contractExpiry, 'MMM d, yyyy')}
                        </div>
                      )}
                      <div>
                        Electronic submission: {provider.electronicSubmission ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contracted Rates</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(provider.contractedRates).map(([cpt, rate]) => (
                        <div key={cpt} className="flex justify-between">
                          <span>{cpt} - {cptCodes.find(c => c.code === cpt)?.description}</span>
                          <span className="font-medium">${rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {provider.priorAuthRequired.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Prior Auth Required</h4>
                      <div className="flex flex-wrap gap-1">
                        {provider.priorAuthRequired.map(cpt => (
                          <span key={cpt} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                            {cpt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {provider.notes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{provider.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="text-center py-12">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Reports & Analytics</h3>
            <p className="text-gray-600 mb-6">
              Comprehensive billing reports and financial analytics will be displayed here.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Revenue Reports</h4>
                <p className="text-sm text-gray-600">Monthly and yearly revenue analysis</p>
                <button className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  Generate Report →
                </button>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Claims Analysis</h4>
                <p className="text-sm text-gray-600">Approval rates and denial patterns</p>
                <button className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View Analytics →
                </button>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Outstanding Balances</h4>
                <p className="text-sm text-gray-600">Aging reports and collection tracking</p>
                <button className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View Report →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Claim Detail Modal */}
      <AnimatePresence>
        {showClaimModal && selectedClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Claim Details - {selectedClaim.clientName}
                </h2>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Claim Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Claim Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Claim Number:</strong> {selectedClaim.claimNumber}</div>
                      <div><strong>Client:</strong> {selectedClaim.clientName}</div>
                      <div><strong>Session Date:</strong> {format(selectedClaim.sessionDate, 'PPP')}</div>
                      <div><strong>Provider:</strong> {selectedClaim.providerName}</div>
                      <div><strong>CPT Code:</strong> {selectedClaim.cptCode} - {selectedClaim.cptDescription}</div>
                      <div><strong>Diagnosis Codes:</strong> {selectedClaim.diagnosisCodes.join(', ')}</div>
                      <div><strong>Submit Date:</strong> {format(selectedClaim.submitDate, 'PPP')}</div>
                      {selectedClaim.processedDate && (
                        <div><strong>Processed Date:</strong> {format(selectedClaim.processedDate, 'PPP')}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Charged Amount:</strong> ${selectedClaim.chargedAmount}</div>
                      {selectedClaim.allowedAmount && (
                        <div><strong>Allowed Amount:</strong> ${selectedClaim.allowedAmount}</div>
                      )}
                      {selectedClaim.paidAmount && (
                        <div><strong>Paid Amount:</strong> ${selectedClaim.paidAmount}</div>
                      )}
                      {selectedClaim.patientResponsibility && (
                        <div><strong>Patient Responsibility:</strong> ${selectedClaim.patientResponsibility}</div>
                      )}
                      {selectedClaim.copayAmount && (
                        <div><strong>Copay:</strong> ${selectedClaim.copayAmount}</div>
                      )}
                      {selectedClaim.deductibleAmount && (
                        <div><strong>Deductible:</strong> ${selectedClaim.deductibleAmount}</div>
                      )}
                      <div className="flex items-center gap-2">
                        <strong>Status:</strong>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedClaim.status)}`}>
                          {selectedClaim.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insurance Provider Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Insurance Provider</h3>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Provider:</strong> {selectedClaim.insuranceProvider.name}</div>
                      <div><strong>Type:</strong> {selectedClaim.insuranceProvider.type}</div>
                      <div><strong>Phone:</strong> {selectedClaim.insuranceProvider.contactInfo.phone}</div>
                      <div><strong>Payer ID:</strong> {selectedClaim.insuranceProvider.payerId}</div>
                      <div><strong>Avg Payment Days:</strong> {selectedClaim.insuranceProvider.averagePaymentDays}</div>
                      <div><strong>Reimbursement Rate:</strong> {selectedClaim.insuranceProvider.reimbursementRate}%</div>
                    </div>
                  </div>
                </div>

                {/* Denial Information */}
                {selectedClaim.denialReason && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Denial Information</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 mb-2"><strong>Reason:</strong> {selectedClaim.denialReason}</p>
                      {selectedClaim.appealDate && (
                        <p className="text-sm text-red-700">
                          Appeal submitted on {format(selectedClaim.appealDate, 'PPP')}
                        </p>
                      )}
                      {selectedClaim.appealNotes && (
                        <p className="text-sm text-red-700 mt-2">
                          <strong>Appeal Notes:</strong> {selectedClaim.appealNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedClaim.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                    <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{selectedClaim.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}