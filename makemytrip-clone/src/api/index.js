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

/** extra: { travelDate, userId, freezeId } */
export const getquote = async (category, itemId, quantity, nights, promo, extra = {}) => {
  const res = await axios.get(`${BACKEND_URL}/pricing/quote`, {
    params: {
      category,
      itemId,
      quantity,
      nights,
      promo: promo || undefined,
      travelDate: extra.travelDate || undefined,
      userId: extra.userId || undefined,
      freezeId: extra.freezeId || undefined,
    },
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
  freezeId,
  expectedTotal,
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
      freezeId: freezeId || undefined,
      expectedTotal: expectedTotal ?? undefined,
    },
  });
  return res.data;
};

/** Cancels a booking (or only `quantity` of its units). Returns { booking, refund, summary }. */
export const cancelbooking = async (userId, reference, reason, note, quantity) => {
  const res = await axios.post(`${BACKEND_URL}/booking/cancel`, null, {
    params: { userId, reference, reason: reason || undefined, note: note || undefined, quantity: quantity || undefined },
  });
  return res.data;
};

/** What a cancellation would refund, and why. */
export const previewCancellation = async (userId, reference, quantity) => {
  const res = await axios.get(`${BACKEND_URL}/booking/cancel/preview`, {
    params: { userId, reference, quantity: quantity || undefined },
  });
  return res.data;
};

export const getCancellationPolicy = async () => {
  const res = await axios.get(`${BACKEND_URL}/cancellation/policy`);
  return res.data;
};

export const getMyRefunds = async (userId) => {
  const res = await axios.get(`${BACKEND_URL}/refunds`, { params: { userId } });
  return res.data;
};

export const getAllRefunds = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/refunds`);
  return res.data;
};

export const getRefundStats = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/refunds/stats`);
  return res.data;
};

export const advanceRefund = async (id) => {
  const res = await axios.post(`${BACKEND_URL}/admin/refunds/${id}/advance`);
  return res.data;
};

// ---------------------------------------------------------------- admin

export const getallusers = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/users`);
  return res.data;
};

/** Deletes a customer and everything that belongs to the account. Administrators cannot be deleted. */
export const deleteuser = async (id) => {
  await axios.delete(`${BACKEND_URL}/admin/user/${id}`);
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

// ---------------------------------------------------------------- dynamic pricing

/** Live prices for the items on screen: { [id]: { price, basePrice, adjustmentPct, trend, tags, adjustments } }. */
export const getliveprices = async (category, ids, date) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/pricing/prices`, {
      params: { category, ids: ids.join(","), date: date || undefined },
    });
    return res.data;
  } catch (error) {
    return {};
  }
};

/** Price history and forecast; null when the item has a fixed price. */
export const getpricehistory = async (category, itemId, date, days = 30) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/pricing/history`, {
      params: { category, itemId, date: date || undefined, days },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const getfreezeoptions = async (category, itemId, quantity, nights, travelDate) => {
  const res = await axios.get(`${BACKEND_URL}/price-freeze/options`, {
    params: { category, itemId, quantity, nights, travelDate: travelDate || undefined },
  });
  return res.data;
};

export const createfreeze = async ({ userId, category, itemId, quantity, nights, travelDate, hours }) => {
  const res = await axios.post(`${BACKEND_URL}/price-freeze`, null, {
    params: { userId, category, itemId, quantity, nights, travelDate: travelDate || undefined, hours },
  });
  return res.data;
};

export const getfreezes = async (userId) => {
  const res = await axios.get(`${BACKEND_URL}/price-freeze`, { params: { userId } });
  return res.data;
};

/** The customer's live freeze for exactly this booking, or null. */
export const getactivefreeze = async (userId, category, itemId, travelDate) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/price-freeze/active`, {
      params: { userId, category, itemId, travelDate: travelDate || undefined },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const getpricingrules = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/pricing-rules`);
  return res.data;
};

export const savepricingrule = async (rule) => {
  if (rule.id) {
    const res = await axios.put(`${BACKEND_URL}/admin/pricing-rules/${rule.id}`, rule);
    return res.data;
  }
  const res = await axios.post(`${BACKEND_URL}/admin/pricing-rules`, rule);
  return res.data;
};

export const deletepricingrule = async (id) => {
  await axios.delete(`${BACKEND_URL}/admin/pricing-rules/${id}`);
};

// ---------------------------------------------------------------- reviews

export const getReviews = async (category, itemId, sort = "helpful", page = 0, userId) => {
  const res = await axios.get(`${BACKEND_URL}/reviews`, {
    params: { category, itemId, sort, page, size: 6, userId: userId || undefined },
  });
  return res.data;
};

export const saveReview = async (review) => {
  const res = await axios.post(`${BACKEND_URL}/reviews`, review);
  return res.data;
};

export const deleteReview = async (userId, id) => {
  await axios.delete(`${BACKEND_URL}/reviews/${id}`, { params: { userId } });
};

export const voteHelpful = async (userId, id) => {
  const res = await axios.post(`${BACKEND_URL}/reviews/${id}/helpful`, null, { params: { userId } });
  return res.data;
};

export const replyToReview = async (userId, id, text) => {
  const res = await axios.post(`${BACKEND_URL}/reviews/${id}/reply`, { text }, { params: { userId } });
  return res.data;
};

export const flagReview = async (userId, id, reason) => {
  const res = await axios.post(`${BACKEND_URL}/reviews/${id}/flag`, null, { params: { userId, reason } });
  return res.data;
};

export const getFlagReasons = async () => {
  const res = await axios.get(`${BACKEND_URL}/reviews/flag-reasons`);
  return res.data;
};

export const getReviewQueue = async (filter = "FLAGGED") => {
  const res = await axios.get(`${BACKEND_URL}/admin/reviews`, { params: { filter } });
  return res.data;
};

export const getReviewStats = async () => {
  const res = await axios.get(`${BACKEND_URL}/admin/reviews/stats`);
  return res.data;
};

export const moderateReview = async (id, action, note) => {
  const res = await axios.post(`${BACKEND_URL}/admin/reviews/${id}/moderate`, null, { params: { action, note: note || undefined } });
  return res.data;
};

// ---------------------------------------------------------------- recommendations

export const getRecommendations = async (userId, limit = 8, category) => {
  const res = await axios.get(`${BACKEND_URL}/recommendations`, {
    params: { userId: userId || undefined, limit, category: category || undefined },
  });
  return res.data;
};

/** verdict is "HELPFUL" or "IRRELEVANT". */
export const sendRecommendationFeedback = async (userId, category, itemId, verdict) => {
  const res = await axios.post(`${BACKEND_URL}/recommendations/feedback`, null, { params: { userId, category, itemId, verdict } });
  return res.data;
};

export const clearRecommendationFeedback = async (userId, category, itemId) => {
  const res = await axios.delete(`${BACKEND_URL}/recommendations/feedback`, { params: { userId, category, itemId } });
  return res.data;
};

/** Tells the server what a customer opened (VIEW) or searched (SEARCH), so suggestions can learn from it. */
export const recordActivity = async (userId, type, { category, itemId, query, source } = {}) => {
  try {
    await axios.post(`${BACKEND_URL}/activity`, null, { params: { userId, type, category, itemId, query, source } });
  } catch (e) {
    // tracking must never get in the way of the page
  }
};

export const getRecommendationStats = async (inspectUserId) => {
  const res = await axios.get(`${BACKEND_URL}/admin/recommendations/stats`, { params: { inspectUserId: inspectUserId || undefined } });
  return res.data;
};
