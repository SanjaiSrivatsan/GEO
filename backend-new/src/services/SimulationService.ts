import logger from '../config/logger.js';
import { SimulationRun } from '../models/index.js';

export class SimulationService {
  static async runSimulation(
    businessId: string,
    scenarioName: string,
    parameters?: Record<string, unknown>
  ) {
    logger.info(`Running simulation for business ${businessId}: ${scenarioName}`);

    try {
      // Simulate scenario analysis
      const projectedScore = Math.random() * 100; // Placeholder

      const simulation = new SimulationRun({
        businessProfileId: businessId,
        scenarioName,
        parameters: parameters || {},
        results: {
          analyzed: true,
          confidence: 0.7,
        },
        projectedScore,
      });

      await simulation.save();

      logger.info(`Simulation completed for business ${businessId}`);

      return {
        simulationId: simulation._id,
        businessId,
        scenarioName,
        projectedScore: Math.round(projectedScore * 100) / 100,
      };
    } catch (error) {
      logger.error('Simulation error:', error);
      throw error;
    }
  }

  static async getRuns(businessId: string) {
    const runs = await SimulationRun.find({ businessProfileId: businessId })
      .sort({ executedAt: -1 })
      .lean();

    return {
      businessId,
      runCount: runs.length,
      runs,
    };
  }

  static async getResults(simulationId: string) {
    const simulation = await SimulationRun.findById(simulationId).lean();

    if (!simulation) {
      throw new Error('Simulation not found');
    }

    return simulation;
  }
}
