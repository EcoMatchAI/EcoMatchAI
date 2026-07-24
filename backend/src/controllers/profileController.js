import User from '../models/User.js';

/**
 * @route   GET /api/profile
 * @desc    Get the authenticated user's full profile.
 * @access  Private
 */
export const getProfile = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

/**
 * @route   POST /api/profile/complete
 * @desc    Complete (or fully update) the business profile — this is the
 *          "Complete Your Business Profile" step shown right after signup.
 *          Setting profileCompleted=true unlocks the dashboard.
 * @access  Private
 */
export const completeProfile = async (req, res) => {
  try {
    const user = req.user;

    // A profile can only be completed once. Later edits go through PATCH /api/profile.
    if (user.profileCompleted) {
      return res.status(409).json({
        message: 'Profile is already complete. Edit it from your profile page instead.',
        profileCompleted: true,
      });
    }

    const {
      businessTypes,
      businessDetails,
      generatorInfo,
      upcyclerInfo,
      materials,
      personalDetails,
    } = req.body;

    // --- Business type (at least one required to complete the profile) ---
    if (businessTypes) {
      user.businessTypes.generator = !!businessTypes.generator;
      user.businessTypes.upcycler = !!businessTypes.upcycler;
    }
    if (!user.businessTypes.generator && !user.businessTypes.upcycler) {
      return res.status(400).json({ message: 'Please select at least one business type.' });
    }

    // --- Business details (industry & city required, matching frontend) ---
    if (businessDetails) {
      user.businessDetails = { ...user.businessDetails.toObject(), ...businessDetails };
    }
    if (!user.businessDetails.industry) {
      return res.status(400).json({ message: 'Please select your industry / category.' });
    }
    if (!user.businessDetails.city || !user.businessDetails.city.trim()) {
      return res.status(400).json({ message: 'Please enter your operating city.' });
    }

    // --- Role-specific sections ---
    if (generatorInfo) {
      user.generatorInfo = { ...user.generatorInfo.toObject(), ...generatorInfo };
    }
    if (upcyclerInfo) {
      user.upcyclerInfo = { ...user.upcyclerInfo.toObject(), ...upcyclerInfo };
    }

    // --- Materials ---
    if (Array.isArray(materials)) {
      user.materials = materials.map((m) => ({
        id: m.id,
        name: m.name,
        selection: m.selection ?? 'secondary',
      }));
    }

    // --- Optional personal details ---
    if (personalDetails) {
      user.personalDetails = { ...user.personalDetails.toObject(), ...personalDetails };
    }

    // Mark the profile as complete — this is what the gate middleware checks.
    user.profileCompleted = true;

    await user.save();

    return res.status(200).json({
      message: `Profile saved as ${user.roleLabel}!`,
      user,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0]?.message || 'Invalid profile data.';
      return res.status(400).json({ message: msg });
    }
    console.error('Complete profile error:', error);
    return res.status(500).json({ message: 'Server error while saving profile.' });
  }
};

/**
 * @route   PATCH /api/profile
 * @desc    Partially update profile fields (e.g. ProfilePage personal details
 *          edit). Does not change the profileCompleted flag.
 * @access  Private (and profile must already be complete)
 */
export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const {
      businessTypes,
      businessDetails,
      generatorInfo,
      upcyclerInfo,
      materials,
      personalDetails,
    } = req.body;

    if (businessTypes) {
      if (typeof businessTypes.generator === 'boolean') user.businessTypes.generator = businessTypes.generator;
      if (typeof businessTypes.upcycler === 'boolean') user.businessTypes.upcycler = businessTypes.upcycler;
    }
    if (businessDetails) {
      user.businessDetails = { ...user.businessDetails.toObject(), ...businessDetails };
    }
    if (generatorInfo) {
      user.generatorInfo = { ...user.generatorInfo.toObject(), ...generatorInfo };
    }
    if (upcyclerInfo) {
      user.upcyclerInfo = { ...user.upcyclerInfo.toObject(), ...upcyclerInfo };
    }
    if (Array.isArray(materials)) {
      user.materials = materials.map((m) => ({
        id: m.id,
        name: m.name,
        selection: m.selection ?? 'secondary',
      }));
    }
    if (personalDetails) {
      user.personalDetails = { ...user.personalDetails.toObject(), ...personalDetails };
    }

    await user.save();

    return res.status(200).json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0]?.message || 'Invalid profile data.';
      return res.status(400).json({ message: msg });
    }
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error while updating profile.' });
  }
};
