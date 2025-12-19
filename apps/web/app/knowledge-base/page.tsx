'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Loader2, FileText, Calendar } from 'lucide-react';
import { getToken } from '@/lib/auth';
import { feedKnowledgeBase, getJobStatus, getDocuments } from '@/lib/api/knowledge-base';
import type { GetJobStatusResponseDto, PaginatedDocumentsResponseDto } from '@qflow/api-types';

const EMBEDDED_MARKDOWN_CONTENT = `# SaaS Security Reference Guide

## 1. Authentication & Access Control

- Supported authentication methods: SAML 2.0, OIDC, and password-based login with configurable password policies (min 8 chars, complexity, 90-day expiration).  
- Multi-factor authentication (MFA) is available for all users and can be enforced by organization admins via policy.  
- Role-based access control (RBAC) with built-in roles (Admin, Editor, Viewer) and support for custom roles with granular permissions.  
- Sessions are protected with 30-minute inactivity timeout, max 3 concurrent sessions, and optional device trust for trusted devices.  
- Enterprise features: SCIM 2.0 for automated user provisioning, IP allowlisting, and conditional access policies based on IP, device, and risk level.

***

## 2. Data Security – Encryption & Storage

- Customer data at rest is encrypted using AES‑256 with keys managed by a cloud KMS (Key Management Service); keys are rotated automatically.  
- Data in transit is protected with TLS 1.3 using modern cipher suites (e.g., ECDHE‑RSA‑AES256‑GCM‑SHA384) and HSTS enforcement.  
- Customer data is stored in encrypted databases and object storage; backups are also encrypted at rest with the same standards.  
- Data is stored in AWS regions (e.g., eu‑west‑1, us‑east‑1) and can be restricted to specific regions based on customer requirements.

***

## 3. Data Security – Multi-tenancy & Isolation

- The application uses a multi-tenant architecture where each customer (tenant) has a logically isolated data schema and access controls.  
- Tenant data is separated at the application and database level; cross-tenant access is prevented by strict RBAC and tenant context checks.  
- Customer data cannot be accessed by other tenants or by the provider's support team without explicit, audited access and customer consent.  
- Data segregation is enforced via tenant IDs in all queries and APIs, and tenant-specific encryption keys can be used for additional isolation.

***

## 4. Infrastructure & Network Security

- The application runs on AWS (EC2, RDS, S3) behind a WAF (Web Application Firewall) and DDoS protection (AWS Shield).  
- Network security: VPCs with private subnets, security groups, and NACLs; public-facing components are behind a load balancer and WAF.  
- Servers and containers are hardened according to CIS benchmarks; SSH/RDP access is restricted to jump hosts and monitored.  
- Regular vulnerability scanning and patching: critical OS and dependency patches are applied within 7 days, with zero‑downtime rolling updates.

***

## 5. Compliance & Certifications

- The SaaS platform is compliant with SOC 2 Type II (Security, Availability, Confidentiality) and ISO 27001; reports are available to enterprise customers.  
- GDPR, CCPA, and other major privacy regulations are supported via data residency options, DPA, and privacy‑by‑design practices.  
- For regulated industries: PCI DSS (for payment data) and HIPAA (for PHI) are supported via dedicated environments and BAAs.  
- Independent penetration tests are performed annually by a third‑party firm, and reports are shared under NDA with enterprise customers.

***

## 6. Operations & Risk Management

- Incident response: 24/7 monitoring with SIEM and SOAR; security incidents are detected, triaged, and escalated within 15 minutes.  
- Breach notification: affected customers are notified within 72 hours of a confirmed breach, in line with GDPR and other regulations.  
- Vulnerability management: internal pentests, bug bounty program, and automated scanning; critical issues are patched within 7 days.  
- Change management: all changes go through code review, automated testing, and staged rollouts (canary, blue/green) with rollback capability.

***

## 7. Backup & Disaster Recovery

- Daily encrypted backups of databases and critical data; backups are stored in a separate region and retained for 30 days.  
- RPO (Recovery Point Objective) is 15 minutes for critical services; RTO (Recovery Time Objective) is 1 hour for major incidents.  
- Disaster recovery plan includes failover to a secondary region; DR tests are performed quarterly and documented in runbooks.  
- Customers can export their data via API or UI; data deletion follows a secure wipe process after the retention period.

***

## 8. API & Integration Security

- APIs are secured with OAuth 2.0 (client credentials, authorization code) and API keys; scopes limit access to specific resources.  
- Rate limiting and abuse prevention: per‑client quotas, burst limits, and automated blocking of suspicious traffic patterns.  
- Third‑party integrations run in a sandboxed environment; OAuth scopes are minimized and reviewed during integration onboarding.  
- Webhooks are signed with HMAC and can be restricted to specific IP ranges; integration logs are retained for audit and troubleshooting.

***

## 9. Legal & Contractual

- A standard Data Processing Agreement (DPA) is available and can be signed by customers; it covers GDPR, CCPA, and similar laws.  
- Security‑related SLAs: 99.9% uptime for core services, 1‑hour response time for P1 security incidents, and 24‑hour resolution target.  
- Data residency: customers can choose storage regions (e.g., EU, US, APAC); cross‑border transfers use SCCs or equivalent mechanisms.  
- Sub‑processors (e.g., AWS, SendGrid, Stripe) are listed in a public sub‑processor page; customers can object to new sub‑processors with notice.

***

## 10. Privacy & Data Handling

- Personal data collected: email, name, job title, usage logs, and optional profile data; no sensitive data is stored unless explicitly enabled.  
- Data is processed only for service delivery, support, and security; analytics are aggregated and anonymized where possible.  
- Data retention: active customer data is kept as long as the account is active; after deletion, data is irreversibly removed within 30 days.  
- Data subject rights (access, rectification, deletion, portability) are supported via self‑service tools and support channels.`;

