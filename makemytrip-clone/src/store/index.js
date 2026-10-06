import { configureStore, createSlice } from "@reduxjs/toolkit";

const saveusertolocalstorage = (user) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  } catch (e) {
    // storage can be unavailable (private mode); the app still works for this session
  }
};

const initialState = {
  user: null,
  // true once the saved login (if any) has been read from localStorage
  ready: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      saveusertolocalstorage(action.payload);
    },
    clearUser: (state) => {
      state.user = null;
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem("user");
        }
      } catch (e) {}
    },
    markReady: (state) => {
      state.ready = true;
    },
  },
});

export const { setUser, clearUser, markReady } = userSlice.actions;

const store = configureStore({
  reducer: {
    user: userSlice.reducer,
  },
});

export default store;
