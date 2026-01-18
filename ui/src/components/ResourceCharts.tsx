import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useDataStore } from '../store/data';

export function ResourceCharts() {
  const { history } = useDataStore();

  const chartData = useMemo(() => {
    return history.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      cpu: item.system.cpu_percent,
      memory: item.system.mem_percent,
      disk: item.system.disk_percent,
      load: item.system.load_avg_1,
    }));
  }, [history]);

  if (chartData.length < 2) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Resource Usage Over Time
        </h3>
        <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
          Collecting data... Charts will appear shortly.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CPU Chart */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
          CPU Usage (%)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorCpu)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Memory Chart */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
          Memory Usage (%)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                }}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorMem)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Load Average Chart */}
      <div className="card p-4 lg:col-span-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
          System Load & Resources
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                className="text-slate-500"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                }}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="CPU %"
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Memory %"
              />
              <Line
                type="monotone"
                dataKey="disk"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Disk %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
