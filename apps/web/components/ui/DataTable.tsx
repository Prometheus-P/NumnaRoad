/**
 * DataTable Component
 *
 * MUI DataGrid-based table with sorting and filtering.
 *
 * Task: T102
 */

'use client';

import React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { alpha, useTheme } from '@mui/material/styles';

/**
 * Component props
 */
export interface DataTableProps<T extends { id: string }> {
  columns: GridColDef[];
  rows: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  rowCount?: number;
  paginationMode?: 'client' | 'server';
  sortingMode?: 'client' | 'server';
  autoHeight?: boolean;
  height?: number | string;
}

/**
 * DataTable Component
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  onRowClick,
  pageSize = 10,
  page = 0,
  onPageChange,
  rowCount,
  paginationMode = 'client',
  sortingMode = 'client',
  autoHeight = false,
  height = 500,
}: DataTableProps<T>) {
  const theme = useTheme();

  const handleRowClick = (params: GridRowParams<T>) => {
    onRowClick?.(params.row);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: autoHeight ? 'auto' : height,
        '& .MuiDataGrid-root': {
          border: 'none',
          borderRadius: 3,
          '& .MuiDataGrid-cell:focus': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
          '& .MuiDataGrid-row:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            cursor: onRowClick ? 'pointer' : 'default',
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: '12px 12px 0 0',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
          },
        },
      }}
      data-testid="orders-table"
      role="grid"
      aria-busy={loading}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSizeOptions={[5, 10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: { pageSize, page },
          },
        }}
        onRowClick={onRowClick ? handleRowClick : undefined}
        paginationMode={paginationMode}
        sortingMode={sortingMode}
        rowCount={rowCount}
        onPaginationModelChange={(model) => {
          onPageChange?.(model.page);
        }}
        disableRowSelectionOnClick
        autoHeight={autoHeight}
        sx={{
          '& .MuiDataGrid-cell': {
            py: 1.5,
          },
        }}
        aria-label="Orders data table"
      />
    </Box>
  );
}

export default DataTable;
