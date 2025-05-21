export interface PublicationRow {
  submission_id: number
  doi: string | null
  title: string | null
  conference: number | null
  author_userids: number[]
  review_score: number | null
  date_published: Date | null
}

export interface BaseJobInput {
  updateScheduleMode?: 'immediate' | 'period'
  delaySeconds?: number
  snapshotFrequency?: 'weekly' | 'monthly' | 'quarterly'
}

// Extended types for specific jobs
export interface InitJobInput extends BaseJobInput {
  useMock?: boolean
  mockCount?: number
  validationMode?: boolean
}

export interface UpdateJobInput extends BaseJobInput {
  lastRun?: Date
}

export interface OCitRecord {
  oci: string
  citing: string
  cited: string
  creation: string
  author_sc: 'yes' | 'no'
}
