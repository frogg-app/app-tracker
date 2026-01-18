import { create } from 'zustand';

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
  memory_bytes: number;
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

export interface ContainerPort {
  ip: string;
  private_port: number;
  public_port: number;
  type: string;
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
  ports: ContainerPort[];
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
  active_enter_timestamp: number;
}

export interface AggregatedData {
  timestamp: string;
  processes: ProcessInfo[];
  ports: PortInfo[];
  system: SystemInfo | null;
  systemdUnits: SystemdUnitInfo[];
  containers: ContainerInfo[];
  pods: unknown[];
}

interface DataState {
  data: AggregatedData | null;
  history: { timestamp: string; system: SystemInfo }[];
  isConnected: boolean;
  lastUpdate: string | null;
  setData: (data: AggregatedData) => void;
  setConnected: (connected: boolean) => void;
  addToHistory: (system: SystemInfo) => void;
}

const MAX_HISTORY = 60; // Keep 60 data points for charts

export const useDataStore = create<DataState>((set) => ({
  data: null,
  history: [],
  isConnected: false,
  lastUpdate: null,
  setData: (data) =>
    set((state) => {
      const newHistory = data.system
        ? [...state.history, { timestamp: data.timestamp, system: data.system }].slice(-MAX_HISTORY)
        : state.history;
      return {
        data,
        lastUpdate: data.timestamp,
        history: newHistory,
      };
    }),
  setConnected: (connected) => set({ isConnected: connected }),
  addToHistory: (system) =>
    set((state) => ({
      history: [...state.history, { timestamp: new Date().toISOString(), system }].slice(-MAX_HISTORY),
    })),
}));
