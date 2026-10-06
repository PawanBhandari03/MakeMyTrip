import axios from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export const login = async (email, password) => {
  try {
    const res = await axios.post(`${BACKEND_URL}/user/login`, null, {
      params: { email, password },
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const signup = async (
  firstName,
  lastName,
  email,
  phoneNumber,
  password
) => {
  try {
    const res = await axios.post(`${BACKEND_URL}/user/signup`, {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
    });
    const data = res.data;
    // console.log(data);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getuserbyemail = async (email) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/user/email`, {
      params: { email },
    });
    const data = res.data;
    return data;
  } catch (error) {
    throw error;
  }
};

export const editprofile = async (
  id,
  firstName,
  lastName,
  email,
  phoneNumber
) => {
  try {
    const res = await axios.post(
      `${BACKEND_URL}/user/edit`,
      { firstName, lastName, email, phoneNumber },
      { params: { id } }
    );
    return res.data;
  } catch (error) {
    throw error;
  }
};
export const getflight = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/flight`);
    const data = res.data;
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const addflight = async (flight) => {
  const res = await axios.post(`${BACKEND_URL}/admin/flight`, flight);
  return res.data;
};

export const editflight = async (id, flight) => {
  const res = await axios.put(`${BACKEND_URL}/admin/flight/${id}`, flight);
  return res.data;
};

export const gethotel = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/hotel`);
    const data = res.data;
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const addhotel = async (hotel) => {
  const res = await axios.post(`${BACKEND_URL}/admin/hotel`, hotel);
  return res.data;
};

export const edithotel = async (id, hotel) => {
  const res = await axios.put(`${BACKEND_URL}/admin/hotel/${id}`, hotel);
  return res.data;
};

export const getflightstatus = async (flightNumber) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/flight-status/${flightNumber}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// ---------------------------------------------------------------- listings, pricing, bookings

export const getflightbyid = async (id) => {
  const res = await axios.get(`${BACKEND_URL}/flight/${id}`);
  return res.data;
};

export const gethotelbyid = async (id) => {
  const res = await axios.get(`${BACKEND_URL}/hotel/${id}`);
  return res.data;
};

/** category: HOMESTAY | HOLIDAY | TRAIN | BUS | CAB | FOREX | INSURANCE (omit for all). */
export const getlistings = async (category) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/listing`, {
      params: category ? { category } : {},
    });
    return res.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getlistingbyid = async (id) => {
  const res = await axios.get(`${BACKEND_URL}/listing/${id}`);
  return res.data;
};

export const getquote = async (category, itemId, quantity, nights, promo) => {
  const res = await axios.get(`${BACKEND_URL}/pricing/quote`, {
    params: { category, itemId, quantity, nights, promo: promo || undefined },
  });
  return res.data;
};

export const getpromos = async (category) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/promos`, {
      params: category ? { category } : {},
    });
    return res.data;
  } catch (error) {
    return [];
  }
};

export const createbooking = async ({
  userId,
  category,
  itemId,
  quantity = 1,
  nights = 1,
  promo,
  travelDate,
}) => {
  const res = await axios.post(`${BACKEND_URL}/booking`, null, {
    params: {
      userId,
      category,
      itemId,
      quantity,
      nights,
      promo: promo || undefined,
      travelDate: travelDate || undefined,
    },
  });
  return res.data;
};

export const cancelbooking = async (userId, reference) => {
  const res = await axios.post(`${BACKEND_URL}/booking/cancel`, null, {
    params: { userId, reference },
  });
  return res.data;
};

// ---------------------------------------------------------------- admin

export const getallusers = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/users`);
  return res.data;
};

export const changeuserrole = async (id, role) => {
  const res = await axios.put(`${BACKEND_URL}/admin/user/${id}/role`, null, {
    params: { role },
  });
  return res.data;
};

export const getadminstats = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/stats`);
  return res.data;
};

export const deleteflight = async (id) => {
  await axios.delete(`${BACKEND_URL}/admin/flight/${id}`);
};

export const deletehotel = async (id) => {
  await axios.delete(`${BACKEND_URL}/admin/hotel/${id}`);
};

export const savelisting = async (listing) => {
  if (listing.id) {
    const res = await axios.put(`${BACKEND_URL}/admin/listing/${listing.id}`, listing);
    return res.data;
  }
  const res = await axios.post(`${BACKEND_URL}/admin/listing`, listing);
  return res.data;
};

export const deletelisting = async (id) => {
  await axios.delete(`${BACKEND_URL}/admin/listing/${id}`);
};

export const loaddummydata = async (reset = false) => {
  const res = await axios.post(`${BACKEND_URL}/admin/seed`, null, {
    params: { reset },
  });
  return res.data;
};

/** The next flights about to depart (used as suggestions on the live status page). */
export const getupcomingflightstatus = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/flight-status/upcoming`);
    return res.data;
  } catch (error) {
    return [];
  }
};

/** Live status of a booked flight, train or bus (null when the category has no live status). */
export const getbookingstatus = async (category, itemId, travelDate) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/status/booking`, {
      params: { category, itemId, travelDate: travelDate || undefined },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

// ---------------------------------------------------------------- flight tracking and notifications

export const getnotifications = async (userId) => {
  const res = await axios.get(`${BACKEND_URL}/notifications`, { params: { userId } });
  return res.data;
};

/** Marks one notification read, or all of them when no id is given. */
export const marknotificationsread = async (userId, id) => {
  await axios.post(`${BACKEND_URL}/notifications/read`, null, {
    params: { userId, id: id || undefined },
  });
};

export const gettrackedflights = async (userId) => {
  const res = await axios.get(`${BACKEND_URL}/tracking`, { params: { userId } });
  return res.data;
};

/** One flight with its timeline, and whether this user follows it (null if the flight is unknown). */
export const gettrackedflight = async (userId, flightNumber) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/tracking/flight`, {
      params: { userId: userId || undefined, flightNumber },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const trackflight = async (userId, flightNumber) => {
  const res = await axios.post(`${BACKEND_URL}/tracking`, null, { params: { userId, flightNumber } });
  return res.data;
};

export const untrackflight = async (userId, flightNumber) => {
  await axios.delete(`${BACKEND_URL}/tracking`, { params: { userId, flightNumber } });
};

/** Mock airline feed: flights about to depart, for the operator console. */
export const getflightoperations = async () => {
  const res = await axios.get(`${BACKEND_URL}/mock-api/flights/board`);
  return res.data;
};

/** Mock airline feed: trigger a delay, gate change, boarding call or cancellation. */
export const operateflight = async (flightNumber, body) => {
  const res = await axios.post(`${BACKEND_URL}/mock-api/flights/${flightNumber}/events`, body);
  return res.data;
};
