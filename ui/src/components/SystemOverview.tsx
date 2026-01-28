import { Cpu, HardDrive, MemoryStick, Clock, Server } from 'lucide-react';
import { SystemInfo } from '../store/data';
import { formatBytes, formatUptime } from '../utils/format';

interface SystemOverviewProps {
  system: SystemInfo;
}

export function SystemOverview({ system }: SystemOverviewProps) {
  const cards = [
    {
      name: 'CPU Usage',
      value: `${system.cpu_percent.toFixed(1)}%`,
      icon: Cpu,
      color: 'blue',
      detail: `${system.cpu_count} cores`,
    },
    {
      name: 'Memory',
      value: `${system.mem_percent.toFixed(1)}%`,
      icon: MemoryStick,
      color: 'green',
      detail: `${formatBytes(system.mem_used)} / ${formatBytes(system.mem_total)}`,
    },
    {
      name: 'Disk',
      value: `${system.disk_percent.toFixed(1)}%`,
      icon: HardDrive,
      color: 'yellow',
      detail: `${formatBytes(system.disk_used)} / ${formatBytes(system.disk_total)}`,
    },
    {
      name: 'Uptime',
      value: formatUptime(system.uptime),
      icon: Clock,
      color: 'purple',
      detail: system.hostname,
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div key={card.name} className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{card.name}</p>
              <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.detail}</p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
              <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      ))}
      
      {/* Host info card */}
      <div className="card p-3 sm:p-4 sm:col-span-2 lg:col-span-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0">
            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm">
              <span className="font-medium text-slate-900 dark:text-white truncate">{system.hostname}</span>
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {system.platform} • {system.kernel_version}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Load: {system.load_avg_1.toFixed(2)} / {system.load_avg_5.toFixed(2)} / {system.load_avg_15.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
