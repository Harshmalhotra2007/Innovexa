"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Clock, AlertCircle, PieChart as PieIcon } from "lucide-react";

export interface TrendDataPoint {
  date: string;
  rate?: number;
  total?: number;
  completed?: number;
  [key: string]: unknown;
}

export interface DeptStatPoint {
  name: string;
  lag?: number;
  count?: number;
  value?: number;
  color?: string;
  [key: string]: unknown;
}

interface AnalyticsChartsProps {
  trendData: TrendDataPoint[];
  deptStats: DeptStatPoint[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#49B9AE", "#E8A33D", "#E2666A", "#1D4ED8", "#94A3B8"];

export function AnalyticsCharts({ trendData, deptStats, colors = DEFAULT_COLORS }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Monthly Task Closure Trend (Line Chart) */}
      <div className="ops-panel p-5 space-y-4 bg-[var(--panel)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[var(--text)]">
          <TrendingUp size={14} className="text-[var(--teal)]" />
          <span>Task Closure Rate</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} />
              <YAxis stroke="var(--text-dim)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel-alt)",
                  borderColor: "var(--border-soft)",
                  color: "var(--text)",
                  borderRadius: "6px",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
              <Line
                type="monotone"
                dataKey="tasksCreated"
                name="Created"
                stroke="var(--amber)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="completedTasks"
                name="Completed"
                stroke="var(--teal)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Decision-to-action lag (Bar Chart) */}
      <div className="ops-panel p-5 space-y-4 bg-[var(--panel)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[var(--text)]">
          <Clock size={14} className="text-[var(--amber)]" />
          <span>Decision-to-Action Lag (Days)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="department"
                stroke="var(--text-dim)"
                fontSize={10}
                tickFormatter={(v) => v.split(" ")[0]}
              />
              <YAxis stroke="var(--text-dim)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel-alt)",
                  borderColor: "var(--border-soft)",
                  color: "var(--text)",
                  borderRadius: "6px",
                }}
              />
              <Bar
                dataKey="avgLag"
                name="Avg Lag Days"
                fill="var(--amber)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overdue Trend (Area Chart) */}
      <div className="ops-panel p-5 space-y-4 bg-[var(--panel)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[var(--text)]">
          <AlertCircle size={14} className="text-[var(--red)]" />
          <span>Overdue Task Trend</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} />
              <YAxis stroke="var(--text-dim)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel-alt)",
                  borderColor: "var(--border-soft)",
                  color: "var(--text)",
                  borderRadius: "6px",
                }}
              />
              <Area
                type="monotone"
                dataKey="overdueTasks"
                name="Overdue"
                stroke="var(--red)"
                fill="rgba(226, 102, 106, 0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task Distribution by Dept (Pie Chart) */}
      <div className="ops-panel p-5 space-y-4 bg-[var(--panel)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[var(--text)]">
          <PieIcon size={14} className="text-[var(--teal)]" />
          <span>Task Volume by Department</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptStats}
                dataKey="totalTasks"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({ name, percent }) =>
                  `${name.split(" ")[0]} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {deptStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--panel-alt)",
                  borderColor: "var(--border-soft)",
                  color: "var(--text)",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
