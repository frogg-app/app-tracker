import { useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { ProcessInfo } from '../store/data';
import { formatBytes, formatPercent } from '../utils/format';
import { clsx } from 'clsx';

interface TopProcessesProps {
  processes: ProcessInfo[];
}

export function TopProcesses({ processes }: TopProcessesProps) {
  const topByCPU = useMemo(() => {
    return [...processes]
      .sort((a, b) => b.cpu_percent - a.cpu_percent)
      .slice(0, 10);
  }, [processes]);

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center">
        <Cpu className="w-5 h-5 text-slate-400 mr-2" />
        <h3 className="font-medium text-slate-900 dark:text-white">Top Processes by CPU</h3>
        <span className="ml-2 badge badge-info">{processes.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-2 font-medium">PID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium text-right">CPU %</th>
              <th className="px-4 py-2 font-medium text-right">Memory</th>
              <th className="px-4 py-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {topByCPU.map((proc) => (
              <tr
                key={proc.pid}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                  {proc.pid}
                </td>
                <td className="px-4 py-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{proc.name}</p>
                    {proc.container_name && (
                      <p className="text-xs text-purple-500">📦 {proc.container_name}</p>
                    )}
                    {proc.systemd_unit && (
                      <p className="text-xs text-blue-500">⚙️ {proc.systemd_unit}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{proc.username}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={clsx(
                      'font-mono',
                      proc.cpu_percent > 50
                        ? 'text-red-500'
                        : proc.cpu_percent > 20
                        ? 'text-yellow-500'
                        : 'text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {formatPercent(proc.cpu_percent)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">
                  {formatBytes(proc.mem_rss)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={clsx(
                      'badge',
                      proc.status === 'S' || proc.status === 'running'
                        ? 'badge-success'
                        : 'badge-warning'
                    )}
                  >
                    {proc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
