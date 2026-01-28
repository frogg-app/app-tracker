import { useDataStore } from '../store/data';
import { SystemOverview } from '../components/SystemOverview';
import { ResourceCharts } from '../components/ResourceCharts';
import { PortsPreview } from '../components/PortsPreview';
import { ServicesPreview } from '../components/ServicesPreview';
import { TopProcesses } from '../components/TopProcesses';

export function Dashboard() {
  const { data } = useDataStore();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          System overview and real-time metrics
        </p>
      </div>

      {data.system && <SystemOverview system={data.system} />}
      
      <ResourceCharts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <PortsPreview ports={data.ports} />
        <ServicesPreview services={data.systemdUnits} />
      </div>

      <TopProcesses processes={data.processes} />
    </div>
  );
}
