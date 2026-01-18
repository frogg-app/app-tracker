import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../store/theme';
import { useDataStore } from '../store/data';

// Reset stores before each test
beforeEach(() => {
  // Reset theme store
  useThemeStore.setState({ isDark: false });
  
  // Reset data store
  useDataStore.setState({
    data: null,
    selectedAgent: null,
    agents: [],
    history: [],
    isConnected: false,
    lastUpdate: null,
  });
});

describe('Theme Store', () => {
  it('should initialize with light theme', () => {
    const state = useThemeStore.getState();
    expect(state.isDark).toBe(false);
  });

  it('should toggle theme', () => {
    const { toggle } = useThemeStore.getState();
    
    toggle();
    expect(useThemeStore.getState().isDark).toBe(true);
    
    toggle();
    expect(useThemeStore.getState().isDark).toBe(false);
  });

  it('should set theme directly', () => {
    const { setTheme } = useThemeStore.getState();
    
    setTheme(true);
    expect(useThemeStore.getState().isDark).toBe(true);
    
    setTheme(false);
    expect(useThemeStore.getState().isDark).toBe(false);
  });
});

describe('Data Store', () => {
  it('should initialize with null data', () => {
    const state = useDataStore.getState();
    expect(state.data).toBeNull();
    expect(state.isConnected).toBe(false);
  });

  it('should update data', () => {
    const { setData } = useDataStore.getState();
    
    const mockData = {
      processes: [{ pid: 1, name: 'init' }],
      ports: [{ port: 80, protocol: 'tcp' }],
      system: {
        hostname: 'test-host',
        uptime: 3600,
        cpu_percent: 25,
        memory_total: 8 * 1024 * 1024 * 1024,
        memory_used: 4 * 1024 * 1024 * 1024,
      },
      containers: [],
      services: [],
    };

    setData(mockData as any);
    
    const state = useDataStore.getState();
    expect(state.data).not.toBeNull();
    expect(state.data?.system.hostname).toBe('test-host');
  });

  it('should update connection status', () => {
    const { setConnected } = useDataStore.getState();
    
    setConnected(true);
    expect(useDataStore.getState().isConnected).toBe(true);
    
    setConnected(false);
    expect(useDataStore.getState().isConnected).toBe(false);
  });

  it('should select agent', () => {
    const { selectAgent } = useDataStore.getState();
    
    selectAgent('agent-1');
    expect(useDataStore.getState().selectedAgent).toBe('agent-1');
    
    selectAgent(null);
    expect(useDataStore.getState().selectedAgent).toBeNull();
  });

  it('should update agents list', () => {
    const { setAgents } = useDataStore.getState();
    
    const agents = [
      { id: 'agent-1', hostname: 'host-1', lastSeen: new Date().toISOString() },
      { id: 'agent-2', hostname: 'host-2', lastSeen: new Date().toISOString() },
    ];

    setAgents(agents as any);
    
    expect(useDataStore.getState().agents).toHaveLength(2);
  });
});
