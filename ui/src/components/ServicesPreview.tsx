import { Link } from 'react-router-dom';
import { ArrowRight, Server } from 'lucide-react';
import { SystemdUnitInfo } from '../store/data';
import { clsx } from 'clsx';
import { formatBytes } from '../utils/format';

interface ServicesPreviewProps {
  services: SystemdUnitInfo[];
}

export function ServicesPreview({ services }: ServicesPreviewProps) {
  const activeServices = services.filter((s) => s.active_state === 'active');
  const displayServices = activeServices.slice(0, 5);

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center">
          <Server className="w-5 h-5 text-slate-400 mr-2" />
          <h3 className="font-medium text-slate-900 dark:text-white">Services</h3>
          <span className="ml-2 badge badge-success">{activeServices.length} active</span>
        </div>
        <Link
          to="/services"
          className="text-sm text-primary-500 hover:text-primary-600 flex items-center"
        >
          View all
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {displayServices.map((service) => (
          <div
            key={service.name}
            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {service.name.replace('.service', '')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {service.description || 'No description'}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={clsx(
                    'badge',
                    service.active_state === 'active' ? 'badge-success' : 'badge-warning'
                  )}
                >
                  {service.sub_state}
                </span>
                {service.memory_current > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {formatBytes(service.memory_current)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {displayServices.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
            No active services detected
          </div>
        )}
      </div>
    </div>
  );
}
