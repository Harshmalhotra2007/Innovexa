"use client";

import React from "react";
import { CircleCheck, Clock, AlertCircle, Building2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsChartsProps {
  trendData: any[];
  deptStats: any[];
  colors: string[];
}

export default function AnalyticsCharts({
  trendData,
  deptStats,
  colors,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Task Closure Rate (Line Chart) */}
      <div className="ops-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
          <CircleCheck size={14} className="text-[#00ffff]" />
          <span>Task Closure Rate</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2345" />
              <XAxis dataKey="month" stroke="#8FA0A4" fontSize={10} />
              <YAxis stroke="#8FA0A4" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e36",
                  borderColor: "#3e305e",
                  borderRadius: "6px",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
              <Line
                type="monotone"
                dataKey="tasksCreated"
                name="Created"
                stroke="#9f55ff"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="completedTasks"
                name="Completed"
                stroke="#00ffff"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Decision-to-action lag (Bar Chart) */}
      <div className="ops-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
          <Clock size={14} className="text-[#9f55ff]" />
          <span>Decision-to-Action Lag (Days)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2345" />
              <XAxis
                dataKey="department"
                stroke="#8FA0A4"
                fontSize={10}
                tickFormatter={(v) => v.split(" ")[0]}
              />
              <YAxis stroke="#8FA0A4" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e36",
                  borderColor: "#3e305e",
                  borderRadius: "6px",
                }}
              />
              <Bar
                dataKey="avgLag"
                name="Avg Lag Days"
                fill="#9f55ff"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overdue Trend (Area Chart) */}
      <div className="ops-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
          <AlertCircle size={14} className="text-[#ff007f]" />
          <span>Overdue Task Trend</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2345" />
              <XAxis dataKey="month" stroke="#8FA0A4" fontSize={10} />
              <YAxis stroke="#8FA0A4" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e36",
                  borderColor: "#3e305e",
                  borderRadius: "6px",
                }}
              />
              <Area
                type="monotone"
                dataKey="overdueTasks"
                name="Overdue"
                stroke="#ff007f"
                fill="#ff007f"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Meetings per Department (Pie Chart) */}
      <div className="ops-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-body text-xs font-semibold text-[#E7EEEF]">
          <Building2 size={14} className="text-[#8FA0A4]" />
          <span>Meetings by Department</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptStats}
                dataKey="meetings"
                nameKey="department"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {deptStats.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e1e36",
                  borderColor: "#3e305e",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

