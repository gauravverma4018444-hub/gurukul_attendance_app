import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentAPI } from '../api/api';

// Async Thunks for API Calls
export const fetchClasses = createAsyncThunk('students/fetchClasses', async (_, { rejectWithValue }) => {
  try {
    const res = await studentAPI.getClasses();
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to load classes');
  }
});

export const fetchStudents = createAsyncThunk('students/fetchStudents', async (params, { rejectWithValue }) => {
  try {
    const res = await studentAPI.getAll(params);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to load students');
  }
});

export const deleteStudent = createAsyncThunk('students/deleteStudent', async (id, { rejectWithValue }) => {
  try {
    await studentAPI.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to remove student');
  }
});

export const fetchStudentById = createAsyncThunk('students/fetchStudentById', async (id, { rejectWithValue }) => {
  try {
    const res = await studentAPI.getById(id);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to load student details');
  }
});

const studentSlice = createSlice({
  name: 'students',
  initialState: {
    students: [],
    classes: [],
    selectedStudent: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSelectedStudent: (state) => {
      state.selectedStudent = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Classes
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.classes = action.payload;
      })
      // Fetch Students
      .addCase(fetchStudents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.students = action.payload;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Student
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.students = state.students.filter(student => student._id !== action.payload);
      })
      // Fetch Selected Student Details
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.selectedStudent = action.payload;
      });
  },
});

export const { clearSelectedStudent } = studentSlice.actions;
export default studentSlice.reducer;