export default function KnowledgeBasePage() {
  const [text, setText] = useState(EMBEDDED_MARKDOWN_CONTENT);
  const [confirmed, setConfirmed] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<GetJobStatusResponseDto | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PaginatedDocumentsResponseDto | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsPage, setDocumentsPage] = useState(1);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch documents on mount and when page changes
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const token = getToken();
        if (!token) {
          return;
        }

        const docs = await getDocuments(token, documentsPage, 10);
        setDocuments(docs);
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setIsLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [documentsPage]);

  // Refresh documents when job completes successfully
  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      const fetchDocuments = async () => {
        try {
          const token = getToken();
          if (!token) {
            return;
          }

          const docs = await getDocuments(token, documentsPage, 10);
          setDocuments(docs);
        } catch (err) {
          console.error('Error fetching documents:', err);
        }
      };

      fetchDocuments();
    }
  }, [jobStatus?.status, documentsPage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Polling effect
  useEffect(() => {
    if (!jobId || !isPolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const pollJobStatus = async () => {
      try {
        const token = getToken();
        if (!token) {
          setError('Authentication token not found');
          setIsPolling(false);
          return;
        }

        const status = await getJobStatus(token, jobId);
        setJobStatus(status);

        // Stop polling if job is completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
        setError(err instanceof Error ? err.message : 'Failed to get job status');
        setIsPolling(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    };

    // Poll immediately, then every 2 seconds
    pollJobStatus();
    pollingIntervalRef.current = setInterval(pollJobStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, isPolling]);

  const handleSubmit = async () => {
    if (!confirmed || !text.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJobStatus(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await feedKnowledgeBase(token, { text });
      setJobId(response.jobId);
      setIsPolling(true);
    } catch (err) {
      console.error('Error submitting job:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'active':
      case 'waiting':
      case 'delayed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'active':
      case 'waiting':
      case 'delayed':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Disclaimer Alert */}
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Disclaimer</AlertTitle>
          <AlertDescription className="text-amber-800">
            This knowledge base is user-provided and intended for demonstration purposes only. <br />
            This application is a Proof of Concept. <br />
            Do not upload confidential, sensitive, or proprietary company data.
          </AlertDescription>
        </Alert>

        {/* Text Input Card */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Knowledge Base Input</CardTitle>
            <CardDescription className="text-slate-600">
              Enter your own documentation or notes to build a custom knowledge base. <br />
              Content is processed locally for this Proof of Concept.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter markdown content here..."
              className="min-h-[400px] font-mono text-sm"
            />

            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="confirm-checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label
                htmlFor="confirm-checkbox"
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                I confirm that the content I upload does not include confidential or proprietary information.
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!confirmed || isSubmitting || (jobStatus?.status === 'active' || jobStatus?.status === 'waiting' || jobStatus?.status === 'delayed')}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Build knowledge base from input'
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Job Status Display */}
            {jobStatus && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(jobStatus.status)}
                    <span className="text-sm font-medium text-slate-700">Status:</span>
                    <Badge variant={getStatusBadgeVariant(jobStatus.status)}>
                      {jobStatus.status}
                    </Badge>
                  </div>
                  {jobStatus.progress !== undefined && (
                    <span className="text-sm text-slate-600">
                      {Math.round(jobStatus.progress)}%
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {jobStatus.progress !== undefined && (
                  <Progress value={jobStatus.progress} className="h-2" />
                )}

                {/* Result Display */}
                {jobStatus.status === 'completed' && jobStatus.result && (
                  <Alert className="border-green-200 bg-green-50/50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Processing Complete</AlertTitle>
                    <AlertDescription className="text-green-800">
                      Created {jobStatus.result.documentsCreated} document(s) with{' '}
                      {jobStatus.result.totalChunks} chunk(s) and{' '}
                      {jobStatus.result.totalEmbeddings} embedding(s).
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Display */}
                {jobStatus.status === 'failed' && jobStatus.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Job Failed</AlertTitle>
                    <AlertDescription>{jobStatus.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents List Card */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Uploaded Documents</CardTitle>
            <CardDescription className="text-slate-600">
              Documents uploaded by the user and processed for this Proof of Concept. <br />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : documents && documents.data.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="text-slate-700">Filename</TableHead>
                        <TableHead className="text-slate-700">Embeddings</TableHead>
                        <TableHead className="text-slate-700">Upload Date</TableHead>
                        <TableHead className="text-slate-700">Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.data.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-500" />
                              <span>{doc.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {doc.embeddings.length} chunks
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(doc.uploadDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {documents.total > documents.limit && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing {(documents.page - 1) * documents.limit + 1} to{' '}
                      {Math.min(documents.page * documents.limit, documents.total)} of{' '}
                      {documents.total} documents
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentsPage((p) => Math.max(1, p - 1))}
                        disabled={documents.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentsPage((p) => p + 1)}
                        disabled={documents.page * documents.limit >= documents.total}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                No documents found. Upload and process documents to see them here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
