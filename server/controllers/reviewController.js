import Review from "../models/Review.js";
import Employee from "../models/Employee.js";

const isAdminOrHR = (user) => {
  const roles = Array.isArray(user.role) ? user.role : [user.role];
  return roles.includes("admin") || roles.includes("hr");
};

// Manager (or admin/hr) creates a review cycle entry for a direct report
const createReview = async (req, res) => {
  try {
    const { employeeId, cycle, ratings, overallRating, managerComments } = req.body;
    if (!employeeId || !cycle) {
      return res.status(400).json({ success: false, error: "employeeId and cycle are required" });
    }

    const reviewerEmployee = await Employee.findOne({ userId: req.user._id });
    if (!reviewerEmployee && !isAdminOrHR(req.user)) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }

    if (!isAdminOrHR(req.user)) {
      const targetEmployee = await Employee.findById(employeeId);
      if (!targetEmployee || String(targetEmployee.reportsTo) !== String(reviewerEmployee._id)) {
        return res.status(403).json({ success: false, error: "You can only review your direct reports" });
      }
    }

    const review = new Review({
      employeeId,
      reviewerId: reviewerEmployee?._id || employeeId,
      cycle,
      ratings: ratings || [],
      overallRating,
      managerComments,
      status: "Draft",
    });
    await review.save();

    return res.status(200).json({ success: true, review });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to create review" });
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { ratings, overallRating, managerComments, selfComments, status } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }

    const requesterEmployee = await Employee.findOne({ userId: req.user._id });
    const isReviewer = requesterEmployee && String(review.reviewerId) === String(requesterEmployee._id);
    const isReviewee = requesterEmployee && String(review.employeeId) === String(requesterEmployee._id);
    const privileged = isAdminOrHR(req.user) || isReviewer;

    if (!privileged && !isReviewee) {
      return res.status(403).json({ success: false, error: "Not authorized to update this review" });
    }

    if (privileged) {
      if (ratings !== undefined) review.ratings = ratings;
      if (overallRating !== undefined) review.overallRating = overallRating;
      if (managerComments !== undefined) review.managerComments = managerComments;
      if (status !== undefined) review.status = status;
    }
    if (isReviewee && selfComments !== undefined) {
      review.selfComments = selfComments;
    }
    if (isReviewee && status === "Acknowledged") {
      review.status = "Acknowledged";
    }

    await review.save();
    return res.status(200).json({ success: true, review });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to update review" });
  }
};

// Manager's view: reviews they authored for their direct reports.
// Admins/HR without their own Employee profile fall back to seeing every
// review in the org, since they have no "direct reports" of their own.
const getTeamReviews = async (req, res) => {
  try {
    const reviewerEmployee = await Employee.findOne({ userId: req.user._id });
    if (!reviewerEmployee) {
      if (isAdminOrHR(req.user)) {
        const reviews = await Review.find()
          .populate({ path: "employeeId", populate: { path: "userId", select: "name" } })
          .populate({ path: "reviewerId", populate: { path: "userId", select: "name" } })
          .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, reviews });
      }
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }
    const reviews = await Review.find({ reviewerId: reviewerEmployee._id })
      .populate({ path: "employeeId", populate: { path: "userId", select: "name" } })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch team reviews" });
  }
};

// Employee's own reviews
const getMyReviews = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }
    const reviews = await Review.find({ employeeId: employee._id, status: { $ne: "Draft" } })
      .populate({ path: "reviewerId", populate: { path: "userId", select: "name" } })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
};

// Admin/HR: all reviews across the org
const getAllReviews = async (req, res) => {
  try {
    if (!isAdminOrHR(req.user)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    const reviews = await Review.find()
      .populate({ path: "employeeId", populate: { path: "userId", select: "name" } })
      .populate({ path: "reviewerId", populate: { path: "userId", select: "name" } })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
};

// Reports (Employee list) available to the logged-in manager, for the "create review" picker.
// Admins/HR without their own Employee profile can pick from every employee.
const getMyDirectReports = async (req, res) => {
  try {
    const reviewerEmployee = await Employee.findOne({ userId: req.user._id });
    if (!reviewerEmployee) {
      if (isAdminOrHR(req.user)) {
        const reports = await Employee.find().populate("userId", "name");
        return res.status(200).json({ success: true, reports });
      }
      return res.status(404).json({ success: false, error: "Employee profile not found" });
    }
    const reports = await Employee.find({ reportsTo: reviewerEmployee._id }).populate("userId", "name");
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: "Failed to fetch direct reports" });
  }
};

export { createReview, updateReview, getTeamReviews, getMyReviews, getAllReviews, getMyDirectReports };
