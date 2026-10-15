import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const FIXED_STATUS_COLUMN = {
  _id: "fixed-payment-status",
  key: "paymentStatus",
  label: "Payment Status",
  type: "status",
  order: 3,
  isFixed: true,
  editable: true,
  width: 160,
};

const getApi = (token) => axios.create({
  baseURL: "/api/payments",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Async Thunks
export const fetchMasterSheet = createAsyncThunk(
  'payments/fetchMasterSheet',
  async ({ academicYear, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      const response = await api.get("/master", { params: { academicYear } });
      const result = response.data.data;

      const loadedColumns = result.columns || [];
      const hasStatus = loadedColumns.some(col => col.key === "paymentStatus");
      const normalizedColumns = hasStatus ? loadedColumns : [...loadedColumns, FIXED_STATUS_COLUMN];

      const normalizedRows = (result.rows || []).map((row) => ({
        ...row,
        data: { ...(row.data || {}) },
        rowColor: row.rowColor || "none",
      }));

      return {
        sheet: result.sheet,
        columns: normalizedColumns,
        rows: normalizedRows,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load master payment sheet.');
    }
  }
);

export const saveRowBulk = createAsyncThunk(
  'payments/saveRowBulk',
  async ({ rowId, data, rowColor, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      const response = await api.patch(`/rows/${rowId}/bulk`, { data, rowColor });
      return { rowId, data, rowColor };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save row changes.');
    }
  }
);

export const addPaymentColumn = createAsyncThunk(
  'payments/addPaymentColumn',
  async ({ sheetId, label, type, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      await api.post(`/sheets/${sheetId}/columns`, { label, type });
      return { label, type };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add column.');
    }
  }
);

export const deletePaymentColumn = createAsyncThunk(
  'payments/deletePaymentColumn',
  async ({ sheetId, columnId, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      await api.delete(`/sheets/${sheetId}/columns/${columnId}`);
      return columnId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete column.');
    }
  }
);

export const renamePaymentColumn = createAsyncThunk(
  'payments/renamePaymentColumn',
  async ({ sheetId, columnId, label, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      await api.put(`/sheets/${sheetId}/columns/${columnId}`, { label });
      return { columnId, label };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to rename column.');
    }
  }
);

export const resizePaymentColumn = createAsyncThunk(
  'payments/resizePaymentColumn',
  async ({ sheetId, columnId, width, token }, { rejectWithValue }) => {
    try {
      const api = getApi(token);
      await api.put(`/sheets/${sheetId}/columns/${columnId}`, { width });
      return { columnId, width };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to save column width.');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState: {
    sheet: null,
    columns: [],
    rows: [],
    loading: true,
    error: "",
    isSaving: false,
  },
  reducers: {
    setLocalRows: (state, action) => {
      state.rows = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Master Sheet
      .addCase(fetchMasterSheet.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchMasterSheet.fulfilled, (state, action) => {
        state.loading = false;
        state.sheet = action.payload.sheet;
        state.columns = action.payload.columns;
        state.rows = action.payload.rows;
      })
      .addCase(fetchMasterSheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Save Changes Status
      .addCase(saveRowBulk.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveRowBulk.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(saveRowBulk.rejected, (state) => {
        state.isSaving = false;
      });
  },
});

export const { setLocalRows } = paymentSlice.actions;
export default paymentSlice.reducer;