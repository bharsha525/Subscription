/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  UserCheck,
  Send,
  MessageSquare,
  Check,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Task, StaffProfile, Customer, TaskStatus } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'motion/react';

interface StaffTasksViewProps {
  onNavigate: (view: string) => void;
}

const PHASES: { id: TaskStatus; label: string; color: string; badgeBg: string }[] = [
  { id: 'Assigned', label: 'Assigned', color: 'text-blue-700 dark:text-blue-400', badgeBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
  { id: 'In Progress', label: 'In Progress', color: 'text-amber-700 dark:text-amber-400', badgeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
  { id: 'Submitted for Review', label: 'Submitted for Review', color: 'text-purple-700 dark:text-purple-400', badgeBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
  { id: 'Feedback Provided', label: 'Feedback / Revisions', color: 'text-rose-700 dark:text-rose-400', badgeBg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800' },
  { id: 'Approved', label: 'Approved', color: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
];

export const StaffTasksView: React.FC<StaffTasksViewProps> = ({ onNavigate }) => {
  const { isAdmin, isStaff, currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhaseTab, setActivePhaseTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyTasks, setOnlyMyTasks] = useState(isStaff && !isAdmin);

  // Admin Assign Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');

  // Staff Submit for Review Modal
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Admin Review Modal
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isReviewingAction, setIsReviewingAction] = useState(false);

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [actionAlert, setActionAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [resTasks, resStaff, resCust] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/staff'),
        fetch('/api/customers'),
      ]);
      const dataTasks = await resTasks.json();
      const dataStaff = await resStaff.json();
      const dataCust = await resCust.json();

      setTasks(dataTasks.tasks || []);
      setStaffList(dataStaff.staff || []);
      setCustomers(dataCust.customers || []);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Admin: Assign New Task
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          assignedStaffId,
          customerId: selectedCustomerId || undefined,
          priority,
          dueDate: dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setTitle('');
        setDescription('');
        setSelectedCustomerId('');
        setAssignedStaffId('');
        setActionAlert({ message: `Task successfully assigned to ${data.task.assignedStaffName}`, type: 'success' });
        await fetchTasks();
      } else {
        setActionAlert({ message: data.error || 'Failed to assign task.', type: 'error' });
      }
    } catch (err: any) {
      setActionAlert({ message: err.message || 'Error creating task', type: 'error' });
    } finally {
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  // Staff: Move Assigned -> In Progress
  const handleStartTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Progress' }),
      });
      if (res.ok) {
        setActionAlert({ message: `Task "${task.title}" is now In Progress.`, type: 'success' });
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setActionAlert(null), 4000);
    }
  };

  // Staff: Submit Work for Admin Review
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/tasks/${submittingTask.id}/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmittingTask(null);
        setSubmissionNotes('');
        setActionAlert({ message: 'Work successfully submitted for Admin Review.', type: 'success' });
        await fetchTasks();
      } else {
        setActionAlert({ message: data.error || 'Failed to submit work for review.', type: 'error' });
      }
    } catch (err: any) {
      setActionAlert({ message: err.message || 'Error submitting review', type: 'error' });
    } finally {
      setIsSubmittingReview(false);
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  // Admin: Review Task (Approve or Provide Feedback)
  const handleAdminReviewDecision = async (decision: 'approve' | 'feedback') => {
    if (!reviewingTask) return;
    setIsReviewingAction(true);
    try {
      const res = await fetch(`/api/tasks/${reviewingTask.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          feedbackNotes: feedbackNotes || (decision === 'approve' ? 'Approved by Admin' : ''),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewingTask(null);
        setFeedbackNotes('');
        setActionAlert({
          message: decision === 'approve' ? 'Task work approved and marked completed!' : 'Feedback returned to staff member.',
          type: 'success',
        });
        await fetchTasks();
      } else {
        setActionAlert({ message: data.error || 'Failed to complete review.', type: 'error' });
      }
    } catch (err: any) {
      setActionAlert({ message: err.message || 'Error processing review', type: 'error' });
    } finally {
      setIsReviewingAction(false);
      setTimeout(() => setActionAlert(null), 5000);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (onlyMyTasks && currentUser?.fullName) {
      const myName = currentUser.fullName.toLowerCase();
      const assigned = t.assignedStaffName.toLowerCase();
      const firstWord = myName.split(' ')[0];
      if (!assigned.includes(myName) && !myName.includes(assigned) && !assigned.includes(firstWord)) {
        return false;
      }
    }

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.assignedStaffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activePhaseTab === 'all') return true;
    return t.status.toLowerCase() === activePhaseTab.toLowerCase();
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono mb-1 font-semibold">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Phase-Wise Multi-Stage Workflow
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {isAdmin ? 'Staff Task Operations & Admin Reviews' : 'My Assigned Operational Tasks'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Requirement 1: Assign tasks to staff, inspect submitted deliverables, provide phase feedback, and approve.'
              : 'Requirement 1: Manage assigned operational work. Submit completed deliverables for Admin review.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {lastRefreshTime}</span>
          </div>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Tasks"
          >
            <Clock className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          {/* Requirement 1: ONLY Admin can assign tasks to Staff */}
          {isAdmin && (
            <button
              onClick={() => {
                setShowAddModal(true);
                if (staffList.length > 0 && !assignedStaffId) {
                  setAssignedStaffId(staffList[0].id);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Task to Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionAlert && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
          actionAlert.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Phase Workflow Strip / Stepper (Requirement 1: Assigned -> In Progress -> Submitted for Review -> Feedback / Approved) */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>Phase Progression Pipeline</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {tasks.length} Total Registered Tasks
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PHASES.map((phase, idx) => {
            const count = tasks.filter(t => t.status.toLowerCase() === phase.id.toLowerCase()).length;
            const isTabActive = activePhaseTab.toLowerCase() === phase.id.toLowerCase();

            return (
              <button
                key={phase.id}
                onClick={() => setActivePhaseTab(isTabActive ? 'all' : phase.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isTabActive
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Phase 0{idx + 1}</span>
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${phase.badgeBg} ${phase.color}`}>
                    {count}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {phase.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by task title, description, assigned staff member, or customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setOnlyMyTasks(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
              onlyMyTasks
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{onlyMyTasks ? 'Showing: My Assigned Tasks' : 'Filter: Assigned to Me'}</span>
          </button>

          {activePhaseTab !== 'all' && (
            <button
              onClick={() => setActivePhaseTab('all')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 font-medium cursor-pointer"
            >
              Clear Filter ({activePhaseTab})
            </button>
          )}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
            No tasks found matching the selected filter or search criteria.
          </div>
        ) : (
          filteredTasks.map(task => {
            const phaseMatch = PHASES.find(p => p.id.toLowerCase() === task.status.toLowerCase()) || PHASES[0];

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-full border ${phaseMatch.badgeBg} ${phaseMatch.color}`}>
                      {task.status}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Submission Notes Preview */}
                  {task.submissionNotes && (
                    <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 text-[11px] text-purple-900 dark:text-purple-300 space-y-0.5">
                      <span className="font-bold block text-[10px] uppercase font-mono">Work Submitted:</span>
                      <p className="line-clamp-2 italic">{task.submissionNotes}</p>
                    </div>
                  )}

                  {/* Feedback Comments Alert */}
                  {task.status === 'Feedback Provided' && task.adminFeedback && (
                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-300 space-y-0.5">
                      <span className="font-bold flex items-center gap-1 text-[10px] uppercase text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-3 h-3" />
                        Admin Corrections Required:
                      </span>
                      <p className="line-clamp-2">{task.adminFeedback}</p>
                    </div>
                  )}
                </div>

                {/* Footer Strip & Context Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[130px]">👤 {task.assignedStaffName}</span>
                    <span>Due: {task.dueDate}</span>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                    {/* STAFF ACTION: Start Task */}
                    {task.status === 'Assigned' && (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer text-center"
                      >
                        Start Working →
                      </button>
                    )}

                    {/* STAFF ACTION: Submit for Admin Review */}
                    {(task.status === 'In Progress' || task.status === 'Feedback Provided') && (
                      <button
                        onClick={() => {
                          setSubmittingTask(task);
                          setSubmissionNotes(task.submissionNotes || '');
                        }}
                        className="w-full py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Work for Review</span>
                      </button>
                    )}

                    {/* ADMIN ACTION: Review Submitted Work */}
                    {isAdmin && task.status === 'Submitted for Review' && (
                      <button
                        onClick={() => {
                          setReviewingTask(task);
                          setFeedbackNotes('');
                        }}
                        className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Review & Decide</span>
                      </button>
                    )}

                    {/* Approved Badge */}
                    {task.status === 'Approved' && (
                      <div className="w-full py-1 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                        Approved & Completed ✓
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Admin Assign Task to Staff (Admin-Only, Requirement 1) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Assign Operational Task to Staff
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requirement 1: Only Admin can assign tasks. The task will appear in the staff member's queue.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Follow up on Q4 renewal terms with Acme Technologies"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign to Staff Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignedStaffId}
                    onChange={e => setAssignedStaffId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Related Customer (Optional)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">-- None / Internal Task --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Escalation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Scope & Deliverable Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Outline the required operational steps, documents to review, and expected deliverable..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Assign to Staff →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Staff Submit Work for Admin Review (Staff-Only, Requirement 1) */}
      {submittingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Phase: Submitted for Review</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Submit Work for Admin Review
                </h3>
              </div>
              <button onClick={() => setSubmittingTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">{submittingTask.title}</span>
              <p className="text-slate-500 mt-1">{submittingTask.description || 'Assigned task work deliverable.'}</p>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deliverable Summary & Completed Actions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  placeholder="Detail the work completed, customer response, attached quotation reference, or settlement notes for the Administrator to review..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmittingTask(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmittingReview ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingReview ? 'Submitting...' : 'Submit for Admin Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Review Decision (Admin-Only, Requirement 1) */}
      {reviewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-600 uppercase">Phase: Admin Review</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Review Staff Deliverable
                </h3>
              </div>
              <button onClick={() => setReviewingTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Task Details</span>
                <strong className="text-slate-900 dark:text-white text-sm">{reviewingTask.title}</strong>
                <p className="text-slate-500 mt-0.5">Staff: {reviewingTask.assignedStaffName}</p>
              </div>

              {reviewingTask.submissionNotes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-purple-600 dark:text-purple-400 font-bold block mb-1">
                    Submitted Work Deliverable:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {reviewingTask.submissionNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Administrator Feedback & Review Notes
              </label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                placeholder="Enter approval congratulations or specify exact revisions required by staff member..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="w-full sm:w-auto px-4 py-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleAdminReviewDecision('feedback')}
                    disabled={isReviewingAction}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Request Corrections ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminReviewDecision('approve')}
                    disabled={isReviewingAction}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Work ✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Task Full Details & Timeline */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                  {selectedTask.status}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Assigned Staff</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedTask.assignedStaffName}</strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Due Date</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedTask.dueDate}</strong>
              </div>
            </div>

            {selectedTask.description && (
              <div className="text-xs text-slate-600 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Scope</span>
                {selectedTask.description}
              </div>
            )}

            {selectedTask.submissionNotes && (
              <div className="text-xs p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300">
                <span className="text-[10px] font-bold font-mono uppercase block mb-1">Submitted Work Deliverable:</span>
                {selectedTask.submissionNotes}
              </div>
            )}

            {selectedTask.adminFeedback && (
              <div className="text-xs p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                <span className="text-[10px] font-bold font-mono uppercase block mb-1">Administrator Review Notes:</span>
                {selectedTask.adminFeedback}
              </div>
            )}

            {/* Review History Stepper */}
            {selectedTask.reviewHistory && selectedTask.reviewHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Workflow Event History</span>
                <div className="space-y-2 text-xs">
                  {selectedTask.reviewHistory.map((entry, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-800 dark:text-slate-200">{entry.phase}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{entry.at?.split('T')[0]}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{entry.notes}</p>
                        <span className="text-[10px] text-slate-400">By: {entry.by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
