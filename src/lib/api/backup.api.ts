import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminBackup/org/global/action'

export const backupApi = {
  getJobs: (payload: { FullTextSearch?: string; Status?: string; FromDate?: string; ToDate?: string; Page?: number; Limit?: number } = {}) =>
    client.post(`${BASE}/GetBackupJobs`, payload),

  getJobCount: (payload: { FullTextSearch?: string; Status?: string; FromDate?: string; ToDate?: string } = {}) =>
    client.post(`${BASE}/GetBackupJobCount`, payload),

  getPolicy: () =>
    client.get(`${BASE}/GetBackupPolicy`),

  triggerNow: () =>
    client.post(`${BASE}/TriggerBackupNow`, {}),

  getJobById: (id: string) =>
    client.get(`${BASE}/GetBackupJobById/${id}`),

  setPolicy: (payload: {
    BackupPolicy: {
      StorageUrl: string
      StorageKey: string
      StorageSecret: string
      Bucket: string
      Path: string
      FilePrefix: string
      ScheduleInterval: string
      ScheduleStartHour: number
      IsEnabled: boolean
    }
  }) => client.post(`${BASE}/SetBackupPolicy`, payload),
}
