import { useState, useMemo } from 'react';
import { Network, Search, Filter } from 'lucide-react';
import { useDataStore } from '../store/data';
import { clsx } from 'clsx';

export function Ports() {
  const { data } = useDataStore();
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'tcp' | 'udp'>('all');

  const filteredPorts = useMemo(() => {
    if (!data?.ports) return [];
    
    return data.ports.filter((port) => {
      const matchesSearch =
        search === '' ||
        port.port.toString().includes(search) ||
        port.process_name.toLowerCase().includes(search.toLowerCase()) ||
        port.address.includes(search);
      
      const matchesProtocol = protocolFilter === 'all' || port.protocol === protocolFilter;
      
      return matchesSearch && matchesProtocol;
    });
  }, [data?.ports, search, protocolFilter]);

  if (!data) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Network className="w-6 h-6 sm:w-7 sm:h-7 mr-2" />
          Open Ports
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          All listening TCP and UDP ports on the system
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by port, process, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value as 'all' | 'tcp' | 'udp')}
            className="input w-full sm:w-auto"
          >
            <option value="all">All Protocols</option>
            <option value="tcp">TCP Only</option>
            <option value="udp">UDP Only</option>
          </select>
        </div>
      </div>

      {/* Ports Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Port</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Protocol</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Address</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Process</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden sm:table-cell">User</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden md:table-cell">State</th>
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap hidden lg:table-cell">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPorts.map((port) => (
                <tr
                  key={`${port.port}-${port.protocol}-${port.address}`}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-3 sm:px-4 py-3">
                    <span className="font-mono font-medium text-primary-500">{port.port}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span
                      className={clsx(
                        'badge text-xs',
                        port.protocol === 'tcp' ? 'badge-info' : 'badge-warning'
                      )}
                    >
                      {port.protocol.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-mono text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                    <span className="block max-w-[120px] sm:max-w-none truncate">
                      {port.address}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">
                        {port.process_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[100px] sm:max-w-[150px]">
                        PID: {port.pid}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    {port.username || '-'}
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                    <span className="badge badge-success text-xs">{port.state}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                    {port.container_name && (
                      <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">
                        📦 {port.container_name}
                      </span>
                    )}
                    {port.systemd_unit && (
                      <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                        ⚙️ {port.systemd_unit}
                      </span>
                    )}
                    {!port.container_name && !port.systemd_unit && (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPorts.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
            No ports match your search criteria
          </div>
        )}
        {filteredPorts.length > 0 && (
          <div className="px-3 sm:px-4 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
            Showing {filteredPorts.length} port{filteredPorts.length !== 1 ? 's' : ''}
            <span className="hidden sm:inline"> • Swipe table to see more columns</span>
          </div>
        )}
      </div>
    </div>
  );
}
