/**
 * Asynchronous Task Queue Architecture for Çiçekana ERP
 * Offloads long-running heavy processes (PDF conversion, FFmpeg video processing,
 * batch WhatsApp broadcasts, Night Scans) to background execution queues.
 */

import { EventEmitter } from "events"

export type JobStatus = "queued" | "processing" | "completed" | "failed"

export interface QueueJob<TData = any, TResult = any> {
  id: string
  name: string
  data: TData
  status: JobStatus
  progress: number // 0 - 100
  result?: TResult
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

type JobHandler<TData = any, TResult = any> = (
  job: QueueJob<TData>,
  updateProgress: (progress: number) => void
) => Promise<TResult>

class AsyncJobQueue extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map()
  private handlers: Map<string, JobHandler> = new Map()
  private queue: string[] = []
  private isProcessing: boolean = false
  private concurrency: number = 2

  /**
   * Register a job handler for a specific job name.
   */
  registerHandler<TData = any, TResult = any>(
    name: string,
    handler: JobHandler<TData, TResult>
  ) {
    this.handlers.set(name, handler)
  }

  /**
   * Add a new job to the background queue.
   */
  addJob<TData = any>(name: string, data: TData): QueueJob<TData> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const job: QueueJob<TData> = {
      id,
      name,
      data,
      status: "queued",
      progress: 0,
      createdAt: new Date()
    }

    this.jobs.set(id, job)
    this.queue.push(id)
    this.emit("job_queued", job)
    this.processNext()

    return job
  }

  /**
   * Get current job details & status.
   */
  getJob(id: string): QueueJob | undefined {
    return this.jobs.get(id)
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0) {
      const jobId = this.queue.shift()
      if (!jobId) continue

      const job = this.jobs.get(jobId)
      if (!job) continue

      const handler = this.handlers.get(job.name)
      if (!handler) {
        job.status = "failed"
        job.error = `No registered handler for job type '${job.name}'`
        this.emit("job_failed", job)
        continue
      }

      job.status = "processing"
      job.startedAt = new Date()
      this.emit("job_started", job)

      const updateProgress = (progress: number) => {
        job.progress = Math.min(100, Math.max(0, progress))
        this.emit("job_progress", job)
      }

      try {
        const result = await handler(job, updateProgress)
        job.status = "completed"
        job.progress = 100
        job.result = result
        job.completedAt = new Date()
        this.emit("job_completed", job)
      } catch (err: any) {
        job.status = "failed"
        job.error = err?.message || String(err)
        job.completedAt = new Date()
        this.emit("job_failed", job)
      }
    }

    this.isProcessing = false
  }
}

export const asyncJobQueue = new AsyncJobQueue()
