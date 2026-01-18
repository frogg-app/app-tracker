import { useState, useMemo } from 'react';
import { Container, Search, Play, Square, Pause, AlertCircle } from 'lucide-react';
import { useDataStore } from '../store/data';
import { clsx } from 'clsx';
import { formatBytes, formatUptime } from '../utils/format';

export function Containers() {
  const { data } = useDataStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'exited' | 'paused'>('all');

  const filteredContainers = useMemo(() => {
    if (!data?.containers) return [];
    
    return data.containers.filter((container) => {
      const matchesSearch =
        search === '' ||
        container.name.toLowerCase().includes(search.toLowerCase()) ||
        container.image.toLowerCase().includes(search.toLowerCase()) ||
        container.id.includes(search);
      
      const matchesStatus = statusFilter === 'all' || container.state === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [data?.containers, search, statusFilter]);

  const stats = useMemo(() => {
    if (!data?.containers) return { running: 0, exited: 0, paused: 0, total: 0 };
    
    return {
      running: data.containers.filter((c) => c.state === 'running').length,
      exited: data.containers.filter((c) => c.state === 'exited').length,
      paused: data.containers.filter((c) => c.state === 'paused').length,
      total: data.containers.length,
    };
  }, [data?.containers]);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'exited':
        return <Square className="w-4 h-4 text-slate-400" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStateBadge = (state: string) => {
    const classes = {
      running: 'badge-success',
      exited: 'badge-secondary',
      paused: 'badge-warning',
      dead: 'badge-danger',
      restarting: 'badge-info',
    };
    return classes[state as keyof typeof classes] || 'badge-secondary';
  };

  if (!data) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Container className="w-7 h-7 mr-2" />
          Containers
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Docker and container runtime instances
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'all' && 'ring-2 ring-primary-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </button>
        <button
          onClick={() => setStatusFilter('running')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'running' && 'ring-2 ring-green-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Running</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.running}</p>
        </button>
        <button
          onClick={() => setStatusFilter('exited')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'exited' && 'ring-2 ring-slate-400'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Exited</p>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.exited}</p>
        </button>
        <button
          onClick={() => setStatusFilter('paused')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'paused' && 'ring-2 ring-yellow-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Paused</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.paused}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, image, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 w-full"
        />
      </div>

      {/* Containers Grid */}
      {filteredContainers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContainers.map((container) => (
            <div key={container.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getStateIcon(container.state)}
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {container.name}
                  </h3>
                </div>
                <span className={clsx('badge', getStateBadge(container.state))}>
                  {container.state}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Image</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate ml-2 max-w-[200px]">
                    {container.image}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ID</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {container.id.substring(0, 12)}
                  </span>
                </div>
                {container.state === 'running' && container.started_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Uptime</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {formatUptime(
                        Math.floor((Date.now() - new Date(container.started_at).getTime()) / 1000)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {container.state === 'running' && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">CPU</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {container.cpu_percent?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, container.cpu_percent || 0)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Memory</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {formatBytes(container.mem_usage || 0)} /{' '}
                        {formatBytes(container.mem_limit || 0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${
                            container.mem_limit
                              ? Math.min(100, ((container.mem_usage || 0) / container.mem_limit) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {container.ports && container.ports.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ports</p>
                  <div className="flex flex-wrap gap-1">
                    {container.ports.slice(0, 5).map((port, idx) => (
                      <span key={idx} className="badge badge-info text-xs">
                        {port.private_port}
                        {port.public_port && `:${port.public_port}`}
                        /{port.type}
                      </span>
                    ))}
                    {container.ports.length > 5 && (
                      <span className="text-xs text-slate-400">
                        +{container.ports.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Container className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            No containers found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {data.containers?.length === 0
              ? 'No containers are running on this host'
              : 'No containers match your search criteria'}
          </p>
        </div>
      )}
    </div>
  );
}
