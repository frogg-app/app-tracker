import { Link } from 'react-router-dom';
import { ArrowRight, Network } from 'lucide-react';
import { PortInfo } from '../store/data';
import { clsx } from 'clsx';

interface PortsPreviewProps {
  ports: PortInfo[];
}

export function PortsPreview({ ports }: PortsPreviewProps) {
  const displayPorts = ports.slice(0, 5);

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center">
          <Network className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="font-medium text-slate-900 dark:text-white">Open Ports</h3>
          <span className="ml-2 badge badge-info">{ports.length}</span>
        </div>
        <Link
          to="/ports"
          className="text-sm text-primary-500 hover:text-primary-600 flex items-center"
        >
          View all
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {displayPorts.map((port) => (
          <div
            key={`${port.port}-${port.protocol}`}
            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span
                  className={clsx(
                    'w-12 text-center font-mono text-sm font-medium rounded px-2 py-1',
                    port.protocol === 'tcp'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  )}
                >
                  {port.port}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {port.process_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {port.address}:{port.port}/{port.protocol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="badge badge-success">{port.state}</span>
                {port.username && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {port.username}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {ports.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
            No open ports detected
          </div>
        )}
      </div>
    </div>
  );
}
