/**
 * requireProfileComplete — gate for routes that should only be reachable once
 * the user has finished the "Complete Your Business Profile" step.
 *
 * Must run AFTER the `protect` middleware (relies on req.user).
 * Returns 403 with profileCompleted:false so the frontend can redirect the
 * user to the /preferences page.
 */
const requireProfileComplete = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  if (!req.user.profileCompleted) {
    return res.status(403).json({
      message: 'Please complete your business profile to continue.',
      profileCompleted: false,
    });
  }

  next();
};

export default requireProfileComplete;
