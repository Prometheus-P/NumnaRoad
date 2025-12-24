'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  InputAdornment,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DataTable, { Column } from '../../../../components/ui/DataTable';
import { Order as PBOrder } from '../../../../types/pocketbase-types'; // PocketBase Order type
import StatusChip from '../../../../components/ui/StatusChip'; // OrderStatus type for display
import pb from '../../../../lib/pocketbase'; // Actual PocketBase client
import { useRouter } from 'next/navigation';
import SearchIcon from '@mui/icons-material/Search';
import { format, isValid } from 'date-fns';
import OrderDetailDialog from '../../../../components/ui/OrderDetailDialog'; // Import OrderDetailDialog

interface OrderRow {
  id: string;
  customerEmail: string;
  productName: string;
  status: OrderStatus;
  providerUsed?: string;
  createdAt: string;
  completedAt?: string;
}

// Function to transform PocketBase order record to OrderRow for DataTable
function transformPbOrderToOrderRow(pbOrder: PBOrder): OrderRow {
  const productName = pbOrder.expand?.product_id?.name || 'Unknown Product';
  return {
    id: pbOrder.id,
    customerEmail: pbOrder.customer_email,
    productName: productName,
    status: pbOrder.status as OrderStatus,
    providerUsed: pbOrder.provider_used || 'N/A',
    createdAt: new Date(pbOrder.created_at).toLocaleString(),
    completedAt: pbOrder.completed_at ? new Date(pbOrder.completed_at).toLocaleString() : undefined,
  };
}

// Columns for the Orders DataTable
const ordersColumns: Column<OrderRow>[] = [
  { field: 'id', headerName: 'Order ID', width: 150 },
  { field: 'customerEmail', headerName: 'Customer Email', flex: 1, filterable: true },
  { field: 'productName', headerName: 'Product', flex: 1 },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value as OrderStatus} />,
    sortable: true,
  },
  { field: 'providerUsed', headerName: 'Provider', width: 120 },
  { field: 'createdAt', headerName: 'Order Date', width: 180, sortable: true },
  // Add more columns as needed (e.g., actions, total price)
];

const allOrderStatuses: OrderStatus[] = ['pending', 'processing', 'completed', 'failed'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let filterQuery = '';

      if (filterStatus !== 'all') {
        filterQuery += `status = "${filterStatus}"`;
      }

      if (startDate && isValid(startDate)) {
        const isoStartDate = format(startDate, "yyyy-MM-dd HH:mm:ss");
        filterQuery += (filterQuery ? ' && ' : '') + `created >= "${isoStartDate}"`;
      }

      if (endDate && isValid(endDate)) {
        const isoEndDate = format(endDate, "yyyy-MM-dd HH:mm:ss");
        filterQuery += (filterQuery ? ' && ' : '') + `created <= "${isoEndDate}"`;
      }

      if (searchTerm) {
        const searchCondition = `(id ~ "${searchTerm}" || customer_email ~ "${searchTerm}" || expand.product_id.name ~ "${searchTerm}")`;
        filterQuery += (filterQuery ? ' && ' : '') + searchCondition;
      }

      const result = await pb.collection('orders').getFullList<PBOrder>({
        sort: '-created_at',
        expand: 'product_id',
        filter: filterQuery || undefined, // Pass undefined if no filters
      });
      setOrders(result.map(transformPbOrderToOrderRow));
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRowClick = (row: OrderRow) => {
    setSelectedOrderId(row.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setStartDate(null);
    setEndDate(null);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Order List
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
          >
            <MenuItem value="all">All</MenuItem>
            {allOrderStatuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            renderInput={(params) => <TextField {...params} />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => setEndDate(date)}
            renderInput={(params) => <TextField {...params} />}
          />
        </LocalizationProvider>

        <TextField
          label="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button onClick={handleClearFilters} variant="outlined">
          Clear Filters
        </Button>
      </Box>

      <Box sx={{ height: 600, width: '100%', mt: 3 }}>
        <DataTable
          rows={orders}
          columns={ordersColumns}
          onRowClick={handleRowClick}
          noRowsMessage="No orders found."
        />
      </Box>

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={dialogOpen}
        onClose={handleCloseDialog}
      />
    </Box>
  );
}