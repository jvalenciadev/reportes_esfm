'use client';

import React, { useState, useMemo } from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchFilter?: (row: T, term: string) => boolean;
  defaultPageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  columns,
  searchPlaceholder = 'Buscar en los registros...',
  searchFilter,
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    if (searchFilter) {
      return data.filter((row) => searchFilter(row, term));
    }
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm, searchFilter]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-48 sm:w-64 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value={10}>10 filas</option>
            <option value={25}>25 filas</option>
            <option value={50}>50 filas</option>
          </select>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.width || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-slate-400 font-medium"
                >
                  No se encontraron registros coincidentes
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-4 font-normal ${
                        col.align === 'right'
                          ? 'text-right font-mono font-medium text-slate-900'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 sm:px-5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Mostrando{' '}
          <strong className="text-slate-800">
            {filteredData.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}
          </strong>{' '}
          a{' '}
          <strong className="text-slate-800">
            {Math.min(currentPage * pageSize, filteredData.length)}
          </strong>{' '}
          de <strong className="text-slate-800">{filteredData.length.toLocaleString('es-BO')}</strong> registros
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
          >
            Anterior
          </button>
          <span className="px-2 text-slate-600 font-medium">
            Pág. {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
