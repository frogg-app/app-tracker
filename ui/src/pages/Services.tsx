import { useState, useMemo } from 'react';
import { Cog, Search, Play, Square, RefreshCw, AlertCircle } from 'lucide-react';
import { useDataStore } from '../store/data';
import { clsx } from 'clsx';
import { formatUptime } from '../utils/format';

export function Services() {
  const { data } = useDataStore();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive' | 'failed'>('all');

  const filteredServices = useMemo(() => {
    if (!data?.systemdUnits) return [];
    
    return data.systemdUnits.filter((service) => {
      const matchesSearch =
        search === '' ||
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        service.description.toLowerCase().includes(search.toLowerCase());
      
      const matchesState = stateFilter === 'all' || service.active_state === stateFilter;
      
      return matchesSearch && matchesState;
    });
  }, [data?.systemdUnits, search, stateFilter]);

  const stats = useMemo(() => {
    if (!data?.systemdUnits) return { active: 0, inactive: 0, failed: 0, total: 0 };
    
    return {
      active: data.systemdUnits.filter((s) => s.active_state === 'active').length,
      inactive: data.systemdUnits.filter((s) => s.active_state === 'inactive').length,
      failed: data.systemdUnits.filter((s) => s.active_state === 'failed').length,
      total: data.systemdUnits.length,
    };
  }, [data?.systemdUnits]);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <Square className="w-4 h-4 text-slate-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'reloading':
      case 'activating':
      case 'deactivating':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Square className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStateBadge = (state: string) => {
    const classes = {
      active: 'badge-success',
      inactive: 'badge-secondary',
      failed: 'badge-danger',
      reloading: 'badge-warning',
      activating: 'badge-warning',
      deactivating: 'badge-warning',
    };
    return classes[state as keyof typeof classes] || 'badge-secondary';
  };

  if (!data) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <Cog className="w-7 h-7 mr-2" />
            Systemd Services
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor and manage systemd units
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStateFilter('all')}
          className={clsx(
            'card p-4 text-left transition-all',
            stateFilter === 'all' && 'ring-2 ring-primary-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </button>
        <button
          onClick={() => setStateFilter('active')}
          className={clsx(
            'card p-4 text-left transition-all',
            stateFilter === 'active' && 'ring-2 ring-green-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
        </button>
        <button
          onClick={() => setStateFilter('inactive')}
          className={clsx(
            'card p-4 text-left transition-all',
            stateFilter === 'inactive' && 'ring-2 ring-slate-400'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Inactive</p>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.inactive}</p>
        </button>
        <button
          onClick={() => setStateFilter('failed')}
          className={clsx(
            'card p-4 text-left transition-all',
            stateFilter === 'failed' && 'ring-2 ring-red-500'
          )}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Failed</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 w-full"
        />
      </div>

      {/* Services Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 font-medium w-10"></th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Sub-state</th>
                <th className="px-4 py-3 font-medium">Since</th>
                <th className="px-4 py-3 font-medium">Main PID</th>
                <th className="px-4 py-3 font-medium">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredServices.map((service) => (
                <tr
                  key={service.name}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3">{getStateIcon(service.active_state)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {service.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {service.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', getStateBadge(service.active_state))}>
                      {service.active_state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {service.sub_state}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {service.active_enter_timestamp
                      ? formatUptime(
                          Math.floor((Date.now() - new Date(service.active_enter_timestamp).getTime()) / 1000)
                        )
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {service.main_pid > 0 ? (
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {service.main_pid}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {service.memory_current
                      ? `${(service.memory_current / 1024 / 1024).toFixed(1)} MB`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredServices.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
            No services match your search criteria
          </div>
        )}
      </div>
    </div>
  );
}
