import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { attendanceAPI } from '../api/api';

export const fetchVizAttendance = createAsyncThunk(
  'attendance/fetchVizAttendance',
  async ({ studentId, month, year }, { rejectWithValue }) => {
    try {
      const res = await attendanceAPI.getByStudent(studentId, { month, year });
      const raw = res.data?.data || res.data || [];
      const list = Array.isArray(raw) ? raw : raw.attendance || raw.records || [];

      // Structure map of day: status
      const map = {};
      list.forEach((r) => {
        const d = new Date(r.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          map[d.getDate()] = r.status;
        }
      });
      return map;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load attendance');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    vizDaysMap: {},
    vizLoading: false,
  },
  reducers: {
    clearVizDaysMap: (state) => {
      state.vizDaysMap = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVizAttendance.pending, (state) => {
        state.vizLoading = true;
      })
      .addCase(fetchVizAttendance.fulfilled, (state, action) => {
        state.vizLoading = false;
        state.vizDaysMap = action.payload;
      })
      .addCase(fetchVizAttendance.rejected, (state) => {
        state.vizLoading = false;
        state.vizDaysMap = {};
      });
  },
});

export const { clearVizDaysMap } = attendanceSlice.actions;
export default attendanceSlice.reducer;