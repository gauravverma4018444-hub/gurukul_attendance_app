import { configureStore } from '@reduxjs/toolkit';
import studentReducer from './studentSlice';
import attendanceReducer from './attendanceSlice';
import paymentReducer from './paymentSlice'; // <-- Import new slice

export const store = configureStore({
  reducer: {
    students: studentReducer,
    attendance: attendanceReducer,
    payments: paymentReducer, // <-- Add to registry
  },
});