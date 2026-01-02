'use client';

import * as React from 'react';
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridSortModel,
  GridEventListener,
} from '@mui/x-data-grid';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';

// Types for DataTable component (from tests/unit/components/DataTable.test.tsx)
export interface Column<T> {
  field: keyof T;
  headerName: string;
  width?: number;
  flex?: number;
  sortable?: boolean;
  filterable?: boolean; // Note: DataGrid has built-in filtering, this is for custom filter UIs
  renderCell?: (params: any) => React.ReactNode; // Using any for DataGrid's params type
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  filterValue?: string; // For global search/filter
  pageSize?: number; // Not directly used by DataGrid props, but useful for state management
  page?: number;
  onPageChange?: (page: number) => void; // DataGrid handles its own pagination state
  paginationMode?: 'client' | 'server';
  rowCount?: number; // For server-side pagination
  getRowId?: (row: T) => string | number;
  noRowsMessage?: string;
  initialState?: any; // For DataGrid initial state
}

/**
 * M3 DataTable Component
 * Displays data in a sortable, filterable, and paginatable table using MUI DataGrid.
 */
export function DataTable<T extends { id: string | number }>({
  columns: customColumns,
  rows,
  loading = false,
  onRowClick,
  sortModel,
  onSortModelChange,
  filterValue, // To be implemented with custom filtering if needed
  page,
  onPageChange,
  paginationMode = 'client',
  rowCount,
  getRowId,
  noRowsMessage = 'No rows found',
  initialState,
}: DataTableProps<T>) {
  // Convert custom Column types to GridColDef
  const columns: GridColDef[] = React.useMemo(
    () =>
      customColumns.map((col) => ({
        field: col.field as string,
        headerName: col.headerName,
        width: col.width,
        flex: col.flex,
        sortable: col.sortable,
        hideable: false, // Prevents column hiding for simplicity
        disableColumnMenu: true, // Hides the column menu
        renderCell: col.renderCell,
      })),
    [customColumns]
  );

  const handleRowClick: GridEventListener<'rowClick'> = React.useCallback(
    (params) => {
      onRowClick?.(params.row);
    },
    [onRowClick]
  );

  return (
    <Box sx={{ height: '100%', width: '100%', minHeight: 400 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId || ((row) => row.id)}
        loading={loading}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        onRowClick={handleRowClick}
        paginationMode={paginationMode}
        rowCount={rowCount}
        paginationModel={page !== undefined ? { page, pageSize: 10 } : undefined}
        onPaginationModelChange={onPageChange ? (model) => onPageChange(model.page) : undefined}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        disableRowSelectionOnClick
        autoHeight // Adjust height to content, useful with flex
        initialState={initialState}
        localeText={{ noRowsLabel: noRowsMessage, noResultsOverlayLabel: noRowsMessage }}
        slots={{
          loadingOverlay: () => <LinearProgress />,
          noRowsOverlay: () => (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {noRowsMessage}
              </Typography>
            </Box>
          ),
        }}
        sx={{
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'background.paper',
          },
          '& .MuiDataGrid-footerContainer': {
            bgcolor: 'background.paper',
          },
          border: 'none', // Remove default border
        }}
      />
    </Box>
  );
}

export default DataTable;