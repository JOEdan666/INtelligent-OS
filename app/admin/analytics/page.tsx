import { prisma } from '../../lib/prisma';

async function getVisits() {
  try {
    const visits = await prisma.visit.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to the last 100 visits for performance
    });
    const totalVisits = await prisma.visit.count();
    return { visits, totalVisits };
  } catch (error) {
    // If the table does not exist, return empty data
    return { visits: [], totalVisits: 0 };
  }
}

export default async function AnalyticsPage() {
  const { visits, totalVisits } = await getVisits();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Website Analytics</h1>
          <p className="mt-2 text-slate-600">最近访问数据（最多 100 条）</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
            <span className="text-sm font-medium">Total Visits</span>
            <span className="text-2xl font-bold">{totalVisits}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">User Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                      暂无访问数据
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">{visit.path || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{visit.ip || '-'}</td>
                      <td className="max-w-xl truncate px-4 py-3 text-sm text-slate-600" title={visit.userAgent || ''}>
                        {visit.userAgent || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {new Date(visit.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 10; // Revalidate every 10 seconds
