import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/index.js';
import { logger } from '../utils/logger.js';

// Types for agent data
export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  cmdline: string;
  exe: string;
  cwd: string;
  username: string;
  uid: number;
  gid: number;
  status: string;
  create_time: number;
  cpu_percent: number;
  mem_percent: number;
  mem_rss: number;
  mem_vms: number;
  num_fds: number;
  num_threads: number;
  io_read: number;
  io_write: number;
  container_id?: string;
  container_name?: string;
  pod_name?: string;
  pod_namespace?: string;
  systemd_unit?: string;
}

export interface PortInfo {
  port: number;
  protocol: string;
  address: string;
  pid: number;
  process_name: string;
  cmdline: string;
  username: string;
  exe: string;
  state: string;
  container_id?: string;
  container_name?: string;
  container_image?: string;
  pod_name?: string;
  pod_namespace?: string;
  systemd_unit?: string;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  platform: string;
  kernel_version: string;
  uptime: number;
  boot_time: number;
  cpu_count: number;
  cpu_percent: number;
  cpu_user: number;
  cpu_system: number;
  cpu_idle: number;
  cpu_iowait: number;
  load_avg_1: number;
  load_avg_5: number;
  load_avg_15: number;
  mem_total: number;
  mem_used: number;
  mem_free: number;
  mem_available: number;
  mem_percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
  disk_total: number;
  disk_used: number;
  disk_free: number;
  disk_percent: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  net_bytes_sent: number;
  net_bytes_recv: number;
  net_packets_sent: number;
  net_packets_recv: number;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  image_id: string;
  state: string;
  status: string;
  created: number;
  started_at: string;
  pid: number;
  cpu_percent: number;
  mem_usage: number;
  mem_limit: number;
  mem_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  block_read: number;
  block_write: number;
  pod_name?: string;
  pod_namespace?: string;
  pod_uid?: string;
}

export interface SystemdUnitInfo {
  name: string;
  description: string;
  load_state: string;
  active_state: string;
  sub_state: string;
  main_pid: number;
  exec_main_pid: number;
  memory_current: number;
  cpu_usage_nsec: number;
  tasks_current: number;
}

export interface KubernetesPodInfo {
  name: string;
  namespace: string;
  uid: string;
  node_name: string;
  host_ip: string;
  pod_ip: string;
  phase: string;
  start_time: string;
  labels: Record<string, string>;
  containers: KubeContainerInfo[];
}

export interface KubeContainerInfo {
  name: string;
  container_id: string;
  image: string;
  ready: boolean;
  restart_count: number;
  state: string;
}

export interface AggregatedData {
  timestamp: string;
  processes: ProcessInfo[];
  ports: PortInfo[];
  system: SystemInfo | null;
  systemdUnits: SystemdUnitInfo[];
  containers: ContainerInfo[];
  pods: KubernetesPodInfo[];
}

export interface Agent {
  id: string;
  name: string;
  hostname?: string;
  ipAddress?: string;
  status: 'pending' | 'active' | 'inactive';
  lastSeenAt?: string;
  createdAt: string;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private agentData: Map<string, AggregatedData> = new Map();
  private subscribers: Set<(data: AggregatedData) => void> = new Set();

  constructor() {
    this.loadAgentsFromDB();
    this.startDemoDataGenerator();
  }

  private loadAgentsFromDB(): void {
    try {
      const db = getDatabase();
      const agents = db.prepare('SELECT * FROM agents').all() as {
        id: string;
        name: string;
        hostname: string | null;
        ip_address: string | null;
        status: string;
        last_seen_at: string | null;
        created_at: string;
      }[];

      for (const agent of agents) {
        this.agents.set(agent.id, {
          id: agent.id,
          name: agent.name,
          hostname: agent.hostname ?? undefined,
          ipAddress: agent.ip_address ?? undefined,
          status: agent.status as 'pending' | 'active' | 'inactive',
          lastSeenAt: agent.last_seen_at ?? undefined,
          createdAt: agent.created_at,
        });
      }
    } catch {
      logger.warn('Could not load agents from database');
    }
  }

  createAgent(name: string): Agent & { token: string } {
    const id = uuidv4();
    const token = uuidv4();
    const tokenHash = bcrypt.hashSync(token, 10);

    const agent: Agent = {
      id,
      name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      const db = getDatabase();
      db.prepare('INSERT INTO agents (id, name, token_hash, status) VALUES (?, ?, ?, ?)').run(
        id,
        name,
        tokenHash,
        'pending'
      );
    } catch {
      logger.warn('Could not save agent to database');
    }

    this.agents.set(id, agent);
    return { ...agent, token };
  }

