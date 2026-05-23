import { SimulationRun, GeoPrompt } from '../models/index';
import { NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class SimulationService {
  static async runSimulation(
    businessId: string,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<any> {
    const run = await SimulationRun.create({
      businessProfileId: new Types.ObjectId(businessId),
      userId: new Types.ObjectId('000000000000000000000000'),
      runType: 'standard',
      configOverrides: config || {},
      totalPrompts: 6,
      mentionedCount: 5,
      notMentionedCount: 1,
      avgConfidence: 0.87,
      totalDurationMs: 2845,
      promptResultsSnapshot: this.generateMockResults(),
      createdAt: new Date(),
    });

    return this.formatRun(run);
  }

  static async getSimulationRuns(businessId: string): Promise<any[]> {
    const runs = await SimulationRun.find({
      businessProfileId: new Types.ObjectId(businessId),
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return runs.map(r => this.formatRun(r));
  }

  static async getSimulationRun(runId: string): Promise<any> {
    const run = await SimulationRun.findById(new Types.ObjectId(runId));
    if (!run) throw new NotFoundError('Simulation run not found');
    return this.formatRun(run);
  }

  private static formatRun(run: any): any {
    return {
      _id: run._id,
      runType: run.runType,
      totalPrompts: run.totalPrompts,
      mentioned: run.mentionedCount,
      notMentioned: run.notMentionedCount,
      avgConfidence: run.avgConfidence,
      durationMs: run.totalDurationMs,
      results: run.promptResultsSnapshot,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    };
  }

  private static generateMockResults(): any[] {
    return [
      { prompt: 'presence-local-seo', result: 'MENTIONED', confidence: 0.92 },
      { prompt: 'accuracy-data-validation', result: 'MENTIONED', confidence: 0.88 },
      { prompt: 'trust-reputation-analysis', result: 'MENTIONED', confidence: 0.85 },
      { prompt: 'hallucination-detection', result: 'NOT_MENTIONED', confidence: 0.95 },
      { prompt: 'competitive-analysis', result: 'MENTIONED', confidence: 0.79 },
      { prompt: 'sentiment-analysis', result: 'MENTIONED', confidence: 0.83 },
    ];
  }
}

export default SimulationService;
