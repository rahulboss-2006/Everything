const User = require("../models/User");

const WORK_COST = 2;

async function deductCredits(userId) {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      active: true,
      credits: {
        $gte: WORK_COST,
      },
    },
    {
      $inc: {
        credits: -WORK_COST,
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    return {
      success: false,
      message: "Insufficient credits.",
    };
  }

  return {
    success: true,
    credits: user.credits,
  };
}

module.exports = {
  deductCredits,
  WORK_COST,
};