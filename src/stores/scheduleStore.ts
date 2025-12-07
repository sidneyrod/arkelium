import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduledJob {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  duration: string;
  employeeId: string;
  employeeName: string;
  status: JobStatus;
  services: string[];
  notes?: string;
  completedAt?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  checklist?: { item: string; completed: boolean }[];
}

export interface CleanerAvailability {
  id: string;
  employeeId: string;
  employeeName: string;
  availableDays: DayOfWeek[];
  startTime: string;
  endTime: string;
  exceptions: { date: string; reason: string }[];
  monthlyAvailability?: { date: string; available: boolean }[];
}

export interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface ScheduleState {
  jobs: ScheduledJob[];
  availabilities: CleanerAvailability[];
  absenceRequests: AbsenceRequest[];
  addJob: (job: Omit<ScheduledJob, 'id'>) => void;
  updateJob: (id: string, job: Partial<ScheduledJob>) => void;
  deleteJob: (id: string) => void;
  completeJob: (id: string, afterPhoto?: string) => void;
  setAvailability: (availability: Omit<CleanerAvailability, 'id'>) => void;
  updateAvailability: (id: string, availability: Partial<CleanerAvailability>) => void;
  addAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'status' | 'createdAt'>) => void;
  updateAbsenceRequest: (id: string, status: 'approved' | 'rejected', approvedBy?: string) => void;
  isEmployeeAvailable: (employeeId: string, date: string) => boolean;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      jobs: [],
      availabilities: [],
      absenceRequests: [],
      
      addJob: (job) => set((state) => ({
        jobs: [...state.jobs, { ...job, id: crypto.randomUUID() }]
      })),
      
      updateJob: (id, updates) => set((state) => ({
        jobs: state.jobs.map((job) => job.id === id ? { ...job, ...updates } : job)
      })),
      
      deleteJob: (id) => set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id)
      })),
      
      completeJob: (id, afterPhoto) => set((state) => ({
        jobs: state.jobs.map((job) => 
          job.id === id 
            ? { ...job, status: 'completed', completedAt: new Date().toISOString(), afterPhoto } 
            : job
        )
      })),
      
      setAvailability: (availability) => set((state) => {
        const existing = state.availabilities.find(a => a.employeeId === availability.employeeId);
        if (existing) {
          return {
            availabilities: state.availabilities.map(a => 
              a.employeeId === availability.employeeId ? { ...a, ...availability } : a
            )
          };
        }
        return {
          availabilities: [...state.availabilities, { ...availability, id: crypto.randomUUID() }]
        };
      }),
      
      updateAvailability: (id, updates) => set((state) => ({
        availabilities: state.availabilities.map((a) => a.id === id ? { ...a, ...updates } : a)
      })),
      
      addAbsenceRequest: (request) => set((state) => ({
        absenceRequests: [...state.absenceRequests, { 
          ...request, 
          id: crypto.randomUUID(), 
          status: 'pending', 
          createdAt: new Date().toISOString() 
        }]
      })),
      
      updateAbsenceRequest: (id, status, approvedBy) => set((state) => ({
        absenceRequests: state.absenceRequests.map((r) => 
          r.id === id 
            ? { ...r, status, approvedAt: new Date().toISOString(), approvedBy } 
            : r
        )
      })),

      isEmployeeAvailable: (employeeId: string, date: string) => {
        const state = get();
        
        // Check if there's an approved absence request for this date
        const hasApprovedAbsence = state.absenceRequests.some(req => {
          if (req.employeeId !== employeeId || req.status !== 'approved') return false;
          const start = new Date(req.startDate);
          const end = new Date(req.endDate);
          const checkDate = new Date(date);
          return checkDate >= start && checkDate <= end;
        });
        
        if (hasApprovedAbsence) return false;

        // Check weekly availability
        const availability = state.availabilities.find(a => a.employeeId === employeeId);
        if (!availability) return true; // If no availability set, assume available

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
        if (!availability.availableDays.includes(dayOfWeek)) return false;

        // Check monthly exceptions
        const exception = availability.exceptions?.find(e => e.date === date);
        if (exception) return false;

        // Check monthly availability overrides
        const monthlyEntry = availability.monthlyAvailability?.find(m => m.date === date);
        if (monthlyEntry) return monthlyEntry.available;

        return true;
      },
    }),
    { name: 'schedule-store' }
  )
);
