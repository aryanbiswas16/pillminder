import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, X, Clock, Pill, Trash2, ChevronDown, ChevronUp,
  Check, AlertCircle, Calendar, Edit3, ArrowLeft, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ── Analog Clock Picker ── */
function ClockPicker({ hour, minute, am, onHourChange, onMinuteChange, onAmChange, onDone, onCancel }) {
  const cx = 130, cy = 130, r = 100;
  const pad = n => String(n).padStart(2, '0');
  const displayHour = hour === 12 ? 12 : hour % 12 || 12;
  const hourAngle = ((displayHour % 12) / 12) * 2 * Math.PI - Math.PI / 2;
  const handX = cx + r * 0.72 * Math.cos(hourAngle);
  const handY = cy + r * 0.72 * Math.sin(hourAngle);
  const clockHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutePresets = [0, 15, 30, 45];

  const getPos = h => {
    const angle = ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const handleHourClick = h => {
    // h is the display number from clock face (1-12)
    // Convert to 0-23 based on am
    let h24;
    if (am) {
      h24 = h === 12 ? 0 : h;
    } else {
      h24 = h === 12 ? 12 : h + 12;
    }
    onHourChange(h24);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Digital display */}
        <div className="bg-blue-600 px-6 py-5 text-center rounded-t-3xl">
          <p className="text-6xl font-extrabold text-white tracking-tight leading-none">
            {pad(displayHour)}:{pad(minute)}
          </p>
          <p className="text-2xl font-bold text-blue-200 mt-1">{am ? 'AM' : 'PM'}</p>
        </div>

        {/* Clock face */}
        <div className="flex justify-center px-4 pt-5 pb-1">
          <svg width="260" height="260" viewBox="0 0 260 260" style={{ touchAction: 'none' }}>
            <circle cx="130" cy="130" r="122" fill="#EFF6FF" />
            <circle cx="130" cy="130" r="122" fill="none" stroke="#BFDBFE" strokeWidth="2" />
            {/* Hour hand */}
            <line x1="130" y1="130" x2={handX} y2={handY} stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
            <circle cx="130" cy="130" r="5" fill="#2563EB" />
            <circle cx={handX} cy={handY} r="11" fill="#2563EB" />
            {/* Hour numbers */}
            {clockHours.map(h => {
              const pos = getPos(h);
              const isSelected = displayHour % 12 === h % 12;
              return (
                <g key={h} onClick={() => handleHourClick(h)} style={{ cursor: 'pointer' }}>
                  <circle cx={pos.x} cy={pos.y} r="20" fill={isSelected ? '#2563EB' : 'transparent'} />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="19"
                    fontWeight="700"
                    fill={isSelected ? 'white' : '#1E3A5F'}
                  >{h}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Minute presets */}
        <div className="flex gap-2 px-5 mb-4">
          {minutePresets.map(m => (
            <button
              key={m}
              onClick={() => onMinuteChange(m)}
              className={`flex-1 py-3 rounded-2xl text-lg font-extrabold transition-all ${
                minute === m
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
              }`}
              style={{ minHeight: '52px' }}
            >:{pad(m)}</button>
          ))}
        </div>

        {/* AM / PM */}
        <div className="flex mx-5 mb-5 rounded-2xl overflow-hidden border-2 border-gray-200" style={{ minHeight: '56px' }}>
          <button
            onClick={() => onAmChange(true)}
            className={`flex-1 text-xl font-extrabold transition-all ${am ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
          >AM</button>
          <div className="w-px bg-gray-200" />
          <button
            onClick={() => onAmChange(false)}
            className={`flex-1 text-xl font-extrabold transition-all ${!am ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
          >PM</button>
        </div>

        {/* Done */}
        <button
          onClick={onDone}
          className="mx-5 mb-6 rounded-2xl bg-blue-600 text-white text-xl font-extrabold py-4 hover:bg-blue-700 transition-all"
          style={{ width: 'calc(100% - 40px)', minHeight: '60px' }}
        >Done</button>
      </div>
    </div>
  );
}

/* ── Dosage measurement units ── */
const DOSAGE_UNITS = ['mg', 'mcg', 'ml', 'g', 'tablet', 'puff'];

/* ── Common medicine database for search/autocomplete ── */
const COMMON_MEDICINES = [
  { name: 'Acetaminophen (Tylenol)', dosages: ['325mg', '500mg', '650mg'] },
  { name: 'Ibuprofen (Advil)', dosages: ['200mg', '400mg', '600mg'] },
  { name: 'Aspirin', dosages: ['81mg', '325mg', '500mg'] },
  { name: 'Metformin', dosages: ['500mg', '850mg', '1000mg'] },
  { name: 'Lisinopril', dosages: ['5mg', '10mg', '20mg', '40mg'] },
  { name: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'] },
  { name: 'Atorvastatin (Lipitor)', dosages: ['10mg', '20mg', '40mg', '80mg'] },
  { name: 'Simvastatin', dosages: ['10mg', '20mg', '40mg'] },
  { name: 'Omeprazole (Prilosec)', dosages: ['10mg', '20mg', '40mg'] },
  { name: 'Losartan', dosages: ['25mg', '50mg', '100mg'] },
  { name: 'Metoprolol', dosages: ['25mg', '50mg', '100mg'] },
  { name: 'Gabapentin', dosages: ['100mg', '300mg', '400mg', '600mg'] },
  { name: 'Sertraline (Zoloft)', dosages: ['25mg', '50mg', '100mg'] },
  { name: 'Levothyroxine', dosages: ['25mcg', '50mcg', '75mcg', '100mcg'] },
  { name: 'Warfarin (Coumadin)', dosages: ['1mg', '2mg', '5mg', '10mg'] },
  { name: 'Hydrochlorothiazide', dosages: ['12.5mg', '25mg', '50mg'] },
  { name: 'Furosemide (Lasix)', dosages: ['20mg', '40mg', '80mg'] },
  { name: 'Prednisone', dosages: ['5mg', '10mg', '20mg'] },
  { name: 'Amoxicillin', dosages: ['250mg', '500mg', '875mg'] },
  { name: 'Ciprofloxacin', dosages: ['250mg', '500mg', '750mg'] },
  { name: 'Pantoprazole', dosages: ['20mg', '40mg'] },
  { name: 'Clopidogrel (Plavix)', dosages: ['75mg'] },
  { name: 'Montelukast (Singulair)', dosages: ['4mg', '5mg', '10mg'] },
  { name: 'Albuterol Inhaler', dosages: ['90mcg/puff'] },
  { name: 'Insulin Glargine (Lantus)', dosages: ['100 units/mL'] },
  { name: 'Donepezil (Aricept)', dosages: ['5mg', '10mg', '23mg'] },
  { name: 'Memantine (Namenda)', dosages: ['5mg', '10mg'] },
  { name: 'Calcium + Vitamin D', dosages: ['500mg/200IU', '600mg/400IU'] },
  { name: 'Vitamin B12', dosages: ['500mcg', '1000mcg', '2500mcg'] },
  { name: 'Fish Oil (Omega-3)', dosages: ['1000mg', '1200mg'] },
];

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL    = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLOR_OPTIONS = [
  { value: '#3B82F6', name: 'Blue' },
  { value: '#EF4444', name: 'Red' },
  { value: '#10B981', name: 'Green' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#06B6D4', name: 'Teal' },
  { value: '#F97316', name: 'Orange' },
];

const ICON_OPTIONS = [
  { icon: '💊', label: 'Tablet' },
  { icon: '💉', label: 'Injection' },
  { icon: '🩹', label: 'Patch' },
  { icon: '🧴', label: 'Liquid' },
  { icon: '🫁', label: 'Inhaler' },
  { icon: '👁️', label: 'Eye Drop' },
  { icon: '🦴', label: 'Supplement' },
  { icon: '🧠', label: 'Other' },
];

/* ═══════════════════════════════════════════════════════
   TREATMENTS TAB — HCI-informed medication management
   ═══════════════════════════════════════════════════════ */
const TreatmentsTab = ({ residentId, isCaregiver = false, onWizardStateChange = () => {} }) => {
  /* ── State ── */
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // View state
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'

  // Notify parent when wizard is open/closed so parent can hide its own back button
  useEffect(() => { onWizardStateChange(view !== 'list'); }, [view]); // eslint-disable-line
  const [editingMed, setEditingMed] = useState(null);
  const [expandedMedId, setExpandedMedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add-form wizard state (Zeigarnik: multi-step with progress)
  const [formStep, setFormStep] = useState(1); // 1=Name, 2=Dosage, 3=Schedule, 4=Review
  const TOTAL_STEPS = 4;

  // Form fields
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState('mg');
  const [medInstructions, setMedInstructions] = useState('');

  // Helpers to split dosage string into numeric part and unit
  const getDosageNum = (d) => d.replace(/[a-zA-Z%\s]+/g, '');
  const parseDosageUnit = (d) => d.match(/[a-zA-Z%]+/)?.[0] || 'mg';
  const [medColor, setMedColor] = useState('#3B82F6');
  const [medIcon, setMedIcon] = useState('💊');
  const [schedules, setSchedules] = useState([
    { timeOfDay: '08:00', daysOfWeek: [0,1,2,3,4,5,6], dosageAmount: '1' }
  ]);

  // Search / autocomplete
  const [nameResults, setNameResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const searchInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } | null

  // Optional cycle progress
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleDays, setCycleDays] = useState('');
  const [showCycleTracker, setShowCycleTracker] = useState(false);

  // Schedule state
  const [scheduleSubStep, setScheduleSubStep] = useState(1);
  const [customDaysMode, setCustomDaysMode] = useState(false);
  const [customDaysOpen, setCustomDaysOpen] = useState(false);
  const [asNeeded, setAsNeeded] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState(null);
  const [extraTimes, setExtraTimes] = useState([]); // list of reminder times (HH:MM 24h)
  const [removeConfirmIdx, setRemoveConfirmIdx] = useState(null);

  // Clock picker state
  const [clockOpen, setClockOpen] = useState(false);
  const [clockIdx, setClockIdx] = useState(null); // null = adding new, number = editing index
  const [clockHour, setClockHour] = useState(8);   // 0-23
  const [clockMinute, setClockMinute] = useState(0);
  const [clockAm, setClockAm] = useState(true);

  /* ── Fetch medications ── */
  useEffect(() => { fetchMedications(); }, []);

  const fetchMedications = async () => {
    try {
      const response = await axios.get(`${API_URL}/medications/my-medications`);
      setMedications(response.data);
    } catch (err) {
      setError('Failed to load treatments');
    } finally {
      setLoading(false);
    }
  };

  /* ── Auto-clear messages ── */
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 6000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 7000);
      return () => clearTimeout(t);
    }
  }, [error]);

  /* ── Medicine name search (debounced) ── */
  useEffect(() => {
    if (medName.trim().length < 1) {
      setNameResults([]);
      setShowSuggestions(false);
      return;
    }
    const q = medName.toLowerCase();
    const matches = COMMON_MEDICINES.filter(m =>
      m.name.toLowerCase().includes(q)
    ).slice(0, 6); // Hick's Law — max 6 suggestions
    setNameResults(matches);
    setShowSuggestions(matches.length > 0);
  }, [medName]);

  /* ── Form helpers ── */
  const resetForm = () => {
    setFormStep(1);
    setMedName(''); setMedDosage(''); setMedInstructions(''); setDosageUnit('mg');
    setMedColor('#3B82F6'); setMedIcon('💊');
    setSchedules([{ timeOfDay: '08:00', daysOfWeek: [0,1,2,3,4,5,6], dosageAmount: '1' }]);
    setSelectedMedicine(null); setEditingMed(null);
    setNameResults([]); setShowSuggestions(false);
    setCycleStartDate(''); setCycleDays(''); setShowCycleTracker(false);
    setScheduleSubStep(1); setCustomDaysMode(false); setCustomDaysOpen(false);
    setAsNeeded(false); setSelectedFrequency(null);
    setExtraTimes([]); setRemoveConfirmIdx(null);
    setClockOpen(false); setClockIdx(null);
  };

  /* ── Clock picker helpers ── */
  const openClock = (idx = null) => {
    if (idx !== null && idx < extraTimes.length) {
      // Editing existing time
      const [hh, mm] = extraTimes[idx].split(':').map(Number);
      setClockHour(hh);
      setClockMinute(mm);
      setClockAm(hh < 12);
    } else {
      // Adding new — default 8 AM
      setClockHour(8);
      setClockMinute(0);
      setClockAm(true);
    }
    setClockIdx(idx);
    setClockOpen(true);
  };

  const closeClock = () => { setClockOpen(false); setClockIdx(null); };

  const confirmClock = () => {
    // Convert internal hour (0-23) + minute to "HH:MM" string
    let h = clockHour;
    // Sync with AM/PM toggle
    if (clockAm && h === 12) h = 0;
    if (!clockAm && h !== 12) h = (h % 12) + 12;
    const timeStr = String(h).padStart(2, '0') + ':' + String(clockMinute).padStart(2, '0');
    if (clockIdx === null) {
      setExtraTimes(prev => [...prev, timeStr]);
    } else {
      setExtraTimes(prev => prev.map((v, i) => i === clockIdx ? timeStr : v));
    }
    closeClock();
  };

  const handleClockAmChange = (isAm) => {
    // When toggling AM/PM, shift the stored hour
    if (isAm && !clockAm) {
      setClockHour(h => h >= 12 ? h - 12 : h);
    } else if (!isAm && clockAm) {
      setClockHour(h => h < 12 ? h + 12 : h);
    }
    setClockAm(isAm);
  };

  /* ── Save then add another ── */
  const handleSaveAndAnother = async () => {
    setSaving(true);
    try {
      const payload = {
        name: medName.trim(),
        dosage: medDosage.trim(),
        instructions: medInstructions.trim(),
        color: medColor,
        icon: medIcon,
        schedules: schedules.map(s => ({
          timeOfDay: s.timeOfDay,
          daysOfWeek: s.daysOfWeek,
          dosageAmount: s.dosageAmount
        }))
      };
      if (isCaregiver && residentId) payload.residentId = residentId;
      await axios.post(`${API_URL}/medications`, payload);
      setSuccessMsg(`${medName} added!`);
      await fetchMedications();
      resetForm();
      setView('add');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save medication.');
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = () => { resetForm(); setView('add'); };
  const openEditForm = (med) => {
    setEditingMed(med);
    setMedName(med.name);
    setMedDosage(med.dosage);
    setDosageUnit(parseDosageUnit(med.dosage));
    setMedInstructions(med.instructions || '');
    setMedColor(med.color || '#3B82F6');
    setMedIcon(med.icon || '💊');
    setSchedules(
      med.Schedules && med.Schedules.length > 0
        ? med.Schedules.map(s => ({
            timeOfDay: s.timeOfDay?.slice(0,5) || '08:00',
            daysOfWeek: typeof s.daysOfWeek === 'string' ? JSON.parse(s.daysOfWeek) : (s.daysOfWeek || [0,1,2,3,4,5,6]),
            dosageAmount: s.dosageAmount || '1'
          }))
        : [{ timeOfDay: '08:00', daysOfWeek: [0,1,2,3,4,5,6], dosageAmount: '1' }]
    );
    setFormStep(1);
    setView('edit');
  };

  const goBack = () => {
    if (view === 'list') return;
    if (formStep === 3 && scheduleSubStep === 2) {
      setScheduleSubStep(1);
      return;
    }
    if (formStep > 1) {
      setFormStep(formStep - 1);
      return;
    }
    setView('list');
    resetForm();
  };

  /* ── Schedule row helpers ── */
  const addScheduleRow = () => {
    if (schedules.length >= 6) return; // Miller's Law — max 6 times
    setSchedules([...schedules, { timeOfDay: '12:00', daysOfWeek: [0,1,2,3,4,5,6], dosageAmount: '1' }]);
  };
  const removeScheduleRow = (idx) => {
    if (schedules.length <= 1) return;
    setSchedules(schedules.filter((_, i) => i !== idx));
  };
  const updateSchedule = (idx, field, value) => {
    setSchedules(schedules.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const toggleDay = (schedIdx, day) => {
    const current = schedules[schedIdx].daysOfWeek;
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    if (next.length === 0) return; // at least one day required
    updateSchedule(schedIdx, 'daysOfWeek', next);
  };

  // Shared days — applies to ALL schedule rows (Miller's Law: simplify per-item complexity)
  const updateAllDays = (newDays) => {
    setSchedules(prev => prev.map(s => ({ ...s, daysOfWeek: newDays })));
  };
  const toggleGlobalDay = (day) => {
    const current = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort();
    if (next.length === 0) return;
    updateAllDays(next);
  };

  /* ── Save medication ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: medName.trim(),
        dosage: medDosage.trim(),
        instructions: medInstructions.trim(),
        color: medColor,
        icon: medIcon,
        schedules: schedules.map(s => ({
          timeOfDay: s.timeOfDay,
          daysOfWeek: s.daysOfWeek,
          dosageAmount: s.dosageAmount
        }))
      };
      if (isCaregiver && residentId) payload.residentId = residentId;

      if (editingMed) {
        await axios.put(`${API_URL}/medications/${editingMed.id}`, payload);
        setSuccessMsg(`${medName} updated!`);
      } else {
        await axios.post(`${API_URL}/medications`, payload);
        setSuccessMsg(`${medName} added!`);
      }

      await fetchMedications();
      setView('list');
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save medication.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete medication ── */
  const handleDelete = (medId, medName) => {
    setDeleteConfirm({ id: medId, name: medName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setDeleteConfirm(null);
    setDeleting(id);
    try {
      await axios.delete(`${API_URL}/medications/${id}`);
      setMedications(prev => prev.filter(m => m.id !== id));
      setSuccessMsg(`${name} removed`);
    } catch (err) {
      setError('Failed to remove medication.');
    } finally {
      setDeleting(null);
    }
  };

  /* ── Validation per step ── */
  const canProceed = () => {
    switch (formStep) {
      case 1: return medName.trim().length >= 2;
      case 2: return medDosage.trim().length >= 1;
      case 3: {
        if (scheduleSubStep === 1) return asNeeded || extraTimes.length > 0;
        return (schedules[0]?.daysOfWeek?.length ?? 7) > 0;
      }
      case 4: return true;
      default: return false;
    }
  };

  /* ── Filtered meds list ── */
  const filteredMeds = medications.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.dosage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time for display
  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const fmtDays = (days) => {
    if (!days) return 'Every day';
    const d = typeof days === 'string' ? JSON.parse(days) : days;
    if (d.length === 7) return 'Every day';
    if (d.length === 5 && !d.includes(0) && !d.includes(6)) return 'Weekdays';
    if (d.length === 2 && d.includes(0) && d.includes(6)) return 'Weekends';
    return d.map(i => DAY_SHORT[i]).join(', ');
  };

  /* ═══════════ LOADING ═══════════ */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-base font-bold text-gray-400">Loading treatments…</p>
      </div>
    );
  }

  /* ═══════════ ADD / EDIT FORM (Multi-step wizard — Zeigarnik + Hick's) ═══════════ */
  if (view === 'add' || view === 'edit') {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">

        {/* ── Sub-header with back + step indicator ── */}
        <div className="flex-none bg-white border-b-2 border-gray-200 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={goBack}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label={formStep > 1 ? 'Previous step' : 'Back to list'}
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-gray-900">
                {editingMed ? 'Edit Treatment' : 'Add Treatment'}
              </h2>
              {/* Zeigarnik: step X of Y motivates completion */}
              <p className="text-sm font-semibold text-gray-500">
                Step {formStep} of {TOTAL_STEPS} —{' '}
                {formStep === 1 ? 'Medicine' : formStep === 2 ? 'Dosage'
                  : formStep === 3 && scheduleSubStep === 1 ? 'When?'
                  : formStep === 3 ? 'Which days?'
                  : 'Review'}
              </p>
            </div>
          </div>

          {/* Progress bar (Zeigarnik) */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(formStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Form body ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">

          {/* ————— STEP 1: Medicine Name ————— */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div>
                {/* Label always visible — never use placeholder as sole label */}
                <label htmlFor="med-name" className="block text-base font-bold text-gray-800 mb-1.5">
                  Medicine Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="med-name"
                    ref={searchInputRef}
                    type="text"
                    value={medName}
                    onChange={(e) => { setMedName(e.target.value); setSelectedMedicine(null); }}
                    onFocus={() => nameResults.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search or type medicine name…"
                    autoComplete="off"
                    className="
                      w-full pl-10 pr-4 py-3.5 text-lg font-medium
                      border-2 border-gray-300 rounded-xl
                      bg-white text-gray-900
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                      transition-all outline-none
                    "
                    style={{ minHeight: '52px' }}
                  />
                  {medName && (
                    <button
                      onClick={() => { setMedName(''); setSelectedMedicine(null); searchInputRef.current?.focus(); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label="Clear search"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                {/* Format hint below field — persists while typing */}
                <p className="text-sm text-gray-500 mt-1">
                  Start typing the medicine name (e.g. "Ibuprofen") to see suggestions.
                </p>

                {/* Autocomplete dropdown (Hick's: max 6) */}
                {showSuggestions && (
                  <div className="mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 relative">
                    {nameResults.map((med, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setMedName(med.name);
                          setSelectedMedicine(med);
                          setShowSuggestions(false);
                          if (med.dosages.length > 0 && !medDosage) {
                            setMedDosage(med.dosages[0]);
                            setDosageUnit(parseDosageUnit(med.dosages[0]));
                          }
                        }}
                        className="
                          w-full text-left px-4 py-3 flex items-center gap-3
                          hover:bg-blue-50 active:bg-blue-100
                          border-b border-gray-100 last:border-b-0
                          transition-colors
                        "
                        style={{ minHeight: '52px' }}
                      >
                        <Pill className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-base font-bold text-gray-900">{med.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Colour</label>
                <div className="grid grid-cols-4 gap-3">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setMedColor(c.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                        medColor === c.value
                          ? 'bg-gray-100 ring-4 ring-offset-1 ring-blue-400 scale-105'
                          : 'hover:bg-gray-50'
                      }`}
                      aria-label={c.name}
                    >
                      <div
                        className="w-12 h-12 rounded-xl shadow-md"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className={`text-xs font-bold ${
                        medColor === c.value ? 'text-blue-700' : 'text-gray-500'
                      }`}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Icon</label>
                <div className="grid grid-cols-4 gap-3">
                  {ICON_OPTIONS.map(opt => (
                    <button
                      key={opt.icon}
                      onClick={() => setMedIcon(opt.icon)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                        medIcon === opt.icon
                          ? 'bg-blue-100 ring-4 ring-offset-1 ring-blue-400 scale-105'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      aria-label={opt.label}
                    >
                      <span className="text-3xl">{opt.icon}</span>
                      <span className={`text-xs font-bold ${
                        medIcon === opt.icon ? 'text-blue-700' : 'text-gray-500'
                      }`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ————— STEP 2: Dosage ————— */}
          {formStep === 2 && (
            <div className="space-y-4">
              {/* Summary chip of what was selected */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                <span className="text-2xl">{medIcon}</span>
                <p className="text-lg font-bold text-blue-900">{medName}</p>
              </div>

              <div>
                <label htmlFor="med-dosage" className="block text-base font-bold text-gray-800 mb-1.5">
                  Dosage
                </label>
                {/* If common medicine selected, show quick-pick buttons (Hick's: reduce typing) */}
                {selectedMedicine && selectedMedicine.dosages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedMedicine.dosages.map(d => (
                      <button
                        key={d}
                        onClick={() => { setMedDosage(d); setDosageUnit(parseDosageUnit(d)); }}
                        className={`
                          px-4 py-2.5 rounded-xl text-base font-bold transition-all
                          ${medDosage === d
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                          }
                        `}
                        style={{ minHeight: '44px' }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {/* Amount + unit side-by-side */}
                <div className="flex gap-2 items-stretch">
                  <input
                    id="med-dosage"
                    type="number"
                    min="0"
                    step="any"
                    value={getDosageNum(medDosage)}
                    onChange={(e) => setMedDosage(e.target.value + dosageUnit)}
                    placeholder="Amount"
                    className="
                      flex-1 min-w-0 px-4 py-3.5 text-lg font-medium
                      border-2 border-gray-300 rounded-xl
                      bg-white text-gray-900
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                      transition-all outline-none
                    "
                    style={{ minHeight: '52px' }}
                  />
                  {/* Unit dropdown */}
                  <div className="relative">
                    <select
                      value={dosageUnit}
                      onChange={(e) => {
                        const u = e.target.value;
                        setDosageUnit(u);
                        setMedDosage(getDosageNum(medDosage) + u);
                      }}
                      className="
                        h-full px-3 pr-8 py-3.5 text-base font-bold
                        border-2 border-blue-400 rounded-xl
                        bg-blue-50 text-blue-800
                        focus:border-blue-600 focus:ring-2 focus:ring-blue-200
                        transition-all outline-none appearance-none cursor-pointer
                      "
                      style={{ minHeight: '52px', minWidth: '80px' }}
                    >
                      {DOSAGE_UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-xs">▼</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">Enter the amount, then choose unit</p>
              </div>

              <div>
                <label htmlFor="med-instructions" className="block text-base font-bold text-gray-800 mb-1.5">
                  Special Instructions <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="med-instructions"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="e.g. Take with food, avoid grapefruit"
                  rows={2}
                  className="
                    w-full px-4 py-3 text-base font-medium
                    border-2 border-gray-300 rounded-xl
                    bg-white text-gray-900
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                    transition-all outline-none resize-none
                  "
                />
              </div>
            </div>
          )}

          {/* ————— OLD Step 3 (neutralized — new sub-steps inserted below) ————— */}
          {false && (() => {
            const currentDays = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
            const sortedStr = JSON.stringify([...currentDays].sort());
            const isEveryDay = sortedStr === JSON.stringify([0,1,2,3,4,5,6]);
            const isWeekdays = sortedStr === JSON.stringify([1,2,3,4,5]);
            const isWeekends = sortedStr === JSON.stringify([0,6]);
            const showCustom = customDaysMode || (!isEveryDay && !isWeekdays && !isWeekends);
            const dayLabel = isEveryDay ? 'Every day' : isWeekdays ? 'Weekdays' : isWeekends ? 'Weekends'
              : [...currentDays].sort((a,b) => a - b).map(i => DAY_SHORT[i]).join(', ');

            const TIME_CHIPS = [
              { label: 'Morning',  range: '7 – 9 AM',     defaultTime: '08:00' },
              { label: 'Midday',   range: '11 AM – 1 PM', defaultTime: '12:00' },
              { label: 'Evening',  range: '5 – 7 PM',     defaultTime: '18:00' },
              { label: 'Bedtime',  range: '9 – 11 PM',    defaultTime: '21:00' },
            ];

            const getChipForTime = (time) => {
              const [h] = time.split(':').map(Number);
              if (h >= 5 && h < 10) return 'Morning';
              if (h >= 10 && h < 15) return 'Midday';
              if (h >= 15 && h < 20) return 'Evening';
              return 'Bedtime';
            };

            const closeTimes = (() => {
              if (schedules.length < 2) return false;
              const mins = schedules.map(s => {
                const [h, m] = s.timeOfDay.split(':').map(Number);
                return h * 60 + m;
              }).sort((a, b) => a - b);
              for (let i = 1; i < mins.length; i++) {
                if (mins[i] - mins[i-1] < 60) return true;
              }
              return false;
            })();

            const summary = (() => {
              if (asNeeded) return 'Take as needed \u2014 no fixed reminders.';
              if (schedules.length === 0 || !selectedFrequency) return '';
              const times = schedules.map(s => fmtTime(s.timeOfDay));
              const count = schedules.length;
              const timeStr = count === 1 ? times[0]
                : count === 2 ? `${times[0]} and ${times[1]}`
                : times.slice(0, -1).join(', ') + ', and ' + times[times.length - 1];
              return `We'll remind you ${count}\u00d7 a day at ${timeStr}, ${dayLabel.toLowerCase()}.`;
            })();

            const FREQ_OPTIONS = [
              { id: 'once',   label: 'Once a day',       subtitle: 'Morning \u2014 around 8:00 AM',                times: ['08:00'] },
              { id: 'twice',  label: 'Twice a day',      subtitle: 'Morning & Evening \u2014 8:00 AM and 8:00 PM', times: ['08:00', '20:00'] },
              { id: 'three',  label: '3 times a day',    subtitle: '8:00 AM, 2:00 PM, and 8:00 PM',                times: ['08:00', '14:00', '20:00'] },
              { id: 'four',   label: '4 times a day',    subtitle: 'Every 6 hours starting at 8:00 AM',            times: ['08:00', '12:00', '16:00', '20:00'] },
              { id: 'custom', label: 'I\'ll set my own times', subtitle: 'Choose exact times yourself',              times: null },
              { id: 'prn',    label: 'As needed',              subtitle: 'No fixed schedule \u2014 take when needed',    times: [] },
            ];

            const handleFrequencyPick = (opt) => {
              setSelectedFrequency(opt.id);
              if (opt.id === 'prn') {
                setAsNeeded(true);
                setSchedules([]);
                return;
              }
              setAsNeeded(false);
              if (opt.times) {
                const days = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
                setSchedules(opt.times.map(t => ({ timeOfDay: t, daysOfWeek: days, dosageAmount: '1' })));
              } else if (schedules.length === 0) {
                setSchedules([{ timeOfDay: '08:00', daysOfWeek: [0,1,2,3,4,5,6], dosageAmount: '1' }]);
              }
            };

            return (
              <div className="space-y-5">
                {/* Summary chip */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <span className="text-2xl">{medIcon}</span>
                  <div>
                    <p className="text-lg font-bold text-blue-900">{medName}</p>
                    <p className="text-sm font-semibold text-blue-700">{medDosage}</p>
                  </div>
                </div>

                {/* \u2500\u2500 Frequency \u2500\u2500 */}
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">How many times a day?</h3>
                  <p className="text-base text-gray-500 mb-4">Pick the one that matches your prescription</p>
                  <div className="space-y-2">
                    {FREQ_OPTIONS.map(opt => {
                      const isActive = selectedFrequency === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleFrequencyPick(opt)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          style={{ minHeight: '68px' }}
                        >
                          <div className="flex-1">
                            <p className={`text-lg font-extrabold ${isActive ? 'text-white' : 'text-gray-900'}`}>{opt.label}</p>
                            <p className={`text-sm font-semibold mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{opt.subtitle}</p>
                          </div>
                          {isActive && (
                            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                              <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* \u2500\u2500 Dose Rows (shown after frequency pick, unless PRN) \u2500\u2500 */}
                {selectedFrequency && !asNeeded && schedules.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xl font-extrabold text-gray-900">Your reminders</h4>
                      <button
                        onClick={() => { setSelectedFrequency(null); }}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        Change my choice
                      </button>
                    </div>

                    <div className="space-y-4">
                      {schedules.map((sched, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
                          {/* Dose header \u2014 timeline style */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-extrabold text-blue-600">{idx + 1}</span>
                              </div>
                              <div>
                                <span className="text-base font-extrabold text-gray-800">Dose {idx + 1}</span>
                                <span className="text-sm font-semibold text-gray-400 ml-1.5">{'\u2014'} {getChipForTime(sched.timeOfDay)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-extrabold text-blue-600">{fmtTime(sched.timeOfDay)}</span>
                              {schedules.length > 1 && (
                                removeConfirmIdx === idx ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => { removeScheduleRow(idx); setRemoveConfirmIdx(null); }}
                                      className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                                      style={{ minHeight: '34px' }}
                                    >
                                      Remove
                                    </button>
                                    <button
                                      onClick={() => setRemoveConfirmIdx(null)}
                                      className="px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-colors"
                                      style={{ minHeight: '34px' }}
                                    >
                                      Keep
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setRemoveConfirmIdx(idx)}
                                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    aria-label={`Remove dose ${idx + 1}`}
                                    style={{ minWidth: '44px', minHeight: '44px' }}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Time-of-day chips */}
                          <div className="p-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tap a time of day:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_CHIPS.map(chip => {
                                const isChipActive = getChipForTime(sched.timeOfDay) === chip.label;
                                return (
                                  <button
                                    key={chip.label}
                                    onClick={() => updateSchedule(idx, 'timeOfDay', chip.defaultTime)}
                                    className={`flex flex-col items-center justify-center gap-0.5 p-3 rounded-xl transition-all ${
                                      isChipActive
                                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-200'
                                    }`}
                                    style={{ minHeight: '60px' }}
                                  >
                                    <span className="text-base font-extrabold leading-tight">{chip.label}</span>
                                    <span className={`text-xs font-semibold leading-tight ${isChipActive ? 'text-blue-100' : 'text-gray-400'}`}>{chip.range}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {/* Exact time picker */}
                            <div className="mt-3 flex items-center gap-3 px-1">
                              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <label htmlFor={`exact-time-${idx}`} className="text-sm font-bold text-gray-500 flex-shrink-0">Exact time:</label>
                              <input
                                id={`exact-time-${idx}`}
                                type="time"
                                value={sched.timeOfDay}
                                onChange={(e) => updateSchedule(idx, 'timeOfDay', e.target.value)}
                                className="flex-1 text-lg font-extrabold text-gray-900 border-2 border-gray-300 rounded-xl px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-pointer"
                                style={{ minHeight: '48px' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add another dose */}
                    {schedules.length < 6 && (
                      <button
                        onClick={addScheduleRow}
                        className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-2xl border-2 border-dashed border-blue-300 text-blue-700 font-bold text-base hover:bg-blue-50 hover:border-blue-400 transition-all"
                        style={{ minHeight: '56px' }}
                      >
                        <Plus className="w-5 h-5" /> Add Another Reminder
                      </button>
                    )}

                    {/* Close-together warning */}
                    {closeTimes && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl mt-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-amber-800">
                          Two or more doses are less than 1 hour apart. Double-check the times to make sure that's correct.
                        </p>
                      </div>
                    )}

                    {/* \u2500\u2500 Which Days \u2500\u2500 */}
                    <div className="border-t-2 border-gray-100 pt-4 mt-4">
                      <h4 className="text-xl font-extrabold text-gray-900 mb-1">Which days?</h4>
                      <p className="text-base text-gray-500 mb-3">Currently: <span className="font-bold text-blue-600">{dayLabel}</span></p>
                      <div className="space-y-2 mb-3">
                        {[
                          { label: 'Every Day',  desc: 'Sunday through Saturday', days: [0,1,2,3,4,5,6] },
                          { label: 'Weekdays',   desc: 'Monday through Friday',   days: [1,2,3,4,5] },
                          { label: 'Weekends',   desc: 'Saturday & Sunday',       days: [0,6] },
                        ].map(p => {
                          const isPreset = !customDaysMode && sortedStr === JSON.stringify([...p.days].sort());
                          return (
                            <button
                              key={p.label}
                              onClick={() => { updateAllDays(p.days); setCustomDaysMode(false); }}
                              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                                isPreset
                                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              style={{ minHeight: '60px' }}
                            >
                              <div className="flex-1">
                                <p className={`text-lg font-extrabold ${isPreset ? 'text-white' : 'text-gray-900'}`}>{p.label}</p>
                                <p className={`text-sm font-semibold ${isPreset ? 'text-blue-100' : 'text-gray-500'}`}>{p.desc}</p>
                              </div>
                              {isPreset && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCustomDaysMode(true)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                            showCustom
                              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          style={{ minHeight: '60px' }}
                        >
                          <div className="flex-1">
                            <p className={`text-lg font-extrabold ${showCustom ? 'text-white' : 'text-gray-900'}`}>Pick Specific Days</p>
                            <p className={`text-sm font-semibold ${showCustom ? 'text-blue-100' : 'text-gray-500'}`}>Choose exactly which days</p>
                          </div>
                          {showCustom && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                        </button>
                      </div>
                      {showCustom && (
                        <div className="mt-3 bg-white rounded-2xl border-2 border-blue-200 p-3">
                          <p className="text-sm font-bold text-gray-500 mb-2">Tap each day to turn it on or off:</p>
                          <div className="grid grid-cols-4 gap-2">
                            {DAY_LABELS.map((lbl, dayIdx) => {
                              const active = currentDays.includes(dayIdx);
                              return (
                                <button
                                  key={dayIdx}
                                  onClick={() => toggleGlobalDay(dayIdx)}
                                  className={`rounded-xl text-base font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                    active
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                  style={{ minHeight: '52px' }}
                                  aria-label={`${active ? 'Remove' : 'Add'} ${DAY_FULL[dayIdx]}`}
                                  aria-pressed={active}
                                >
                                  {active && <Check className="w-4 h-4" strokeWidth={3} />}
                                  <span>{lbl}</span>
                                </button>
                              );
                            })}
                          </div>
                          {currentDays.length === 0 && (
                            <p className="text-sm text-red-500 mt-2 text-center font-semibold">{'\u26A0\uFE0F'} Select at least one day</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* \u2500\u2500 PRN confirmation \u2500\u2500 */}
                {asNeeded && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
                    <p className="text-lg font-extrabold text-green-800 mb-1">No fixed schedule</p>
                    <p className="text-base text-green-700">This medication will appear in your list but won't trigger timed reminders.</p>
                  </div>
                )}

                {/* \u2500\u2500 Live summary \u2500\u2500 */}
                {summary && (
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 border-2 border-gray-200">
                    <p className="text-base font-bold text-gray-700">{summary}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ————— STEP 3a: What time? ————— */}
          {formStep === 3 && scheduleSubStep === 1 && (() => {
            const timeSummary = extraTimes.length === 0 ? ''
              : extraTimes.length === 1 ? `at ${fmtTime(extraTimes[0])}`
              : extraTimes.length === 2 ? `at ${fmtTime(extraTimes[0])} and ${fmtTime(extraTimes[1])}`
              : extraTimes.slice(0, -1).map(t => fmtTime(t)).join(', ') + ', and ' + fmtTime(extraTimes[extraTimes.length - 1]);
            return (
              <div className="space-y-5">
                {/* Context chip */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <span className="text-2xl">{medIcon}</span>
                  <div>
                    <p className="text-lg font-bold text-blue-900">{medName}</p>
                    <p className="text-sm font-semibold text-blue-700">{medDosage}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">What time do you take it?</h3>
                  <p className="text-base text-gray-500 mb-4">Tap a reminder to change it, or add more</p>

                  {/* Selected times as tappable cards */}
                  <div className="space-y-3 mb-3">
                    {extraTimes.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-white border-2 border-blue-300 rounded-2xl px-4 py-3 shadow-sm"
                        style={{ minHeight: '64px' }}
                      >
                        <button
                          className="flex-1 flex items-center gap-3 text-left"
                          onClick={() => openClock(i)}
                          aria-label={`Edit time ${fmtTime(t)}`}
                        >
                          <Clock className="w-6 h-6 text-blue-500 flex-shrink-0" />
                          <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{fmtTime(t)}</span>
                        </button>
                        <button
                          onClick={() => setExtraTimes(prev => prev.filter((_, idx) => idx !== i))}
                          className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          aria-label="Remove this time"
                          style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add a time button */}
                  {!asNeeded && extraTimes.length < 6 && (
                    <button
                      onClick={() => openClock(null)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-blue-300 text-blue-600 font-bold text-lg hover:bg-blue-50 transition-all"
                      style={{ minHeight: '60px' }}
                    >
                      <Plus className="w-5 h-5" />
                      {extraTimes.length === 0 ? 'Add a time' : 'Add another time'}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm font-semibold text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* As-needed */}
                <button
                  onClick={() => { setAsNeeded(a => !a); if (!asNeeded) setExtraTimes([]); }}
                  aria-pressed={asNeeded}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                    asNeeded
                      ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300 ring-offset-2'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                  style={{ minHeight: '68px' }}
                >
                  <span className="text-2xl">🔔</span>
                  <div className="flex-1">
                    <p className={`text-lg font-extrabold ${asNeeded ? 'text-white' : 'text-gray-900'}`}>Only when I need it</p>
                    <p className={`text-sm font-semibold ${asNeeded ? 'text-green-100' : 'text-gray-500'}`}>No fixed schedule or reminders</p>
                  </div>
                  {asNeeded && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                </button>

                {/* Live summary */}
                {(extraTimes.length > 0 || asNeeded) && (
                  <div className={`rounded-2xl px-4 py-3 border-2 ${asNeeded ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-base font-bold ${asNeeded ? 'text-green-800' : 'text-blue-800'}`}>
                      {asNeeded
                        ? "No reminders — you'll take this when you need it."
                        : `You'll be reminded ${timeSummary}. Next, pick which days.`
                      }
                    </p>
                  </div>
                )}

                {/* Clock picker overlay */}
                {clockOpen && (
                  <ClockPicker
                    hour={clockHour}
                    minute={clockMinute}
                    am={clockAm}
                    onHourChange={setClockHour}
                    onMinuteChange={setClockMinute}
                    onAmChange={handleClockAmChange}
                    onDone={confirmClock}
                    onCancel={closeClock}
                  />
                )}
              </div>
            );
          })()}
          {/* ————— STEP 3b: Which days? ————— */}
          {formStep === 3 && scheduleSubStep === 2 && (() => {
            const currentDays = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
            const sortedStr = JSON.stringify([...currentDays].sort());
            const isEveryDay = sortedStr === JSON.stringify([0,1,2,3,4,5,6]);
            const isWeekdays = sortedStr === JSON.stringify([1,2,3,4,5]);
            const isWeekends = sortedStr === JSON.stringify([0,6]);
            const showCustom  = customDaysMode || (!isEveryDay && !isWeekdays && !isWeekends);
            const dayLabel = isEveryDay ? 'every day' : isWeekdays ? 'on weekdays' : isWeekends ? 'on weekends'
              : 'on ' + [...currentDays].sort((a, b) => a - b).map(i => DAY_SHORT[i]).join(', ');
            const timeSummary = asNeeded ? 'as needed'
              : extraTimes.length === 1 ? fmtTime(extraTimes[0])
              : extraTimes.length === 2 ? `${fmtTime(extraTimes[0])} and ${fmtTime(extraTimes[1])}`
              : extraTimes.map(t => fmtTime(t)).join(', ');
            return (
              <div className="space-y-4">
                {/* Summary chip showing choices so far */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <span className="text-2xl">{medIcon}</span>
                  <div>
                    <p className="text-lg font-bold text-blue-900">{medName}</p>
                    <p className="text-sm font-semibold text-blue-700">{timeSummary}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Which days?</h3>
                  <p className="text-base text-gray-500 mb-4">When should this medication repeat?</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Every Day',  desc: 'Sunday through Saturday', emoji: '📅', days: [0,1,2,3,4,5,6] },
                      { label: 'Weekdays',   desc: 'Monday through Friday',   emoji: '💼', days: [1,2,3,4,5] },
                      { label: 'Weekends',   desc: 'Saturday & Sunday',       emoji: '🏠', days: [0,6] },
                    ].map(p => {
                      const isPreset = !customDaysMode && sortedStr === JSON.stringify([...p.days].sort());
                      return (
                        <button
                          key={p.label}
                          onClick={() => { updateAllDays(p.days); setCustomDaysMode(false); }}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                            isPreset
                              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          style={{ minHeight: '64px' }}
                        >
                          <span className="text-2xl flex-shrink-0" aria-hidden="true">{p.emoji}</span>
                          <div className="flex-1">
                            <p className={`text-lg font-extrabold ${isPreset ? 'text-white' : 'text-gray-900'}`}>{p.label}</p>
                            <p className={`text-sm font-semibold ${isPreset ? 'text-blue-100' : 'text-gray-500'}`}>{p.desc}</p>
                          </div>
                          {isPreset && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setCustomDaysMode(true); setCustomDaysOpen(true); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                        showCustom
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      style={{ minHeight: '64px' }}
                    >
                      <span className="text-2xl flex-shrink-0" aria-hidden="true">✏️</span>
                      <div className="flex-1">
                        <p className={`text-lg font-extrabold ${showCustom ? 'text-white' : 'text-gray-900'}`}>Pick Specific Days</p>
                        <p className={`text-sm font-semibold ${showCustom ? 'text-blue-100' : 'text-gray-500'}`}>
                          {showCustom && currentDays.length > 0
                            ? [...currentDays].sort((a,b)=>a-b).map(i => DAY_FULL[i]).join(', ')
                            : 'Choose exactly which days'}
                        </p>
                      </div>
                      {showCustom && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                    </button>
                  </div>

                  {/* Custom days popup */}
                  {customDaysOpen && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center px-4"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                      onClick={() => setCustomDaysOpen(false)}
                    >
                      <div
                        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="bg-blue-600 px-6 py-5 text-center">
                          <p className="text-2xl font-extrabold text-white">Pick Days</p>
                          <p className="text-base font-semibold text-blue-200 mt-1">
                            {currentDays.length === 0
                              ? 'Tap a day to select it'
                              : [...currentDays].sort((a,b)=>a-b).map(i => DAY_FULL[i]).join(', ')}
                          </p>
                        </div>
                        {/* Day grid */}
                        <div className="p-5">
                          <div className="grid grid-cols-4 gap-3 mb-2">
                            {DAY_LABELS.map((lbl, dayIdx) => {
                              const active = currentDays.includes(dayIdx);
                              return (
                                <button
                                  key={dayIdx}
                                  onClick={() => toggleGlobalDay(dayIdx)}
                                  className={`rounded-2xl text-base font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    active ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-blue-50'
                                  }`}
                                  style={{ minHeight: '64px' }}
                                  aria-pressed={active}
                                >
                                  <span className="text-xs font-bold opacity-70">{DAY_FULL[dayIdx].slice(0,3)}</span>
                                  <span className="text-lg">{lbl}</span>
                                </button>
                              );
                            })}
                          </div>
                          {currentDays.length === 0 && (
                            <p className="text-sm text-red-500 text-center font-semibold mb-2">⚠️ Select at least one day</p>
                          )}
                          <button
                            onClick={() => setCustomDaysOpen(false)}
                            disabled={currentDays.length === 0}
                            className="mt-3 w-full py-4 rounded-2xl bg-blue-600 text-white text-xl font-extrabold disabled:opacity-40 hover:bg-blue-700 transition-all"
                            style={{ minHeight: '60px' }}
                          >Done</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Live summary */}
                {!asNeeded && (
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 border-2 border-gray-200">
                    <p className="text-base font-bold text-gray-700">
                      We'll remind you at {timeSummary}, {dayLabel}.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* (Dead code — safe to remove) */}
          {false && (() => {
            const currentDays = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
            const sortedStr = JSON.stringify([...currentDays].sort());
            const isEveryDay = sortedStr === JSON.stringify([0,1,2,3,4,5,6]);
            const isWeekdays = sortedStr === JSON.stringify([1,2,3,4,5]);
            const isWeekends = sortedStr === JSON.stringify([0,6]);
            const showCustom = customDaysMode || (!isEveryDay && !isWeekdays && !isWeekends);

            const dayLabel = isEveryDay ? 'Every day' : isWeekdays ? 'Weekdays' : isWeekends ? 'Weekends'
              : [...currentDays].sort((a,b) => a - b).map(i => DAY_SHORT[i]).join(', ');

            /* Common time presets for quick-pick (Hick's Law — fewer decisions) */
            const TIME_PRESETS = [
              { time: '06:00', label: '6:00 AM',  emoji: '🌅', period: 'Early Morning' },
              { time: '07:00', label: '7:00 AM',  emoji: '☀️', period: 'Morning' },
              { time: '08:00', label: '8:00 AM',  emoji: '☀️', period: 'Morning' },
              { time: '09:00', label: '9:00 AM',  emoji: '☀️', period: 'Morning' },
              { time: '10:00', label: '10:00 AM', emoji: '🌤️', period: 'Late Morning' },
              { time: '12:00', label: '12:00 PM', emoji: '🌞', period: 'Noon' },
              { time: '14:00', label: '2:00 PM',  emoji: '🌤️', period: 'Afternoon' },
              { time: '16:00', label: '4:00 PM',  emoji: '🌤️', period: 'Afternoon' },
              { time: '18:00', label: '6:00 PM',  emoji: '🌆', period: 'Evening' },
              { time: '20:00', label: '8:00 PM',  emoji: '🌙', period: 'Night' },
              { time: '21:00', label: '9:00 PM',  emoji: '🌙', period: 'Night' },
              { time: '22:00', label: '10:00 PM', emoji: '😴', period: 'Bedtime' },
            ];

            return (
              <div className="space-y-5">
                {/* Summary */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <span className="text-2xl">{medIcon}</span>
                  <div>
                    <p className="text-lg font-bold text-blue-900">{medName}</p>
                    <p className="text-sm font-semibold text-blue-700">{schedules.length} time{schedules.length !== 1 ? 's' : ''} per day</p>
                  </div>
                </div>

                {/* ── Dose Times ── */}
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">When should each dose be taken?</h3>
                  <p className="text-base text-gray-500 mb-4">Pick a time for each dose, or type your own</p>

                  <div className="space-y-4">
                    {schedules.map((sched, idx) => {
                      const doseEmoji = idx === 0 ? '☀️' : idx === schedules.length - 1 ? '🌙' : '🌤️';
                      return (
                        <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
                          {/* Dose header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-xl" aria-hidden="true">{doseEmoji}</span>
                              <span className="text-base font-extrabold text-gray-800">Dose {idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Current time shown large */}
                              <span className="text-lg font-extrabold text-blue-600">{fmtTime(sched.timeOfDay)}</span>
                              {schedules.length > 1 && (
                                <button
                                  onClick={() => removeScheduleRow(idx)}
                                  className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  aria-label={`Remove dose ${idx + 1}`}
                                  style={{ minWidth: '44px', minHeight: '44px' }}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick-pick time grid — big tap targets (Fitts' Law) */}
                          <div className="p-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tap to choose a time:</p>
                            <div className="grid grid-cols-3 gap-2">
                              {TIME_PRESETS.map(tp => {
                                const isSelected = sched.timeOfDay === tp.time;
                                return (
                                  <button
                                    key={tp.time}
                                    onClick={() => updateSchedule(idx, 'timeOfDay', tp.time)}
                                    className={`flex flex-col items-center justify-center gap-0.5 p-2.5 rounded-xl transition-all ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:border-blue-200 border border-gray-200'
                                    }`}
                                    style={{ minHeight: '56px' }}
                                    aria-label={`${tp.label} — ${tp.period}`}
                                  >
                                    <span className="text-base font-extrabold leading-tight">{tp.label}</span>
                                    <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{tp.period}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom time fallback — always visible below the grid */}
                            <div className="mt-3 flex items-center gap-3 px-1">
                              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <label htmlFor={`custom-time-${idx}`} className="text-sm font-bold text-gray-500 flex-shrink-0">Or pick exact time:</label>
                              <input
                                id={`custom-time-${idx}`}
                                type="time"
                                value={sched.timeOfDay}
                                onChange={(e) => updateSchedule(idx, 'timeOfDay', e.target.value)}
                                className="flex-1 text-lg font-extrabold text-gray-900 border-2 border-gray-300 rounded-xl px-3 py-2 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-pointer"
                                style={{ minHeight: '48px' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {schedules.length < 6 && (
                    <button
                      onClick={addScheduleRow}
                      className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 rounded-2xl border-2 border-dashed border-blue-300 text-blue-700 font-bold text-base hover:bg-blue-50 hover:border-blue-400 transition-all"
                      style={{ minHeight: '56px' }}
                    >
                      <Plus className="w-5 h-5" /> Add Another Dose Time
                    </button>
                  )}
                </div>

                {/* ── Which Days ── */}
                <div className="border-t-2 border-gray-100 pt-4">
                  <h4 className="text-xl font-extrabold text-gray-900 mb-1">Which days?</h4>
                  <p className="text-base text-gray-500 mb-3">Currently: <span className="font-bold text-blue-600">{dayLabel}</span></p>

                  {/* Preset day patterns — large buttons (Fitts' Law + Hick's Law) */}
                  <div className="space-y-2 mb-3">
                    {[
                      { label: 'Every Day',  desc: 'Sunday through Saturday', emoji: '📅', days: [0,1,2,3,4,5,6] },
                      { label: 'Weekdays',   desc: 'Monday through Friday',   emoji: '💼', days: [1,2,3,4,5] },
                      { label: 'Weekends',   desc: 'Saturday & Sunday',       emoji: '🏠', days: [0,6] },
                    ].map(p => {
                      const isPreset = !customDaysMode && sortedStr === JSON.stringify([...p.days].sort());
                      return (
                        <button
                          key={p.label}
                          onClick={() => { updateAllDays(p.days); setCustomDaysMode(false); }}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                            isPreset
                              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          style={{ minHeight: '64px' }}
                        >
                          <span className="text-2xl flex-shrink-0" aria-hidden="true">{p.emoji}</span>
                          <div className="flex-1">
                            <p className={`text-lg font-extrabold ${isPreset ? 'text-white' : 'text-gray-900'}`}>{p.label}</p>
                            <p className={`text-sm font-semibold ${isPreset ? 'text-blue-100' : 'text-gray-500'}`}>{p.desc}</p>
                          </div>
                          {isPreset && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCustomDaysMode(true)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
                        showCustom
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 ring-offset-1'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      style={{ minHeight: '64px' }}
                    >
                      <span className="text-2xl flex-shrink-0" aria-hidden="true">✏️</span>
                      <div className="flex-1">
                        <p className={`text-lg font-extrabold ${showCustom ? 'text-white' : 'text-gray-900'}`}>Pick Specific Days</p>
                        <p className={`text-sm font-semibold ${showCustom ? 'text-blue-100' : 'text-gray-500'}`}>Choose exactly which days</p>
                      </div>
                      {showCustom && <Check className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />}
                    </button>
                  </div>

                  {/* Individual day toggles — clear 3-letter labels (Gestalt: Proximity + Similarity) */}
                  {showCustom && (
                    <div className="mt-3 bg-white rounded-2xl border-2 border-blue-200 p-3">
                      <p className="text-sm font-bold text-gray-500 mb-2">Tap each day to turn it on or off:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {DAY_LABELS.map((lbl, dayIdx) => {
                          const active = currentDays.includes(dayIdx);
                          return (
                            <button
                              key={dayIdx}
                              onClick={() => toggleGlobalDay(dayIdx)}
                              className={`rounded-xl text-base font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                active
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              style={{ minHeight: '52px' }}
                              aria-label={`${active ? 'Remove' : 'Add'} ${DAY_FULL[dayIdx]}`}
                              aria-pressed={active}
                            >
                              {active && <Check className="w-4 h-4" strokeWidth={3} />}
                              <span>{lbl}</span>
                            </button>
                          );
                        })}
                      </div>
                      {currentDays.length === 0 && (
                        <p className="text-sm text-red-500 mt-2 text-center font-semibold">⚠️ Select at least one day</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ————— STEP 4: Review ————— */}
          {formStep === 4 && (
            <div className="space-y-4">
              <p className="text-base font-bold text-gray-700 text-center">Please review your medication before saving.</p>
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-3">
                {/* Med summary */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: medColor + '30', border: `3px solid ${medColor}60` }}
                  >
                    {medIcon}
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-gray-900">{medName}</p>
                    <p className="text-base font-semibold text-gray-600">{medDosage}</p>
                  </div>
                </div>

                {medInstructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                    <p className="text-sm font-semibold text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      {medInstructions}
                    </p>
                  </div>
                )}

                {/* Schedule summary */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Schedule</p>
                  {asNeeded ? (
                    <div className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2.5">
                      <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-base font-bold text-green-800">As needed — no fixed times</p>
                    </div>
                  ) : schedules.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-base font-bold text-gray-900">{fmtTime(s.timeOfDay)}</p>
                        <p className="text-sm text-gray-600">{fmtDays(s.daysOfWeek)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Treatment Progress — collapsible editor (moved from Step 3 to reduce cognitive load) */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setShowCycleTracker(!showCycleTracker)}
                    className="w-full flex items-center justify-between py-2 text-left"
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-bold text-gray-700">Treatment Progress</span>
                      <span className="text-xs font-medium text-gray-400">(optional)</span>
                    </div>
                    {showCycleTracker
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  {showCycleTracker && (
                    <div className="mt-2 space-y-3 bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <p className="text-sm text-amber-700">Track progress for fixed-length courses (e.g. antibiotics for 7 days).</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Started on</label>
                          <input
                            type="date"
                            value={cycleStartDate}
                            onChange={e => setCycleStartDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2.5 text-sm font-medium border-2 border-amber-300 rounded-xl bg-white text-gray-900 focus:border-amber-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Course (days)</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={cycleDays}
                            onChange={e => setCycleDays(e.target.value)}
                            placeholder="e.g. 30"
                            className="w-full px-3 py-2.5 text-sm font-medium border-2 border-amber-300 rounded-xl bg-white text-gray-900 focus:border-amber-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      {cycleStartDate && cycleDays && (() => {
                        const start = new Date(cycleStartDate);
                        const today = new Date();
                        const daysDone = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
                        const total = parseInt(cycleDays);
                        const pct = Math.min(100, Math.round((daysDone / total) * 100));
                        const remaining = Math.max(0, total - daysDone);
                        return (
                          <div>
                            <div className="flex justify-between text-sm font-bold text-amber-800 mb-1">
                              <span>Day {Math.min(daysDone + 1, total)} of {total}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-amber-200 rounded-full h-3">
                              <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs font-semibold text-amber-700 mt-1">
                              {remaining === 0 ? '✅ Course complete!' : `${remaining} day${remaining !== 1 ? 's' : ''} remaining`}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky bottom actions ── */}
        <div className="flex-none bg-white border-t-2 border-gray-200 px-4 py-3">
          {formStep < TOTAL_STEPS ? (
            /* Steps 1–3: single Continue button with arrow */
            <button
              onClick={() => {
                if (formStep === 3 && scheduleSubStep === 1) {
                  if (!asNeeded) {
                    const days = schedules[0]?.daysOfWeek || [0,1,2,3,4,5,6];
                    setSchedules([...extraTimes].sort().map(t => ({ timeOfDay: t, daysOfWeek: days, dosageAmount: '1' })));
                  }
                  setScheduleSubStep(2);
                } else {
                  setFormStep(formStep + 1);
                }
              }}
              disabled={!canProceed()}
              className="
                w-full flex items-center justify-center gap-2
                bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
                text-white text-lg font-extrabold
                rounded-2xl shadow-lg transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{ minHeight: '60px' }}
            >
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            /* Step 4 (Review): Finish + Add Another */
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="
                  w-full flex items-center justify-center gap-2
                  bg-green-600 hover:bg-green-700 active:scale-[0.98]
                  text-white text-lg font-extrabold
                  rounded-2xl shadow-lg transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
                style={{ minHeight: '60px' }}
              >
                {saving ? 'Saving…' : <><Check className="w-5 h-5" /> {editingMed ? 'Save Changes' : 'Finish!'}</> }
              </button>
              {!editingMed && (
                <button
                  onClick={handleSaveAndAnother}
                  disabled={saving}
                  className="
                    w-full flex items-center justify-center gap-2
                    bg-blue-50 hover:bg-blue-100 active:scale-[0.98]
                    text-blue-700 text-base font-extrabold border-2 border-blue-300
                    rounded-2xl transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                  style={{ minHeight: '52px' }}
                >
                  <Plus className="w-5 h-5" /> Add Another Treatment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════ LIST VIEW ═══════════ */
  return (
    <div className="flex-1 flex flex-col bg-gray-50">

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5"
            onClick={e => e.stopPropagation()}>
            <p className="text-lg font-extrabold text-gray-900 mb-1">Remove Treatment?</p>
            <p className="text-sm text-gray-500 mb-4">
              Remove <span className="font-bold text-gray-800">{deleteConfirm.name}</span>? This will stop all future doses.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-base rounded-xl py-3 active:scale-95 transition-all border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white font-bold text-base rounded-xl py-3 active:scale-95 transition-all"
              >
                Remove "{deleteConfirm.name}"
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="flex-none mx-4 mt-2 p-3 bg-green-50 border-2 border-green-300 rounded-xl">
          <p className="text-base font-bold text-green-700 text-center flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> {successMsg}
          </p>
        </div>
      )}
      {error && (
        <div className="flex-none mx-4 mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-xl">
          <p className="text-base font-bold text-red-700 text-center">{error}</p>
        </div>
      )}

      {/* Search bar (no Add button here anymore) */}
      <div className="flex-none px-4 pt-3 pb-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search treatments…"
            className="
              w-full pl-10 pr-4 py-3 text-base font-medium
              border-2 border-gray-200 rounded-xl bg-white
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200
              outline-none transition-all
            "
            style={{ minHeight: '48px' }}
            aria-label="Search treatments"
          />
        </div>
      </div>

      {/* Medication count */}
      <div className="flex-none px-4 pb-1">
        <p className="text-sm font-bold text-gray-500">
          {filteredMeds.length} treatment{filteredMeds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Scrollable list (Gestalt proximity: cards grouped) ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2">
        {filteredMeds.length === 0 ? (
          <div className="mt-12 text-center px-4">
            <Pill className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-gray-500">
              {searchQuery ? 'No treatments match your search' : 'No treatments yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Tap the + button to add your first medicine'}
            </p>
          </div>
        ) : (
          filteredMeds.map((med) => {
            const isExpanded = expandedMedId === med.id;
            const scheds = med.Schedules || [];
            return (
              <div
                key={med.id}
                className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden transition-all"
              >
                {/* Card header — tap to expand (progressive disclosure) */}
                <button
                  onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                  className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: '64px' }}
                  aria-expanded={isExpanded}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: (med.color || '#3B82F6') + '25' }}
                  >
                    {med.icon || '💊'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">{med.name}</p>
                    <p className="text-sm font-medium text-gray-500">{med.dosage}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">
                      {scheds.length} time{scheds.length !== 1 ? 's' : ''}/day
                    </span>
                    {isExpanded
                      ? <span className="flex items-center gap-1 bg-gray-200 text-gray-700 text-sm font-bold px-3 py-1 rounded-full"><ChevronUp className="w-4 h-4" /> Close</span>
                      : <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t-2 border-gray-100 px-3 pb-3 pt-2 space-y-2">
                    {med.instructions && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                        <p className="text-sm font-semibold text-yellow-800">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {med.instructions}
                        </p>
                      </div>
                    )}

                    {/* Schedule list */}
                    {scheds.map((s, i) => (
                      <div key={s.id || i} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-base font-bold text-gray-900">
                            {fmtTime(s.timeOfDay)}
                          </p>
                          <p className="text-sm text-gray-600">{fmtDays(s.daysOfWeek)}</p>
                        </div>
                      </div>
                    ))}

                    {scheds.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No schedule set</p>
                    )}

                    {/* Actions — Gestalt similarity, Von Restorff: edit is neutral, delete is red */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEditForm(med)}
                        className="
                          flex-1 flex items-center justify-center gap-2
                          bg-gray-100 hover:bg-gray-200 text-gray-700
                          font-bold text-base rounded-xl transition-all
                        "
                        style={{ minHeight: '48px' }}
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(med.id, med.name)}
                        disabled={deleting === med.id}
                        className="
                          flex items-center justify-center gap-2
                          bg-red-50 hover:bg-red-100 text-red-600
                          font-bold text-base rounded-xl px-5 transition-all
                          disabled:opacity-50
                        "
                        style={{ minHeight: '48px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting === med.id ? '…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Large Add FAB above bottom nav ── */}
      <div className="flex-none px-4 py-3 border-t-2 border-gray-100 bg-white">
        <button
          onClick={openAddForm}
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xl rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
          style={{ minHeight: '64px' }}
          aria-label="Add new treatment"
        >
          <Plus className="w-7 h-7" strokeWidth={3} />
          Add Medication
        </button>
      </div>
    </div>
  );
};

export default TreatmentsTab;
