import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';

export type CafSyncLogLevel = 'info' | 'warn' | 'error' | 'success';

export interface CafSyncLogEntry {
  ts: string;
  level: CafSyncLogLevel;
  message: string;
}

export interface CafSyncInactiveCoop {
  cnpj: string;
  razaoSocial: string;
  situacao: string;
}

export interface CafSyncResult {
  idsTotal: number;
  idsFound: number;
  idsMissing: number;
  idsMissingList: string[];
  jsonPath?: string;
  uuidIguais?: number;
  uuidAtualizados?: number;
  uuidInseridos?: number;
  semUuidApi?: number;
  extratosOk: number;
  extratosFailed: number;
  extratosFailedList: string[];
  mysqlInserted: number;
  mysqlUpdated: number;
  mysqlFailures: number;
  inactive: CafSyncInactiveCoop[];
  duplicadosCaf: number;
}

export type CafSyncStatus = 'queued' | 'captcha' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface CafSyncJob {
  id: string;
  status: CafSyncStatus;
  phase: string;
  progress?: { current: number; total: number; message?: string };
  logs: CafSyncLogEntry[];
  result?: CafSyncResult;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

@Injectable()
export class CafSyncService {
  private readonly logger = new Logger(CafSyncService.name);
  private readonly jobs = new Map<string, CafSyncJob>();
  private activeJobId: string | null = null;
  private activeProcess: ChildProcessWithoutNullStreams | null = null;

  getJob(jobId: string): CafSyncJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job CAF não encontrado.');
    return job;
  }

  getActiveJob(): CafSyncJob | null {
    if (!this.activeJobId) return null;
    return this.jobs.get(this.activeJobId) ?? null;
  }

  getVncInfo() {
    const display = process.env.CAF_DISPLAY || process.env.DISPLAY || ':1';
    const port = process.env.CAF_VNC_PORT || '5901';
    const host =
      process.env.CAF_VNC_PUBLIC_HOST ||
      process.env.CAF_VNC_HOST ||
      process.env.VPS_PUBLIC_IP ||
      null;
    const mode = process.env.CAF_BROWSER_MODE || (process.platform === 'linux' ? 'vnc' : 'local');
    return {
      mode,
      host,
      port,
      display,
      tunnel: host ? `ssh -L ${port}:127.0.0.1:${port} root@${host}` : null,
      clientUrl: host ? `${host}:${port}` : `localhost:${port}`,
    };
  }

  private buildCafProcessEnv(dataDir: string): NodeJS.ProcessEnv {
    const display = process.env.CAF_DISPLAY || process.env.DISPLAY || ':1';
    const browserMode =
      process.env.CAF_BROWSER_MODE || (process.platform === 'linux' ? 'vnc' : 'local');

    return {
      ...process.env,
      CAF_DATA_DIR: dataDir,
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
      CAF_BROWSER_MODE: browserMode,
      DISPLAY: display,
      CAF_DISPLAY: display,
      ...(process.env.CAF_VNC_HOST ? { CAF_VNC_HOST: process.env.CAF_VNC_HOST } : {}),
      ...(process.env.CAF_VNC_PUBLIC_HOST
        ? { CAF_VNC_PUBLIC_HOST: process.env.CAF_VNC_PUBLIC_HOST }
        : {}),
      ...(process.env.CAF_VNC_PORT ? { CAF_VNC_PORT: process.env.CAF_VNC_PORT } : {}),
    };
  }

  startSync(): CafSyncJob {
    if (this.activeJobId && this.activeProcess) {
      const current = this.jobs.get(this.activeJobId);
      if (current && (current.status === 'queued' || current.status === 'captcha' || current.status === 'running')) {
        throw new ConflictException('Já existe uma sincronização CAF em andamento.');
      }
    }

    const scriptPath = join(process.cwd(), 'scripts', 'caf', 'caf_sync.py');
    if (!existsSync(scriptPath)) {
      throw new NotFoundException(`Script CAF não encontrado: ${scriptPath}`);
    }

    const jobId = randomUUID();
    const job: CafSyncJob = {
      id: jobId,
      status: 'queued',
      phase: 'init',
      logs: [],
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    this.activeJobId = jobId;

    const pythonBin = process.env.CAF_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const dataDir = join(process.cwd(), 'scripts', 'caf', 'data');
    const cwd = join(process.cwd(), 'scripts', 'caf');

    this.pushLog(job, 'info', 'Iniciando processo Python…');

    const child = spawn(pythonBin, [scriptPath], {
      cwd,
      env: this.buildCafProcessEnv(dataDir),
    });
    this.activeProcess = child;

    child.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString('utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        this.handleStdoutLine(job, trimmed);
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) this.pushLog(job, 'warn', msg);
    });

    child.on('close', (code) => {
      this.activeProcess = null;
      if (job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled') {
        job.status = 'failed';
        job.error = job.error || `Processo encerrado com código ${code ?? '?'}`;
        job.finishedAt = new Date().toISOString();
        this.pushLog(job, 'error', job.error);
      }
      if (this.activeJobId === jobId) this.activeJobId = null;
    });

    child.on('error', (err) => {
      job.status = 'failed';
      job.error = err.message;
      job.finishedAt = new Date().toISOString();
      this.pushLog(job, 'error', `Falha ao iniciar Python: ${err.message}`);
      this.activeProcess = null;
      if (this.activeJobId === jobId) this.activeJobId = null;
    });

    job.status = 'running';
    return job;
  }

  cancelSync(jobId: string): CafSyncJob {
    if (this.activeJobId !== jobId || !this.activeProcess) {
      throw new NotFoundException('Nenhum processo ativo para este job.');
    }
    this.activeProcess.kill('SIGTERM');
    const job = this.getJob(jobId);
    job.status = 'cancelled';
    job.error = 'Cancelado pelo usuário.';
    job.finishedAt = new Date().toISOString();
    this.pushLog(job, 'warn', 'Sincronização interrompida pelo usuário.');
    this.activeProcess = null;
    this.activeJobId = null;
    return job;
  }

  private handleStdoutLine(job: CafSyncJob, line: string) {
    try {
      const payload = JSON.parse(line) as Record<string, unknown>;
      const event = String(payload.event ?? '');

      if (event === 'log') {
        this.pushLog(job, (payload.level as CafSyncLogLevel) || 'info', String(payload.message ?? ''));
        return;
      }

      if (event === 'phase') {
        const phase = String(payload.phase ?? '');
        job.phase = phase;
        job.progress = undefined;
        if (phase === 'captcha') job.status = 'captcha';
        else if (job.status !== 'failed') job.status = 'running';
        const msg = String(payload.message ?? '');
        if (msg) this.pushLog(job, phase === 'captcha' ? 'warn' : 'info', msg);
        return;
      }

      if (event === 'progress') {
        job.progress = {
          current: Number(payload.current ?? 0),
          total: Number(payload.total ?? 0),
          message: payload.message ? String(payload.message) : undefined,
        };
        if (job.status !== 'captcha') job.status = 'running';
        return;
      }

      if (event === 'done') {
        job.status = 'completed';
        job.progress = { current: 100, total: 100 };
        job.result = payload.result as CafSyncResult;
        job.finishedAt = new Date().toISOString();
        this.pushLog(job, 'success', 'CAFs atualizadas com sucesso!');
        return;
      }

      if (event === 'error') {
        job.status = 'failed';
        job.error = String(payload.message ?? 'Erro desconhecido');
        job.finishedAt = new Date().toISOString();
        this.pushLog(job, 'error', job.error);
      }
    } catch {
      this.logger.debug(`stdout (não-JSON): ${line}`);
    }
  }

  private pushLog(job: CafSyncJob, level: CafSyncLogLevel, message: string) {
    if (!message) return;
    job.logs.push({ ts: new Date().toISOString(), level, message });
    if (job.logs.length > 500) job.logs.shift();
  }
}
