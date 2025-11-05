import { useEffect, useState } from 'react';
import { Modal } from './shared/Modal';
import { SignatureCanvas } from './shared/SignatureCanvas';
import type { PostEventReport, Project, WithId } from '../types';
import { updateProject } from '../services/projects';
import { logActivity } from '../services/activityHistory';
import { createNotification } from '../services/notifications';
import { findCurrentOwner } from '../services/teamMembers';
import { jsPDF } from 'jspdf';

// Export the PDF generation function so it can be used externally for manual downloads
export function generatePostEventReportPDF(project: WithId<Project>, report: PostEventReport) {
  const doc = new jsPDF({ unit: 'pt' });
  const margin = 60;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  // Header with black background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  // Red accent line
  doc.setFillColor(220, 38, 38); // Red
  doc.rect(0, 75, pageWidth, 5, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('POST-EVENT REPORT', margin, 50);

  // Reset text color for body
  doc.setTextColor(40, 40, 40);
  y = 110;

  // Project info box
  doc.setFillColor(249, 250, 251); // Light gray background
  doc.roundedRect(margin, y, pageWidth - (2 * margin), 90, 3, 3, 'F');
  doc.setDrawColor(209, 213, 219); // Gray border
  doc.roundedRect(margin, y, pageWidth - (2 * margin), 90, 3, 3, 'S');

  y += 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Project Information', margin + 15, y);
  
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // Gray
  doc.text(`Project:`, margin + 15, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Dark gray
  doc.text(project.title, margin + 80, y);
  
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`R2 Number:`, margin + 15, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(project.r2Number || 'N/A', margin + 80, y);
  
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Report Date:`, margin + 15, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  
  // Handle Firestore Timestamp or Date object
  const reportDate = (report.signedAt as any)?.toDate ? (report.signedAt as any).toDate() : new Date(report.signedAt);
  doc.text(reportDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), margin + 80, y);

  y += 40;
  doc.setTextColor(40, 40, 40);

  const writeSection = (title: string, text: string) => {
    if (!text) return;
    
    // Check if we need a new page
    if (y > pageHeight - 150) {
      doc.addPage();
      y = margin;
    }
    
    y += 10;
    
    // Section header with red underline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, y);
    doc.setDrawColor(220, 38, 38); // Red accent line
    doc.setLineWidth(2);
    doc.line(margin, y + 3, margin + doc.getTextWidth(title), y + 3);
    
    y += 18;
    
    // Section content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81); // Dark gray
    const lines = doc.splitTextToSize(text, pageWidth - (2 * margin));
    doc.text(lines, margin, y);
    y += lines.length * 14 + 5;
  };

  writeSection('Summary', report.summary);
  writeSection('Highlights', report.highlights || '');
  writeSection('Issues & Resolutions', report.issuesAndResolutions || '');
  writeSection('Client Feedback', report.clientFeedback || '');
  writeSection('Follow-Ups', report.followUps || '');
  writeSection('Budget Notes', report.budgetNotes || '');

  // Check if we need a new page for signature
  if (y > pageHeight - 150) {
    doc.addPage();
    y = margin;
  }

  y += 30;

  // Signature section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Signed By:', margin, y); y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text(`${report.signedByName}`, margin, y);
  doc.setTextColor(107, 114, 128);
  
  // Handle Firestore Timestamp or Date object for signature date
  const signedDate = (report.signedAt as any)?.toDate ? (report.signedAt as any).toDate() : new Date(report.signedAt);
  doc.text(`${signedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}`, margin + 200, y);
  
  // Add signature image if available
  if (report.signatureImage) {
    y += 15;
    try {
      doc.addImage(report.signatureImage, 'PNG', margin, y, 200, 56);
      y += 60;
    } catch (err) {
      console.error('Failed to add signature image to PDF:', err);
    }
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by Momentum Production Management', margin, pageHeight - 30);
  doc.text(new Date().toLocaleString(), pageWidth - margin - 100, pageHeight - 30);

  doc.save(`${project.title.replace(/\s+/g,'_')}_${project.r2Number || 'Report'}_Post-Event.pdf`);
}

interface PostEventReportModalProps {
  open: boolean;
  uid: string;
  organizationId: string;
  project: WithId<Project>;
  onClose: () => void;
  onSaved?: (report: PostEventReport) => void;
  onDownload?: () => void;
}

export default function PostEventReportModal({ open, uid, organizationId, project, onClose, onSaved }: PostEventReportModalProps) {
  const pmName = project.projectManager || 'Project Manager';
  const [summary, setSummary] = useState('');
  const [highlights, setHighlights] = useState('');
  const [issues, setIssues] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [followUps, setFollowUps] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [documentsOrganized, setDocumentsOrganized] = useState(false);
  const [photosUploaded, setPhotosUploaded] = useState(false);
  const [deliverablesDelivered, setDeliverablesDelivered] = useState(false);
  const [orderCleanedForInvoicing, setOrderCleanedForInvoicing] = useState(false);
  const [signature, setSignature] = useState(pmName);
  const [signatureImage, setSignatureImage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // All checklist items must be checked before signing
  const allChecklistComplete = documentsOrganized && photosUploaded && deliverablesDelivered && orderCleanedForInvoicing;
  const canSubmit = summary.trim().length > 0 && signature.trim().length > 0 && signatureImage.length > 0 && allChecklistComplete && confirm && !saving;
  const canSaveDraft = !saving; // Allow saving drafts at any time

  useEffect(() => {
    if (project.postEventReport) {
      const r = project.postEventReport;
      setSummary(r.summary || '');
      setHighlights(r.highlights || '');
      setIssues(r.issuesAndResolutions || '');
      setClientFeedback(r.clientFeedback || '');
      setFollowUps(r.followUps || '');
      setBudgetNotes(r.budgetNotes || '');
      setStatus((r as any).status || (r.signedAt ? 'submitted' : 'draft'));
      setDocumentsOrganized(r.documentsOrganized || false);
      setPhotosUploaded(r.photosUploaded || false);
      setDeliverablesDelivered(r.deliverablesDelivered || false);
      setOrderCleanedForInvoicing(r.orderCleanedForInvoicing || false);
      setSignature(r.signedByName || pmName);
        setSignatureImage(r.signatureImage || '');
      setConfirm(true);
    }
  }, [project, pmName]);

  const buildBaseReport = () => ({
    summary: summary.trim(),
    highlights: highlights.trim() || undefined,
    issuesAndResolutions: issues.trim() || undefined,
    clientFeedback: clientFeedback.trim() || undefined,
    followUps: followUps.trim() || undefined,
    budgetNotes: budgetNotes.trim() || undefined,
    documentsOrganized,
    photosUploaded,
    deliverablesDelivered,
    orderCleanedForInvoicing,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    const now = new Date();
    const report: PostEventReport = {
      ...buildBaseReport(),
      status: 'draft',
      signedById: '',
      signedByName: '',
      signedAt: '',
      updatedAt: now,
      createdAt: project.postEventReport?.createdAt || now,
    } as any;
    try {
      await updateProject(uid, project.id, { postEventReport: report });
      await logActivity(
        uid,
        'project',
        project.id,
        project.title,
        'updated',
        {
          description: 'Post-Event Report saved (draft)',
          changes: { postEventReport: { from: project.postEventReport ? '[existing]' : null, to: '[draft]' } }
        }
      );
      setStatus('draft');
      onSaved?.(report);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const now = new Date();
    const report: PostEventReport = {
      ...buildBaseReport(),
      status: 'submitted',
      signedById: uid,
      signedByName: signature.trim(),
        signatureImage,
      signedAt: now,
      updatedAt: now,
      createdAt: project.postEventReport?.createdAt || now,
    } as any;
    try {
      await updateProject(uid, project.id, { postEventReport: report });
      await logActivity(
        uid,
        'project',
        project.id,
        project.title,
        'updated',
        {
          description: 'Post-Event Report submitted for owner review and invoicing',
          changes: { postEventReport: { from: project.postEventReport ? '[existing]' : null, to: '[submitted]' } }
        }
      );
      
      // Notify owner that report is ready for review
      try {
        const owner = await findCurrentOwner(organizationId);
        if (owner && owner.userId) {
          await createNotification(
            organizationId,
            owner.userId,
            'post_event_report_submitted',
            'Post-Event Report Ready for Review',
            `${signature.trim()} has submitted the post-event report for "${project.title}". Please review and approve for invoicing.`,
            'project',
            project.id,
            project.title,
            uid,
            signature.trim()
          );
        }
      } catch (notifErr) {
        console.error('Failed to send notification:', notifErr);
        // Don't fail the entire operation if notification fails
      }
      
      setStatus('submitted');
      onSaved?.(report);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
  <Modal open={open} onClose={onClose} title={`Post-Event Report ${status === 'submitted' ? '— Submitted' : '(Draft)'}`} widthClass="max-w-3xl">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Event Summary *</label>
            <textarea value={summary} onChange={(e)=>setSummary(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Highlights</label>
            <textarea value={highlights} onChange={(e)=>setHighlights(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Issues & Resolutions</label>
            <textarea value={issues} onChange={(e)=>setIssues(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Client Feedback</label>
            <textarea value={clientFeedback} onChange={(e)=>setClientFeedback(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Follow-Ups</label>
            <textarea value={followUps} onChange={(e)=>setFollowUps(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Budget Notes</label>
            <textarea value={budgetNotes} onChange={(e)=>setBudgetNotes(e.target.value)} rows={4} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"/>
          </div>
        </div>

        {/* Completion Checklist */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Completion Checklist (All Required)
          </h3>
          <div className="space-y-2 bg-white/5 border border-white/10 rounded-lg p-4">
            <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={documentsOrganized} 
                onChange={(e)=>setDocumentsOrganized(e.target.checked)} disabled={status==='submitted'}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-700"
              />
              <span>All documents have been organized and are ready for archival</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={photosUploaded} 
                onChange={(e)=>setPhotosUploaded(e.target.checked)} disabled={status==='submitted'}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-700"
              />
              <span>Photos of the setup and event have been uploaded</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={deliverablesDelivered} 
                onChange={(e)=>setDeliverablesDelivered(e.target.checked)} disabled={status==='submitted'}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-700"
              />
              <span>Any deliverables have been sent to the client</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={orderCleanedForInvoicing} 
                onChange={(e)=>setOrderCleanedForInvoicing(e.target.checked)} disabled={status==='submitted'}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-700"
              />
              <span>The order has been cleaned and is ready to be invoiced</span>
            </label>
          </div>
          {!allChecklistComplete && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              All checklist items must be completed before signing
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Signature (type full name) *</label>
            <input value={signature} onChange={(e)=>setSignature(e.target.value)} disabled={status==='submitted'}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none" placeholder={pmName}/>
          </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Draw Signature *</label>
              <SignatureCanvas
                value={signatureImage}
                onChange={setSignatureImage}
                disabled={status === 'submitted'}
                width={500}
                height={150}
              />
              {!signatureImage && status !== 'submitted' && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Signature drawing required before submitting
                </p>
              )}
            </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={confirm} onChange={(e)=>setConfirm(e.target.checked)} disabled={status==='submitted'}
              className="w-4 h-4 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-700"/>
            I confirm this report is accurate and complete.
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">Close</button>
          {status !== 'submitted' && (
            <>
              <button onClick={handleSaveDraft} disabled={!canSaveDraft} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${canSaveDraft ? 'bg-white/5 border border-white/15 text-gray-200 hover:bg-white/10' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                Save Draft
              </button>
              <button onClick={handleSubmit} disabled={!canSubmit} className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${canSubmit ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                Submit Report
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
