import { Suspense } from 'react';
import { getDashboardData } from '@/services/statsService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const dynamic = 'force-dynamic';

async function DashboardLoader() {
  try {
    const data = await getDashboardData();
    return <DashboardShell initialData={data} />;
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            ⚠
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Error al conectar con Supabase
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            No se pudieron recuperar las estadísticas. Verifique la conexión de red o el proxy corporativo.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-left text-xs font-mono text-red-600 overflow-x-auto">
            {error?.message || String(error)}
          </div>
        </div>
      </div>
    );
  }
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-600">
              Cargando estadísticas de DGFM, INE, SIE y SEIE...
            </span>
          </div>
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}
