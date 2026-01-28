import { useState, useMemo } from 'react';
import { Activity, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useDataStore } from '../store/data';
import { clsx } from 'clsx';
import { formatBytes } from '../utils/format';

type SortField = 'cpu' | 'memory' | 'name' | 'pid' | 'threads';
type SortDir = 'asc' | 'desc';

export function Processes() {
  const { data } = useDataStore();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('cpu');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showKernel, setShowKernel] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredProcesses = useMemo(() => {
    if (!data?.processes) return [];
    
    let processes = [...data.processes];

    // Filter kernel threads (usually have [] around the name)
    if (!showKernel) {
      processes = processes.filter((p) => !p.name.startsWith('[') && !p.name.endsWith(']'));
    }

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      processes = processes.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.cmdline.toLowerCase().includes(lowerSearch) ||
          p.username.toLowerCase().includes(lowerSearch) ||
          p.pid.toString().includes(search)
      );
    }

    // Sort
    processes.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'cpu':
          comparison = a.cpu_percent - b.cpu_percent;
          break;
        case 'memory':
          comparison = a.memory_bytes - b.memory_bytes;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'pid':
          comparison = a.pid - b.pid;
          break;
        case 'threads':
          comparison = a.num_threads - b.num_threads;
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return processes;
  }, [data?.processes, search, sortField, sortDir, showKernel]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-white transition-colors"
      onClick={() => handleSort(field)}
    >
      <span>{children}</span>
      {sortField === field ? (
        sortDir === 'desc' ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );

  if (!data) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Activity className="w-6 h-6 sm:w-7 sm:h-7 mr-2" />
          Processes
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          All running processes on the system ({data.processes?.length || 0} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 min-w-[200px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, PID, user, or command..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <label className="flex items-center space-x-2 text-xs sm:text-sm">
          <input
            type="checkbox"
            checked={showKernel}
            onChange={(e) => setShowKernel(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-slate-600 dark:text-slate-300">Show kernel threads</span>
        </label>
      </div>

      {/* Process Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">
                  <SortHeader field="pid">PID</SortHeader>
                </th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">
                  <SortHeader field="name">Name</SortHeader>
                </th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">User</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">
                  <SortHeader field="cpu">CPU %</SortHeader>
                </th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">
                  <SortHeader field="memory">Memory</SortHeader>
                </th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden lg:table-cell">
                  <SortHeader field="threads">Threads</SortHeader>
                </th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden lg:table-cell">Status</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden xl:table-cell">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredProcesses.slice(0, 100).map((process) => (
                <tr
                  key={process.pid}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-3 sm:px-4 py-3 font-mono text-primary-500 text-xs sm:text-sm">{process.pid}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="max-w-[120px] sm:max-w-[200px] md:max-w-[250px]">
                      <p className="font-medium text-slate-900 dark:text-white truncate text-xs sm:text-sm">
                        {process.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate hidden sm:block" title={process.cmdline}>
                        {process.cmdline || process.exe || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell text-xs sm:text-sm">
                    {process.username}
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 sm:w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            process.cpu_percent > 50
                              ? 'bg-red-500'
                              : process.cpu_percent > 20
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          )}
                          style={{ width: `${Math.min(100, process.cpu_percent)}%` }}
                        />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 w-10 sm:w-12 text-xs sm:text-sm">
                        {process.cpu_percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300 hidden md:table-cell text-xs sm:text-sm">
                    {formatBytes(process.memory_bytes)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell text-xs sm:text-sm">
                    {process.num_threads}
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                    <span
                      className={clsx(
                        'badge text-xs',
                        process.status === 'running'
                          ? 'badge-success'
                          : process.status === 'sleeping'
                          ? 'badge-info'
                          : process.status === 'zombie'
                          ? 'badge-danger'
                          : 'badge-secondary'
                      )}
                    >
                      {process.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
                    {process.container_name && (
                      <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">
                        📦 {process.container_name}
                      </span>
                    )}
                    {process.systemd_unit && !process.container_name && (
                      <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        ⚙️ {process.systemd_unit}
                      </span>
                    )}
                    {!process.container_name && !process.systemd_unit && (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProcesses.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
            No processes match your search criteria
          </div>
        )}
        {filteredProcesses.length > 100 && (
          <div className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50">
            Showing first 100 of {filteredProcesses.length} processes
          </div>
        )}
        {filteredProcesses.length > 0 && filteredProcesses.length <= 100 && (
          <div className="px-3 sm:px-4 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
            Showing {filteredProcesses.length} process{filteredProcesses.length !== 1 ? 'es' : ''}
            <span className="inline lg:hidden"> • Swipe table to see more columns</span>
          </div>
        )}
      </div>
    </div>
  );
}
