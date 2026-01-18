import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock agent data structure
interface AgentData {
  agentId: string;
  hostname: string;
  lastSeen: Date;
  data: {
    processes: Array<{ pid: number; name: string }>;
    ports: Array<{ port: number; protocol: string }>;
    system: {
      hostname: string;
      uptime: number;
      cpu_percent: number;
    };
  };
}

// Simple AgentManager implementation for testing
class MockAgentManager {
  private agents: Map<string, AgentData> = new Map();

  updateAgent(agentId: string, data: AgentData['data']) {
    this.agents.set(agentId, {
      agentId,
      hostname: data.system.hostname,
      lastSeen: new Date(),
      data,
    });
  }

  getAgentData(agentId: string): AgentData | null {
    return this.agents.get(agentId) || null;
  }

  getAgentList(): AgentData[] {
    return Array.from(this.agents.values());
  }

  getLatestData(): AgentData['data'] | null {
    const agents = this.getAgentList();
    if (agents.length === 0) return null;
    
    // Return data from most recently seen agent
    const latest = agents.sort(
      (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
    )[0];
    
    return latest.data;
  }

  removeAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  getAgentCount(): number {
    return this.agents.size;
  }
}

describe('AgentManager', () => {
  let manager: MockAgentManager;

  beforeEach(() => {
    manager = new MockAgentManager();
  });

  describe('updateAgent', () => {
    it('should add a new agent', () => {
      const data = {
        processes: [{ pid: 1, name: 'init' }],
        ports: [{ port: 22, protocol: 'tcp' }],
        system: { hostname: 'test-host', uptime: 3600, cpu_percent: 25 },
      };

      manager.updateAgent('agent-1', data);

      expect(manager.getAgentCount()).toBe(1);
      expect(manager.getAgentData('agent-1')).not.toBeNull();
    });

    it('should update existing agent data', () => {
      const data1 = {
        processes: [{ pid: 1, name: 'init' }],
        ports: [],
        system: { hostname: 'test-host', uptime: 3600, cpu_percent: 25 },
      };

      const data2 = {
        processes: [{ pid: 1, name: 'init' }, { pid: 2, name: 'systemd' }],
        ports: [{ port: 80, protocol: 'tcp' }],
        system: { hostname: 'test-host', uptime: 7200, cpu_percent: 50 },
      };

      manager.updateAgent('agent-1', data1);
      manager.updateAgent('agent-1', data2);

      expect(manager.getAgentCount()).toBe(1);
      
      const agent = manager.getAgentData('agent-1');
      expect(agent?.data.processes).toHaveLength(2);
      expect(agent?.data.system.uptime).toBe(7200);
    });
  });

  describe('getAgentList', () => {
    it('should return empty array when no agents', () => {
      expect(manager.getAgentList()).toEqual([]);
    });

    it('should return all agents', () => {
      manager.updateAgent('agent-1', {
        processes: [],
        ports: [],
        system: { hostname: 'host-1', uptime: 1000, cpu_percent: 10 },
      });

      manager.updateAgent('agent-2', {
        processes: [],
        ports: [],
        system: { hostname: 'host-2', uptime: 2000, cpu_percent: 20 },
      });

      const agents = manager.getAgentList();
      expect(agents).toHaveLength(2);
    });
  });

  describe('getLatestData', () => {
    it('should return null when no agents', () => {
      expect(manager.getLatestData()).toBeNull();
    });

    it('should return data from most recent agent', async () => {
      manager.updateAgent('agent-1', {
        processes: [],
        ports: [],
        system: { hostname: 'host-1', uptime: 1000, cpu_percent: 10 },
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      manager.updateAgent('agent-2', {
        processes: [],
        ports: [],
        system: { hostname: 'host-2', uptime: 2000, cpu_percent: 20 },
      });

      const latest = manager.getLatestData();
      expect(latest?.system.hostname).toBe('host-2');
    });
  });

  describe('removeAgent', () => {
    it('should remove an existing agent', () => {
      manager.updateAgent('agent-1', {
        processes: [],
        ports: [],
        system: { hostname: 'host-1', uptime: 1000, cpu_percent: 10 },
      });

      expect(manager.removeAgent('agent-1')).toBe(true);
      expect(manager.getAgentCount()).toBe(0);
    });

    it('should return false for non-existent agent', () => {
      expect(manager.removeAgent('non-existent')).toBe(false);
    });
  });
});

describe('Data Validation', () => {
  it('should validate process data', () => {
    const validateProcess = (process: any): string[] => {
      const errors: string[] = [];
      
      if (typeof process.pid !== 'number' || process.pid < 0) {
        errors.push('Invalid PID');
      }
      
      if (typeof process.name !== 'string' || process.name.length === 0) {
        errors.push('Invalid process name');
      }
      
      return errors;
    };

    expect(validateProcess({ pid: 1, name: 'init' })).toHaveLength(0);
    expect(validateProcess({ pid: -1, name: 'init' })).toContain('Invalid PID');
    expect(validateProcess({ pid: 1, name: '' })).toContain('Invalid process name');
  });

  it('should validate port data', () => {
    const validatePort = (port: any): string[] => {
      const errors: string[] = [];
      
      if (typeof port.port !== 'number' || port.port < 1 || port.port > 65535) {
        errors.push('Invalid port number');
      }
      
      if (!['tcp', 'udp'].includes(port.protocol)) {
        errors.push('Invalid protocol');
      }
      
      return errors;
    };

    expect(validatePort({ port: 80, protocol: 'tcp' })).toHaveLength(0);
    expect(validatePort({ port: 0, protocol: 'tcp' })).toContain('Invalid port number');
    expect(validatePort({ port: 80, protocol: 'sctp' })).toContain('Invalid protocol');
  });
});