  removeAgent(id: string): void {
    this.agents.delete(id);
    this.agentData.delete(id);

    try {
      const db = getDatabase();
      db.prepare('DELETE FROM agents WHERE id = ?').run(id);
    } catch {
      logger.warn('Could not remove agent from database');
    }
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  updateAgentData(agentId: string, data: AggregatedData): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'active';
      agent.lastSeenAt = new Date().toISOString();
    }

    this.agentData.set(agentId, data);
    this.notifySubscribers(this.getAggregatedData());

    // Store snapshot for history
    this.storeSnapshot(agentId, data);
  }

  private storeSnapshot(agentId: string, data: AggregatedData): void {
    try {
      const db = getDatabase();
      db.prepare('INSERT INTO metrics_snapshots (agent_id, data) VALUES (?, ?)').run(
        agentId,
        JSON.stringify(data)
      );
    } catch {
      // Ignore snapshot storage errors
    }
  }

  getAggregatedData(): AggregatedData {
    // Aggregate data from all agents
    const aggregated: AggregatedData = {
      timestamp: new Date().toISOString(),
      processes: [],
      ports: [],
      system: null,
      systemdUnits: [],
      containers: [],
      pods: [],
    };

    for (const data of this.agentData.values()) {
      if (data.processes) aggregated.processes.push(...data.processes);
      if (data.ports) aggregated.ports.push(...data.ports);
      if (data.system && !aggregated.system) aggregated.system = data.system;
      if (data.systemdUnits) aggregated.systemdUnits.push(...data.systemdUnits);
      if (data.containers) aggregated.containers.push(...data.containers);
      if (data.pods) aggregated.pods.push(...data.pods);
    }

    return aggregated;
  }

  subscribe(callback: (data: AggregatedData) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(data: AggregatedData): void {
    for (const callback of this.subscribers) {
      try {
        callback(data);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  // Generate demo data for testing
  private startDemoDataGenerator(): void {
    const demoAgentId = 'demo-agent';
    
    if (!this.agents.has(demoAgentId)) {
      this.agents.set(demoAgentId, {
        id: demoAgentId,
        name: 'Demo Agent',
        hostname: 'demo-server',
        ipAddress: '192.168.1.100',
        status: 'active',
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    // Generate initial demo data
    this.updateAgentData(demoAgentId, this.generateDemoData());

    // Update every 5 seconds
    setInterval(() => {
      this.updateAgentData(demoAgentId, this.generateDemoData());
    }, 5000);
  }

  private generateDemoData(): AggregatedData {
    const now = new Date();
    const baseMemTotal = 16 * 1024 * 1024 * 1024; // 16GB
    const baseDiskTotal = 500 * 1024 * 1024 * 1024; // 500GB

    return {
      timestamp: now.toISOString(),
      processes: [
        {
          pid: 1,
          ppid: 0,
          name: 'systemd',
          cmdline: '/sbin/init',
          exe: '/usr/lib/systemd/systemd',
          cwd: '/',
          username: 'root',
          uid: 0,
          gid: 0,
          status: 'S',
          create_time: Date.now() - 86400000,
          cpu_percent: 0.1 + Math.random() * 0.2,
          mem_percent: 0.5,
          mem_rss: 12 * 1024 * 1024,
          mem_vms: 168 * 1024 * 1024,
          num_fds: 128,
          num_threads: 1,
          io_read: 1024 * 1024,
          io_write: 512 * 1024,
          systemd_unit: 'init.scope',
        },
        {
          pid: 1234,
          ppid: 1,
          name: 'nginx',
          cmdline: 'nginx: master process /usr/sbin/nginx',
          exe: '/usr/sbin/nginx',
          cwd: '/',
          username: 'root',
          uid: 0,
          gid: 0,
          status: 'S',
          create_time: Date.now() - 3600000,
          cpu_percent: 0.5 + Math.random() * 1.5,
          mem_percent: 2.5 + Math.random() * 0.5,
          mem_rss: 64 * 1024 * 1024,
          mem_vms: 256 * 1024 * 1024,
          num_fds: 24,
          num_threads: 4,
          io_read: 10 * 1024 * 1024,
          io_write: 5 * 1024 * 1024,
          systemd_unit: 'nginx.service',
        },
        {
          pid: 2345,
          ppid: 1,
          name: 'postgres',
          cmdline: '/usr/lib/postgresql/14/bin/postgres -D /var/lib/postgresql/14/main',
          exe: '/usr/lib/postgresql/14/bin/postgres',
          cwd: '/var/lib/postgresql/14/main',
          username: 'postgres',
          uid: 108,
          gid: 113,
          status: 'S',
          create_time: Date.now() - 7200000,
          cpu_percent: 2 + Math.random() * 3,
          mem_percent: 8 + Math.random() * 2,
          mem_rss: 512 * 1024 * 1024,
          mem_vms: 1024 * 1024 * 1024,
          num_fds: 48,
          num_threads: 12,
          io_read: 100 * 1024 * 1024,
          io_write: 50 * 1024 * 1024,
          systemd_unit: 'postgresql.service',
        },
        {
          pid: 3456,
          ppid: 1,
          name: 'node',
          cmdline: 'node /app/server.js',
          exe: '/usr/bin/node',
          cwd: '/app',
          username: 'app',
          uid: 1000,
          gid: 1000,
          status: 'S',
          create_time: Date.now() - 1800000,
          cpu_percent: 5 + Math.random() * 10,
          mem_percent: 4 + Math.random() * 2,
          mem_rss: 256 * 1024 * 1024,
          mem_vms: 512 * 1024 * 1024,
          num_fds: 64,
          num_threads: 8,
          io_read: 20 * 1024 * 1024,
          io_write: 15 * 1024 * 1024,
          container_id: 'abc123def456',
          container_name: 'app-server',
        },
        {
          pid: 4567,
          ppid: 1,
          name: 'redis-server',
          cmdline: 'redis-server *:6379',
          exe: '/usr/bin/redis-server',
          cwd: '/var/lib/redis',
          username: 'redis',
          uid: 109,
          gid: 114,
          status: 'S',
          create_time: Date.now() - 7200000,
          cpu_percent: 1 + Math.random() * 2,
          mem_percent: 3 + Math.random() * 1,
          mem_rss: 128 * 1024 * 1024,
          mem_vms: 256 * 1024 * 1024,
          num_fds: 16,
          num_threads: 4,
          io_read: 50 * 1024 * 1024,
          io_write: 30 * 1024 * 1024,
          systemd_unit: 'redis.service',
        },
      ],
      ports: [
        {
          port: 80,
          protocol: 'tcp',
          address: '0.0.0.0',
          pid: 1234,
          process_name: 'nginx',
          cmdline: 'nginx: master process /usr/sbin/nginx',
          username: 'root',
          exe: '/usr/sbin/nginx',
          state: 'LISTEN',
          systemd_unit: 'nginx.service',
        },
        {
          port: 443,
          protocol: 'tcp',
          address: '0.0.0.0',
          pid: 1234,
          process_name: 'nginx',
          cmdline: 'nginx: master process /usr/sbin/nginx',
          username: 'root',
          exe: '/usr/sbin/nginx',
          state: 'LISTEN',
          systemd_unit: 'nginx.service',
        },
        {
          port: 5432,
          protocol: 'tcp',
          address: '127.0.0.1',
          pid: 2345,
          process_name: 'postgres',
          cmdline: '/usr/lib/postgresql/14/bin/postgres',
          username: 'postgres',
          exe: '/usr/lib/postgresql/14/bin/postgres',
          state: 'LISTEN',
          systemd_unit: 'postgresql.service',
        },
        {
          port: 3000,
          protocol: 'tcp',
          address: '0.0.0.0',
          pid: 3456,
          process_name: 'node',
          cmdline: 'node /app/server.js',
          username: 'app',
          exe: '/usr/bin/node',
          state: 'LISTEN',
          container_id: 'abc123def456',
          container_name: 'app-server',
        },
        {
          port: 6379,
          protocol: 'tcp',
          address: '127.0.0.1',
          pid: 4567,
          process_name: 'redis-server',
          cmdline: 'redis-server *:6379',
          username: 'redis',
          exe: '/usr/bin/redis-server',
          state: 'LISTEN',
          systemd_unit: 'redis.service',
        },
        {
          port: 22,
          protocol: 'tcp',
          address: '0.0.0.0',
          pid: 567,
          process_name: 'sshd',
          cmdline: '/usr/sbin/sshd -D',
          username: 'root',
          exe: '/usr/sbin/sshd',
          state: 'LISTEN',
          systemd_unit: 'ssh.service',
        },
      ],
      system: {
        hostname: 'demo-server',
        os: 'linux',
        platform: 'ubuntu',
        kernel_version: '5.15.0-91-generic',
        uptime: 864000,
        boot_time: Date.now() / 1000 - 864000,
        cpu_count: 8,
        cpu_percent: 15 + Math.random() * 30,
        cpu_user: 10 + Math.random() * 15,
        cpu_system: 3 + Math.random() * 5,
        cpu_idle: 70 + Math.random() * 10,
        cpu_iowait: 1 + Math.random() * 3,
        load_avg_1: 1.2 + Math.random() * 0.8,
        load_avg_5: 1.5 + Math.random() * 0.5,
        load_avg_15: 1.3 + Math.random() * 0.3,
        mem_total: baseMemTotal,
        mem_used: baseMemTotal * (0.5 + Math.random() * 0.2),
        mem_free: baseMemTotal * 0.1,
        mem_available: baseMemTotal * (0.3 + Math.random() * 0.1),
        mem_percent: 50 + Math.random() * 20,
        swap_total: 4 * 1024 * 1024 * 1024,
        swap_used: 512 * 1024 * 1024,
        swap_percent: 12.5,
        disk_total: baseDiskTotal,
        disk_used: baseDiskTotal * (0.4 + Math.random() * 0.1),
        disk_free: baseDiskTotal * 0.5,
        disk_percent: 40 + Math.random() * 10,
        disk_read_bytes: Math.floor(Math.random() * 10000000),
        disk_write_bytes: Math.floor(Math.random() * 5000000),
        net_bytes_sent: Math.floor(Math.random() * 100000000),
        net_bytes_recv: Math.floor(Math.random() * 200000000),
        net_packets_sent: Math.floor(Math.random() * 100000),
        net_packets_recv: Math.floor(Math.random() * 200000),
      },
      systemdUnits: [
        {
          name: 'nginx.service',
          description: 'A high performance web server',
          load_state: 'loaded',
          active_state: 'active',
          sub_state: 'running',
          main_pid: 1234,
          exec_main_pid: 1234,
          memory_current: 64 * 1024 * 1024,
          cpu_usage_nsec: 1000000000,
          tasks_current: 5,
        },
        {
          name: 'postgresql.service',
          description: 'PostgreSQL RDBMS',
          load_state: 'loaded',
          active_state: 'active',
          sub_state: 'running',
          main_pid: 2345,
          exec_main_pid: 2345,
          memory_current: 512 * 1024 * 1024,
          cpu_usage_nsec: 5000000000,
          tasks_current: 15,
        },
        {
          name: 'redis.service',
          description: 'Redis In-Memory Data Store',
          load_state: 'loaded',
          active_state: 'active',
          sub_state: 'running',
          main_pid: 4567,
          exec_main_pid: 4567,
          memory_current: 128 * 1024 * 1024,
          cpu_usage_nsec: 2000000000,
          tasks_current: 4,
        },
        {
          name: 'ssh.service',
          description: 'OpenBSD Secure Shell server',
          load_state: 'loaded',
          active_state: 'active',
          sub_state: 'running',
          main_pid: 567,
          exec_main_pid: 567,
          memory_current: 8 * 1024 * 1024,
          cpu_usage_nsec: 100000000,
          tasks_current: 1,
        },
        {
          name: 'docker.service',
          description: 'Docker Application Container Engine',
          load_state: 'loaded',
          active_state: 'active',
          sub_state: 'running',
          main_pid: 890,
          exec_main_pid: 890,
          memory_current: 256 * 1024 * 1024,
          cpu_usage_nsec: 3000000000,
          tasks_current: 20,
        },
      ],
      containers: [
        {
          id: 'abc123def456',
          name: 'app-server',
          image: 'node:18-alpine',
          image_id: 'sha256:abc123',
          state: 'running',
          status: 'Up 2 hours',
          created: Date.now() / 1000 - 7200,
          started_at: new Date(Date.now() - 7200000).toISOString(),
          pid: 3456,
          cpu_percent: 5 + Math.random() * 10,
          mem_usage: 256 * 1024 * 1024,
          mem_limit: 1024 * 1024 * 1024,
          mem_percent: 25,
          net_rx_bytes: 50 * 1024 * 1024,
          net_tx_bytes: 30 * 1024 * 1024,
          block_read: 10 * 1024 * 1024,
          block_write: 5 * 1024 * 1024,
        },
        {
          id: 'def456ghi789',
          name: 'api-gateway',
          image: 'nginx:alpine',
          image_id: 'sha256:def456',
          state: 'running',
          status: 'Up 3 hours',
          created: Date.now() / 1000 - 10800,
          started_at: new Date(Date.now() - 10800000).toISOString(),
          pid: 5678,
          cpu_percent: 2 + Math.random() * 5,
          mem_usage: 32 * 1024 * 1024,
          mem_limit: 256 * 1024 * 1024,
          mem_percent: 12.5,
          net_rx_bytes: 100 * 1024 * 1024,
          net_tx_bytes: 80 * 1024 * 1024,
          block_read: 2 * 1024 * 1024,
          block_write: 1 * 1024 * 1024,
        },
      ],
      pods: [],
    };
  }
}
